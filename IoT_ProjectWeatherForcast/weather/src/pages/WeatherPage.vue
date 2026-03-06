<!-- WeatherPage.vue -->
<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import api from '../utils/api.js'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

// ===========================
// STATE MANAGEMENT
// ===========================

const searchQuery = ref('')
const currentLocation = ref('Unical, Rende, Calabria, Italy')
const currentTime = ref('')
const loading = ref(false)
const error = ref('')
const selectedDevice = ref(null)
const map = ref(null)
const markers = ref({})
const activeLayer = ref('temp') // temp, humid, noise

// Weather data with better defaults
const weatherData = ref({
  temperature: '—',
  feelsLike: '—',
  condition: 'Clear',
  description: 'Fetching current weather conditions...',
  airQuality: '—',
  humidity: '—',
  pressure: '—',
  light: '—',
  noise: '—',
  icon: '🌤️',
  weatherPrediction: '—',
  predictionConfidence: 0
})

const nearbyLocations = ref([])

// Configuration
const availableMeasurements = [
  { measurement: 'Sensor_S6000U_data2', device_id: '' },

]

const REFRESH_INTERVAL = 300000 // 5 minutes
const GEOCODING_DELAY = 1000 // Rate limiting for geocoding API

let refreshTimer = null
let geocodingQueue = []
let geocodingTimeout = null

// ===========================
// UTILITY FUNCTIONS
// ===========================

function updateTime() {
  const now = new Date()
  currentTime.value = now.toLocaleTimeString('en-US', { 
    hour: 'numeric', 
    minute: '2-digit',
    hour12: true 
  })
}

function celsiusToFahrenheit(celsius) {
  return Math.round(celsius * 9/5 + 32)
}

function getWeatherIcon(prediction) {
  if (!prediction || prediction === '—') return '🌤️'
  
  const pred = prediction.toLowerCase()
  if (pred.includes('clear')) return '☀️'
  if (pred.includes('sunny')) return '☀️'
  if (pred.includes('partly cloudy')) return '⛅'
  if (pred.includes('mostly cloudy')) return '☁️'
  if (pred.includes('cloudy')) return '☁️'
  if (pred.includes('overcast')) return '☁️'
  if (pred.includes('rain')) return '🌧️'
  if (pred.includes('storm')) return '⛈️'
  if (pred.includes('snow')) return '❄️'
  if (pred.includes('fog')) return '🌫️'
  
  return '🌤️'
}

function getWeatherCondition(tempF, prediction) {
  // Use prediction if available, otherwise fall back to temperature-based condition
  if (prediction && prediction !== '—') {
    return { 
      condition: prediction, 
      icon: getWeatherIcon(prediction) 
    }
  }
  
  if (tempF > 80) return { condition: 'Hot', icon: '☀️' }
  if (tempF > 65) return { condition: 'Warm', icon: '🌤️' }
  if (tempF > 50) return { condition: 'Mild', icon: '⛅' }
  return { condition: 'Cool', icon: '🌥️' }
}

function estimateAirQuality(noiseLevel) {
  if (noiseLevel < 40) return 45
  if (noiseLevel < 60) return 75
  return 120
}

function getAirQualityLevel(value) {
  if (value === '—') return { text: 'Unknown', color: 'secondary' }
  if (value <= 50) return { text: 'Good', color: 'success' }
  if (value <= 100) return { text: 'Moderate', color: 'warning' }
  if (value <= 150) return { text: 'Unhealthy', color: 'danger' }
  return { text: 'Very Unhealthy', color: 'danger' }
}

const airQualityInfo = computed(() => getAirQualityLevel(weatherData.value.airQuality))

// ===========================
// GEOCODING
// ===========================

async function reverseGeocode(latitude, longitude) {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=16&addressdetails=1`,
      {
        headers: { 'User-Agent': 'WeatherApp/1.0' }
      }
    )
    
    if (!response.ok) throw new Error('Geocoding failed')
    
    const data = await response.json()
    const address = data.address || {}
    
    // Build location name from address components
    const parts = []
    
    if (address.road || address.street) {
      parts.push(address.road || address.street)
    } else if (address.suburb || address.neighbourhood) {
      parts.push(address.suburb || address.neighbourhood)
    }
    
    if (address.city || address.town || address.village) {
      parts.push(address.city || address.town || address.village)
    } else if (address.municipality) {
      parts.push(address.municipality)
    }
    
    if (address.state || address.province) {
      parts.push(address.state || address.province)
    }
    
    return parts.length > 0 
      ? parts.join(', ')
      : `Location (${latitude.toFixed(4)}, ${longitude.toFixed(4)})`
    
  } catch (error) {
    console.error('Geocoding error:', error)
    return `Location (${latitude.toFixed(4)}, ${longitude.toFixed(4)})`
  }
}

// Debounced geocoding to respect API rate limits
function queueGeocode(latitude, longitude) {
  return new Promise((resolve) => {
    geocodingQueue.push({ latitude, longitude, resolve })
    
    if (!geocodingTimeout) {
      processGeocodeQueue()
    }
  })
}

async function processGeocodeQueue() {
  if (geocodingQueue.length === 0) {
    geocodingTimeout = null
    return
  }
  
  const { latitude, longitude, resolve } = geocodingQueue.shift()
  const locationName = await reverseGeocode(latitude, longitude)
  resolve(locationName)
  
  geocodingTimeout = setTimeout(processGeocodeQueue, GEOCODING_DELAY)
}

// ===========================
// MAP MANAGEMENT
// ===========================

function initMap() {
  if (map.value) return
  
  map.value = L.map('map-container', {
    zoomControl: false // We'll add custom controls
  }).setView([39.358, 16.223], 13)
  
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors',
    maxZoom: 19,
    minZoom: 10
  }).addTo(map.value)
}

function createMarkerIcon(device) {
  const isSelected = selectedDevice.value?.device_id === device.device_id
  let bgColor = '#6c757d' // default gray
  
  // Color based on active layer
  if (activeLayer.value === 'temp') {
    bgColor = device.temp > 75 ? '#dc3545' : device.temp > 60 ? '#ffc107' : '#0d6efd'
  } else if (activeLayer.value === 'humid') {
    bgColor = device.humidity > 70 ? '#0dcaf0' : device.humidity > 50 ? '#20c997' : '#ffc107'
  } else if (activeLayer.value === 'noise') {
    bgColor = device.noise > 60 ? '#dc3545' : device.noise > 40 ? '#ffc107' : '#198754'
  }
  
  if (isSelected) bgColor = '#6610f2' // Purple for selected
  
  return L.divIcon({
    className: 'custom-marker',
    html: `
      <div style="
        background: ${bgColor};
        color: white;
        border-radius: 50%;
        width: ${isSelected ? 48 : 40}px;
        height: ${isSelected ? 48 : 40}px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: bold;
        font-size: ${isSelected ? 16 : 14}px;
        border: 3px solid white;
        box-shadow: 0 2px 8px rgba(0,0,0,0.3);
        font-family: 'Times New Roman', serif;
        transition: all 0.3s;
      ">
        ${device.device_id}
      </div>
    `,
    iconSize: [isSelected ? 48 : 40, isSelected ? 48 : 40],
    iconAnchor: [isSelected ? 24 : 20, isSelected ? 24 : 20]
  })
}

function updateMapMarkers() {
  if (!map.value) return
  
  // Clear existing markers
  Object.values(markers.value).forEach(marker => {
    map.value.removeLayer(marker)
  })
  markers.value = {}
  
  // Add markers for all devices
  nearbyLocations.value.forEach(device => {
    if (!device.latitude || !device.longitude) return
    
    const icon = createMarkerIcon(device)
    
    const marker = L.marker([device.latitude, device.longitude], { icon })
      .addTo(map.value)
      .bindPopup(`
        <div style="font-family: 'Times New Roman', serif; min-width: 200px;">
          <div class="mb-2">
            <strong>${device.locationName}</strong><br>
            <small class="text-muted">Device ID: ${device.device_id}</small>
          </div>
          <div class="mb-1">
            🌡️ <strong>${device.temp}°F</strong> (${device.tempC}°C)
          </div>
          <div class="mb-1">
            💧 Humidity: <strong>${device.humidity}%</strong>
          </div>
          <div class="mb-1">
            🔊 Noise: <strong>${device.noise} dB</strong>
          </div>
          <div class="mb-1">
            💡 Light: <strong>${device.light}</strong>
          </div>
          ${device.weatherPrediction ? `
          <div class="mb-1">
            🌤️ Forecast: <strong>${device.weatherPrediction}</strong>
            <br><small class="text-muted">Confidence: ${(device.predictionConfidence * 100).toFixed(1)}%</small>
          </div>
          ` : ''}
          <div class="mt-2 pt-2 border-top">
            <small class="text-muted">📍 ${device.latitude.toFixed(4)}, ${device.longitude.toFixed(4)}</small>
          </div>
        </div>
      `)
    
    marker.on('click', () => selectDevice(device))
    markers.value[device.device_id] = marker
  })
  
  // Fit bounds if we have locations
  if (nearbyLocations.value.length > 0 && !selectedDevice.value) {
    const bounds = L.latLngBounds(
      nearbyLocations.value.map(d => [d.latitude, d.longitude])
    )
    map.value.fitBounds(bounds, { padding: [50, 50] })
  }
}

function zoomIn() {
  if (map.value) map.value.zoomIn()
}

function zoomOut() {
  if (map.value) map.value.zoomOut()
}

function resetView() {
  if (!map.value) return
  
  selectedDevice.value = null
  currentLocation.value = 'Unical, Rende, Calabria, Italy'
  
  if (nearbyLocations.value.length > 0) {
    const bounds = L.latLngBounds(
      nearbyLocations.value.map(d => [d.latitude, d.longitude])
    )
    map.value.fitBounds(bounds, { padding: [50, 50] })
  }
  
  updateMapMarkers()
  fetchWeatherData() // Reset to default measurement
}

// ===========================
// DATA FETCHING
// ===========================

async function fetchDevices() {
  try {
    const devicePromises = availableMeasurements.map(async (device) => {
      try {
        //const res = await fetch(`${API_BASE}/api/weather/forecast/?minutes=60&measurement=${device.measurement}`)
        const data = await api.get(`/api/weather/forecast/?minutes=60&measurement=${device.measurement}`)
        if (!Array.isArray(data) || data.length === 0) return null
        
        // Get the latest reading (last item in array)
        const latest = data[data.length - 1]
        
        // Skip if no timestamp
        if (!latest.time) return null
        
        const locationName = await queueGeocode(latest.latitude, latest.longitude)
        
        return {
          device_id: latest.device_id,
          measurement: device.measurement,
          name: `Robustel Device ${latest.device_id}`,
          locationName,
          temp: celsiusToFahrenheit(latest.temperature),
          tempC: latest.temperature,
          humidity: latest.humidity,
          pressure: latest.pressure,
          latitude: latest.latitude,
          longitude: latest.longitude,
          light: latest.light,
          noise: latest.noise,
          weatherPrediction: latest.weather_prediction || '—',
          predictionConfidence: latest.prediction_confidence || 0,
          lastUpdate: latest.time
        }
      } catch (e) {
        console.error(`Fetch error for ${device.measurement}:`, e)
        return null
      }
    })
    
    const results = await Promise.all(devicePromises)
    nearbyLocations.value = results.filter(device => device !== null)
    
    if (map.value) {
      updateMapMarkers()
    }
  } catch (e) {
    console.error('Device fetch error:', e)
    showError('Failed to load devices')
  }
}

async function fetchWeatherData(measurement = 'Sensor_S6000U_data2') {
  try {
    loading.value = true
    error.value = ''
    
    const data = await api.get(`/api/weather/forecast/?minutes=60&measurement=${measurement}`)

    if (!Array.isArray(data) || data.length === 0) {
      throw new Error('No weather data available')
    }
    
    // Get the latest reading (last item in array)
    const latest = data[data.length - 1]
    
    // Skip if no timestamp
    if (!latest.time) {
      throw new Error('No valid weather data with timestamp')
    }
    
    const tempF = celsiusToFahrenheit(latest.temperature)
    const weatherPrediction = latest.weather_prediction || '—'
    const predictionConfidence = latest.prediction_confidence || 0
    const { condition, icon } = getWeatherCondition(tempF, weatherPrediction)
    
    weatherData.value = {
      temperature: tempF,
      feelsLike: weatherPrediction, // Use weather prediction as "feels like"
      condition,
      icon,
      humidity: latest.humidity,
      pressure: (latest.pressure / 1000).toFixed(2),
      light: latest.light,
      noise: latest.noise,
      airQuality: estimateAirQuality(latest.noise),
      weatherPrediction,
      predictionConfidence,
      description: `${weatherPrediction} with ${(predictionConfidence * 100).toFixed(1)}% confidence. Temperature: ${latest.temperature.toFixed(1)}°C, Humidity: ${latest.humidity}%, Light: ${latest.light}, Noise: ${latest.noise}dB`
    }
  } catch (e) {
    console.error('Weather fetch error:', e)
    showError(e.message || 'Failed to load weather data')
  } finally {
    loading.value = false
  }
}

function showError(message) {
  error.value = message
  setTimeout(() => { error.value = '' }, 5000) // Auto-hide after 5 seconds
}

// ===========================
// USER INTERACTIONS
// ===========================

function searchLocation() {
  const query = searchQuery.value.trim()
  if (!query) return
  
  currentLocation.value = query
  searchQuery.value = ''
  
  // In a real app, you'd geocode the search query to get coordinates
  // and find the nearest device or fetch weather for that location
  showError('Search functionality requires geocoding integration')
}

function selectDevice(device) {
  selectedDevice.value = device
  currentLocation.value = `${device.locationName} (${device.latitude.toFixed(4)}, ${device.longitude.toFixed(4)})`
  
  fetchWeatherData(device.measurement)
  
  if (map.value) {
    map.value.setView([device.latitude, device.longitude], 16, {
      animate: true,
      duration: 1
    })
    
    updateMapMarkers()
    
    // Open popup for selected device
    setTimeout(() => {
      if (markers.value[device.device_id]) {
        markers.value[device.device_id].openPopup()
      }
    }, 500)
  }
}

function setActiveLayer(layer) {
  activeLayer.value = layer
  updateMapMarkers()
}

// ===========================
// WATCHERS
// ===========================

watch(activeLayer, () => {
  updateMapMarkers()
})

// ===========================
// LIFECYCLE HOOKS
// ===========================

onMounted(() => {
  updateTime()
  initMap()
  fetchDevices()
  fetchWeatherData()
  
  // Set up refresh timer
  refreshTimer = setInterval(() => {
    updateTime()
    fetchDevices()
    
    if (selectedDevice.value) {
      fetchWeatherData(selectedDevice.value.measurement)
    } else {
      fetchWeatherData()
    }
  }, REFRESH_INTERVAL)
})

onUnmounted(() => {
  if (refreshTimer) clearInterval(refreshTimer)
  if (geocodingTimeout) clearTimeout(geocodingTimeout)
  if (map.value) {
    map.value.remove()
    map.value = null
  }
})
</script>

<template>
  <div class="min-vh-100 weather-app">
    <!-- Header -->
    <header class="app-header bg-white border-bottom shadow-sm">
      <div class="container-fluid">
        <div class="row align-items-center py-2">
          <div class="col-md-5">
            <div class="input-group">
              <input 
                v-model="searchQuery"
                @keyup.enter="searchLocation"
                type="text" 
                placeholder="Search for location..."
                class="form-control"
                aria-label="Search location"
              />
              <button 
                @click="searchLocation" 
                class="btn btn-outline-secondary"
                aria-label="Search"
              >
                <i class="bi bi-search"></i>
              </button>
            </div>
          </div>
          
          <div class="col-md-5">
            <span class="text-muted">
              {{ currentLocation }} {{ weatherData.icon }} {{ weatherData.temperature }}°
            </span>
          </div>
          
          <div class="col-md-2 text-end">
            <button class="btn btn-link text-secondary" aria-label="More options">
              <i class="bi bi-three-dots-vertical fs-5"></i>
            </button>
          </div>
        </div>
      </div>
    </header>

    <!-- Location Header -->
    <div class="container-fluid py-3">
      <div class="d-flex justify-content-between align-items-center">
        <h1 class="h4 mb-0">
          {{ currentLocation }}
          <i class="bi bi-chevron-down"></i>
        </h1>
        <button 
          class="btn btn-light rounded-circle location-btn"
          aria-label="Current location"
          title="Use current location"
        >
          <i class="bi bi-geo-alt-fill"></i>
        </button>
      </div>
    </div>

    <!-- Main Content -->
    <div class="container-fluid">
      <div class="row g-3">
        <!-- Left Column - Weather Details -->
        <div class="col-lg-9 bg-dark">
          <div class="card shadow-sm">
            <div class="card-body">
              <!-- Header -->
              <div class="d-flex justify-content-between align-items-start mb-4 bg-light p-3 rounded">
                <div>
                  <h2 class="h5 card-title mb-1">Current weather</h2>
                  <small class="text-muted">{{ currentTime }}</small>
                </div>
                <a href="#" class="text-decoration-none" aria-label="Report different weather">
                  <i class="bi bi-chat-dots me-1"></i>
                  <small>Seeing different weather?</small>
                </a>
              </div>
        <!-- Layer Controls -->
              <div class="card shadow-sm mb-3">
                <div class="card-body p-2">
                  <div class="btn-group w-100" role="group" aria-label="Map layer selection">
                    <button 
                      type="button" 
                      :class="['btn', activeLayer === 'temp' ? 'btn-warning' : 'btn-outline-secondary']"
                      @click="setActiveLayer('temp')"
                      title="Temperature layer"
                    >
                      <i class="bi bi-thermometer-half"></i> Temp
                    </button>
                    <button 
                      type="button" 
                      :class="['btn', activeLayer === 'humid' ? 'btn-info' : 'btn-outline-secondary']"
                      @click="setActiveLayer('humid')"
                      title="Humidity layer"
                    >
                      <i class="bi bi-droplet-fill"></i> Humid
                    </button>
                    <button 
                      type="button" 
                      :class="['btn', activeLayer === 'noise' ? 'btn-danger' : 'btn-outline-secondary']"
                      @click="setActiveLayer('noise')"
                      title="Noise layer"
                    >
                      <i class="bi bi-soundwave"></i> Noise
                    </button>
                  </div>
                </div>
              </div>


              <!-- Main Temperature Display -->
              <div class="d-flex align-items-center mb-3 bg-secondary p-4 rounded">
                <span class="display-1 me-3" role="img" :aria-label="weatherData.condition">
                  {{ weatherData.icon }}
                </span>
                <div class="d-flex align-items-baseline">
                  <span class="display-1 fw-light">{{ weatherData.temperature }}°F</span>
                  <div class="ms-3">
                    <p class="h5 mb-1">{{ weatherData.condition }}</p>
                    <p class="text-muted mb-0">
                      {{ weatherData.feelsLike }}
                      <span v-if="weatherData.predictionConfidence > 0" class="ms-2">
                        <small>({{ (weatherData.predictionConfidence * 100).toFixed(1) }}% confidence)</small>
                      </span>
                    </p>
                  </div>
                </div>
              </div>

              <p class="mb-4">{{ weatherData.description }}</p>

              <!-- Weather Details Grid -->
              <div class="border-top pt-3">
                <div class="row g-3">
                  <div class="col-md-4 col-sm-6">
                    <div class="weather-detail">
                      <small class="text-muted mb-1">
                        Air quality <i class="bi bi-info-circle" title="Estimated from noise levels"></i>
                      </small>
                      <div class="d-flex align-items-center">
                        <span 
                          :class="`badge bg-${airQualityInfo.color} rounded-circle me-2`" 
                          style="width: 12px; height: 12px;"
                          :aria-label="`Air quality: ${airQualityInfo.text}`"
                        ></span>
                        <strong>{{ weatherData.airQuality }} - {{ airQualityInfo.text }}</strong>
                      </div>
                    </div>
                  </div>

                  <div class="col-md-4 col-sm-6">
                    <div class="weather-detail">
                      <small class="text-muted mb-1">
                        Light Level <i class="bi bi-info-circle" title="Ambient light measurement"></i>
                      </small>
                      <strong>{{ weatherData.light }}</strong>
                    </div>
                  </div>

                  <div class="col-md-4 col-sm-6">
                    <div class="weather-detail">
                      <small class="text-muted mb-1">
                        Humidity <i class="bi bi-info-circle" title="Relative humidity"></i>
                      </small>
                      <strong>{{ weatherData.humidity }}%</strong>
                    </div>
                  </div>

                  <div class="col-md-4 col-sm-6">
                    <div class="weather-detail">
                      <small class="text-muted mb-1">
                        Noise Level <i class="bi bi-info-circle" title="Ambient noise in decibels"></i>
                      </small>
                      <strong>{{ weatherData.noise }} dB</strong>
                    </div>
                  </div>

                  <div class="col-md-4 col-sm-6">
                    <div class="weather-detail">
                      <small class="text-muted mb-1">
                        Pressure <i class="bi bi-info-circle" title="Atmospheric pressure"></i>
                      </small>
                      <strong>{{ weatherData.pressure }} kPa</strong>
                    </div>
                  </div>

                  <div class="col-md-4 col-sm-6">
                    <div class="weather-detail">
                      <small class="text-muted mb-1">
                        Device <i class="bi bi-info-circle" title="Active sensor device"></i>
                      </small>
                      <strong>{{ selectedDevice?.device_id || ' ' }}</strong>
                    </div>
                  </div>
                  
                  <!-- Weather Prediction Box -->
                  <div class="col-md-12">
                    <div class="card bg-info bg-opacity-10 border-info">
                      <div class="card-body">
                        <div class="d-flex align-items-center">
                          <span class="fs-2 me-3">{{ weatherData.icon }}</span>
                          <div>
                            <small class="text-muted d-block mb-1">
                              <i class="bi bi-cloud-sun"></i> Weather Prediction
                            </small>
                            <h5 class="mb-0">{{ weatherData.weatherPrediction }}</h5>
                            <small class="text-muted">
                              Confidence: {{ (weatherData.predictionConfidence * 100).toFixed(1) }}%
                            </small>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Loading Spinner -->
              <div v-if="loading" class="text-center mt-3">
                <div class="spinner-border spinner-border-sm text-primary" role="status">
                  <span class="visually-hidden">Loading...</span>
                </div>
                <small class="d-block text-muted mt-2">Updating weather data...</small>
              </div>

              <!-- Map Container -->
              <div class="card shadow-sm overflow-hidden mt-4">
                <div class="position-relative">
                  <div id="map-container" style="height: 400px; width: 100%;"></div>
                  
                  <!-- Zoom Controls Overlay -->
                  <div class="position-absolute top-0 end-0 m-2" style="z-index: 1000;">
                    <div class="btn-group-vertical shadow-sm">
                      <button 
                        @click="zoomIn" 
                        class="btn btn-light btn-sm" 
                        title="Zoom In"
                        aria-label="Zoom in"
                      >
                        <i class="bi bi-plus-lg"></i>
                      </button>
                      <button 
                        @click="zoomOut" 
                        class="btn btn-light btn-sm" 
                        title="Zoom Out"
                        aria-label="Zoom out"
                      >
                        <i class="bi bi-dash-lg"></i>
                      </button>
                    </div>
                  </div>
                </div>

                <!-- Map Footer -->
                <div class="bg-dark text-white p-3 d-flex justify-content-between align-items-center">
                  <small>
                    {{ selectedDevice 
                      ? `📍 ${selectedDevice.locationName}` 
                      : 'Select a device to view location' 
                    }}
                  </small>
                  <button 
                    @click="resetView" 
                    class="btn btn-link btn-sm text-info text-decoration-none"
                  >
                    Reset View
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Right Column - Controls & Devices -->
        <div class="col-lg-3">
          <!-- Device List Card -->
          <div class="card shadow-sm mb-3">
            <div class="card-header bg-primary text-white d-flex justify-content-between align-items-center">
              <span><strong>List of Robustel EG 5120 (Edge Gateways)</strong></span>
              <button 
                @click="resetView" 
                class="btn btn-sm btn-light"
                title="Reset map view"
              >
                <i class="bi bi-arrows-fullscreen"></i> Reset
              </button>
            </div>
            <div class="card-body p-2 device-list">
              <div 
                v-for="loc in nearbyLocations" 
                :key="loc.device_id"
                class="card shadow-sm mb-2 device-card"
                :class="{ 'selected': selectedDevice?.device_id === loc.device_id }"
                @click="selectDevice(loc)"
                role="button"
                tabindex="0"
                @keyup.enter="selectDevice(loc)"
                :aria-label="`Device ${loc.device_id} at ${loc.locationName}`"
              >
                <div class="card-body p-2">
                  <div class="d-flex align-items-start">
                    <span class="fs-5 me-2">{{ getWeatherIcon(loc.weatherPrediction) }}</span>
                    <div class="flex-grow-1">
                      <small class="d-block fw-bold">{{ loc.locationName }}</small>
                      <small class="text-primary fw-semibold">{{ loc.temp }}°F</small>
                      <small v-if="loc.weatherPrediction !== '—'" class="d-block text-info">
                        {{ loc.weatherPrediction }}
                      </small>
                      <small class="d-block text-muted location-coords">
                        📍 {{ loc.latitude?.toFixed(4) }}, {{ loc.longitude?.toFixed(4) }}
                      </small>
                      <small class="d-block text-muted device-stats">
                        💧 {{ loc.humidity }}% | 🔊 {{ loc.noise }}dB | ID: {{ loc.device_id }}
                      </small>
                    </div>
                  </div>
                </div>
              </div>
              
              <!-- No devices message -->
              <div v-if="nearbyLocations.length === 0" class="text-center text-muted p-3">
                <div class="spinner-border spinner-border-sm mb-2" role="status">
                  <span class="visually-hidden">Loading...</span>
                </div>
                <small class="d-block">Loading devices...</small>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Error Toast -->
    <div 
      v-if="error" 
      class="position-fixed bottom-0 end-0 p-3" 
      style="z-index: 11"
      role="alert"
      aria-live="assertive"
    >
      <div class="toast show">
        <div class="toast-header bg-danger text-white">
          <i class="bi bi-exclamation-triangle me-2"></i>
          <strong class="me-auto">Error</strong>
          <button 
            type="button" 
            class="btn-close btn-close-white" 
            @click="error = ''" 
            aria-label="Close"
          ></button>
        </div>
        <div class="toast-body">
          {{ error }}
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.weather-app {
  background: linear-gradient(to bottom, #f5e6d3 0%, #e8d5c4 100%);
  font-family: 'Times New Roman', serif;
}

.location-btn {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.location-btn:hover {
  transform: scale(1.1);
  background-color: #e9ecef;
}

.weather-detail {
  display: flex;
  flex-direction: column;
}

.device-list {
  max-height: 500px;
  overflow-y: auto;
}

.device-card {
  cursor: pointer;
  transition: all 0.2s;
  border: 2px solid transparent;
}

.device-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(0,0,0,0.15) !important;
}

.device-card.selected {
  border-color: #0d6efd;
  background-color: #f8f9fa;
}

.location-coords,
.device-stats {
  font-size: 0.65rem;
}

/* Custom scrollbar for device list */
.device-list::-webkit-scrollbar {
  width: 6px;
}

.device-list::-webkit-scrollbar-track {
  background: #f1f1f1;
  border-radius: 3px;
}

.device-list::-webkit-scrollbar-thumb {
  background: #888;
  border-radius: 3px;
}

.device-list::-webkit-scrollbar-thumb:hover {
  background: #555;
}

/* Leaflet customizations */
:deep(.leaflet-popup-content) {
  font-family: 'Times New Roman', serif !important;
  margin: 8px;
}

:deep(.leaflet-popup-content-wrapper) {
  font-family: 'Times New Roman', serif !important;
  border-radius: 8px;
}

:deep(.custom-marker) {
  background: transparent !important;
  border: none !important;
}

:deep(.leaflet-container) {
  font-family: 'Times New Roman', serif;
}

/* Responsive adjustments */
@media (max-width: 768px) {
  .device-list {
    max-height: 300px;
  }
  
  #map-container {
    height: 300px !important;
  }
}

/* Print styles */
@media print {
  .app-header,
  .btn,
  .device-list {
    display: none;
  }
}
</style>