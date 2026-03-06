<!-- S6000Dashboard.vue - Multi-Device Support -->
<script setup>
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue'
import api from '../../utils/api.js'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

/* -----------------------
 * Constants
 * --------------------- */
const SVG_WIDTH = 720
const SVG_HEIGHT = 220
const PADDING = { left: 60, right: 30, top: 20, bottom: 50 }
const INNER_WIDTH = SVG_WIDTH - PADDING.left - PADDING.right
const INNER_HEIGHT = SVG_HEIGHT - PADDING.top - PADDING.bottom
const GAUGE_CIRCUMFERENCE = 2 * Math.PI * 70

const TIME_RANGES = {
  '1h': 60,
  '3h': 180,
  '6h': 360,
  '24h': 1440
}

/* -----------------------
 * State
 * --------------------- */
const selectedDevice = ref('101')
const deviceInput = ref('101')
const deviceNotFound = ref(false)
const availableDevices = ref([])
const timeRange = ref('3h')
const refreshSeconds = ref(30)

const sensorData = ref([])
const loading = ref(false)
const error = ref('')

// Current sensor readings
const currentReadings = ref({
  temperature: 23.2,
  humidity: 49,
  pressure: 1013,
  distance: 50,
  tilt: 10,
  noise: 55,
  gps: { latitude: 39.0742, longitude: 16.3027 }
})

const hoveredPoint = ref(null)
let refreshTimer = null
let map = null
let marker = null
const mapContainer = ref(null)

/* -----------------------
 * Utility Functions
 * --------------------- */
const toNum = (v) => {
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}

const formatTimestamp = (ts) => {
  try {
    return new Date(ts).toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      second: '2-digit'
    })
  } catch {
    return ''
  }
}

const formatShortTime = (ts) => {
  try {
    return new Date(ts).toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit'
    })
  } catch {
    return ''
  }
}

const minutesForRange = (range) => TIME_RANGES[range] || 180

/* -----------------------
 * Chart Coordinate Helpers
 * --------------------- */
const xForIndex = (i, len) => {
  if (len <= 1) return PADDING.left + INNER_WIDTH / 2
  return PADDING.left + (INNER_WIDTH * i) / (len - 1)
}

const yForValue = (v, min, max) => {
  if (v == null) return null
  const range = max - min || 1
  const t = (v - min) / range
  return PADDING.top + (1 - t) * INNER_HEIGHT
}

/* -----------------------
 * Axis Helpers
 * -----------------------*/
const getTimeLabels = computed(() => {
  const len = sensorData.value.length
  if (len === 0) return []
  
  const labels = []
  const step = Math.max(1, Math.floor(len / 6))
  
  for (let i = 0; i < len; i += step) {
    const data = sensorData.value[i]
    labels.push({
      x: xForIndex(i, len),
      text: formatShortTime(data.time)
    })
  }
  
  // Always add last point
  if (len > 1) {
    const lastData = sensorData.value[len - 1]
    labels.push({
      x: xForIndex(len - 1, len),
      text: formatShortTime(lastData.time)
    })
  }
  
  return labels
})

const getYAxisLabels = (min, max, unit = '') => {
  const range = max - min
  const step = range / 5
  const labels = []
  
  for (let i = 0; i <= 5; i++) {
    const value = min + (step * i)
    const y = PADDING.top + INNER_HEIGHT - (INNER_HEIGHT * i / 5)
    labels.push({
      y,
      text: value.toFixed(1) + unit
    })
  }
  
  return labels
}

const temperatureYLabels = computed(() => 
  getYAxisLabels(minTemperature.value, maxTemperature.value, '°C')
)

const humidityYLabels = computed(() => 
  getYAxisLabels(minHumidity.value, maxHumidity.value, '%')
)

const noiseYLabels = computed(() => 
  getYAxisLabels(minNoise.value, maxNoise.value, 'dB')
)

/* -----------------------
 * Leaflet Map Functions
 * -----------------------*/
const initMap = () => {
  if (!mapContainer.value) return
  
  // Destroy existing map if any
  if (map) {
    map.remove()
    map = null
  }
  
  // Create map centered on device location
  map = L.map(mapContainer.value).setView(
    [currentReadings.value.gps.latitude, currentReadings.value.gps.longitude], 
    14
  )
  
  // Add OpenStreetMap tiles
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors',
    maxZoom: 19
  }).addTo(map)
  
  // Add marker
  marker = L.marker([
    currentReadings.value.gps.latitude, 
    currentReadings.value.gps.longitude
  ]).addTo(map)
  
  marker.bindPopup(`
    <b>S6000 Sensor - Device ${selectedDevice.value}</b><br>
    Lat: ${currentReadings.value.gps.latitude.toFixed(6)}<br>
    Lon: ${currentReadings.value.gps.longitude.toFixed(6)}
  `)
}

const updateMapMarker = () => {
  if (!map || !marker) return
  
  const newLatLng = [
    currentReadings.value.gps.latitude, 
    currentReadings.value.gps.longitude
  ]
  
  marker.setLatLng(newLatLng)
  marker.setPopupContent(`
    <b>S6000 Sensor - Device ${selectedDevice.value}</b><br>
    Lat: ${currentReadings.value.gps.latitude.toFixed(6)}<br>
    Lon: ${currentReadings.value.gps.longitude.toFixed(6)}
  `)
  
  map.setView(newLatLng, map.getZoom())
}

/* -----------------------
 * Data Fetching
 * -----------------------*/
const fetchSensorData = async () => {
  loading.value = true
  error.value = ''
  hoveredPoint.value = null
  deviceNotFound.value = false

  try {
    const minutes = minutesForRange(timeRange.value)
    // Fetch all data without device_id filter to get all available devices
   // const url = `${API_BASE}/api/weather/forecast/?minutes=${minutes}`
    console.log('Fetching data for all devices')
    
    const data = await api.get(`/api/weather/forecast/?minutes=${minutes}`)
    console.log('Response status: OK')
    console.log('Data received:', data.length, 'total records')

    if (!Array.isArray(data)) {
      throw new Error('Invalid API response format')
    }

    // Extract unique device IDs from the data
    const uniqueDevices = [...new Set(data.map(d => String(d.device_id ?? 'unknown')))].sort()
    availableDevices.value = uniqueDevices
    console.log('Available devices:', uniqueDevices)

    // Filter data for selected device
    const filteredData = data.filter(d => String(d.device_id) === String(selectedDevice.value))
    console.log('Filtered data for device', selectedDevice.value, ':', filteredData.length, 'records')

    // Check if selected device exists
    if (filteredData.length === 0) {
      console.log('Device not found - no data for device', selectedDevice.value)
      deviceNotFound.value = true
      sensorData.value = []
      loading.value = false
      return
    }

    const normalizedData = filteredData
      .map(d => ({
        time: new Date(d._time || d.time).getTime(),
        temperature: toNum(d.temperature),
        humidity: toNum(d.humidity),
        pressure: toNum(d.pressure),
        noise: toNum(d.noise),
        tof: toNum(d.tof),
        angle: toNum(d.angle),
        vibrAccX: toNum(d.vibrAccX),
        vibrAccY: toNum(d.vibrAccY),
        vibrAccZ: toNum(d.vibrAccZ),
        latitude: toNum(d.latitude),
        longitude: toNum(d.longitude),
        device_id: d.device_id || selectedDevice.value
      }))
      .filter(d => Number.isFinite(d.time))
      .sort((a, b) => a.time - b.time)

    console.log('Device found! Normalized data:', normalizedData.length, 'records')
    sensorData.value = normalizedData
    updateCurrentReadings(normalizedData)
    deviceNotFound.value = false

  } catch (e) {
    console.error('Data fetch error:', e)
    error.value = e.message || 'Failed to load sensor data'
    // Only generate simulated data on network/API errors, not for device not found
    if (!deviceNotFound.value) {
      console.log('Generating simulated data due to error')
      generateSimulatedData()
    }
  } finally {
    loading.value = false
  }
}

const searchDevice = async () => {
  const trimmedInput = deviceInput.value.trim()
  
  if (!trimmedInput) {
    console.log('Empty device input')
    return
  }
  
  console.log('Searching for device:', trimmedInput)
  selectedDevice.value = trimmedInput
  
  await fetchSensorData()
  
  console.log('After fetch - deviceNotFound:', deviceNotFound.value)
  
  // Reinitialize or update map if device was found
  if (!deviceNotFound.value && sensorData.value.length > 0) {
    setTimeout(() => {
      if (map && marker) {
        updateMapMarker()
      } else {
        initMap()
      }
    }, 300)
  }
}

const updateCurrentReadings = (data) => {
  if (data.length === 0) return

  const latest = data[data.length - 1]
  currentReadings.value = {
    temperature: latest.temperature ?? currentReadings.value.temperature,
    humidity: latest.humidity ?? currentReadings.value.humidity,
    pressure: latest.pressure ?? currentReadings.value.pressure,
    distance: latest.tof ?? currentReadings.value.distance,
    tilt: latest.angle ?? currentReadings.value.tilt,
    noise: latest.noise ?? currentReadings.value.noise,
    gps: (latest.latitude && latest.longitude) 
      ? { latitude: latest.latitude, longitude: latest.longitude }
      : currentReadings.value.gps
  }
  
  // Update map marker if GPS coordinates changed
  if (map && marker) {
    updateMapMarker()
  }
}

/* -----------------------
 * Simulated Data (Fallback)
 * -----------------------*/
const generateSimulatedData = () => {
  const now = Date.now()
  const minutes = minutesForRange(timeRange.value)
  const points = Math.min(minutes, 180)
  
  // Generate different baseline values for different devices
  const deviceOffset = parseInt(selectedDevice.value) - 101
  const tempBase = 22 + deviceOffset * 0.5
  const humBase = 47 + deviceOffset * 2
  const noiseBase = 50 + deviceOffset * 3
  
  // Different GPS coordinates for each device
  const gpsOffsets = [
    { lat: 0, lng: 0 },
    { lat: 0.002, lng: 0.003 },
    { lat: -0.001, lng: 0.002 },
    { lat: 0.003, lng: -0.001 },
    { lat: -0.002, lng: -0.002 }
  ]
  const gpsOffset = gpsOffsets[deviceOffset] || gpsOffsets[0]
  
  sensorData.value = Array.from({ length: points }, (_, i) => ({
    time: now - (points - i) * 60000,
    temperature: tempBase + Math.random() * 3 + Math.sin(i / 20) * 2,
    humidity: humBase + Math.random() * 5 + Math.cos(i / 15) * 3,
    pressure: 1010 + Math.random() * 10,
    noise: noiseBase + Math.random() * 12,
    tof: 30 + Math.random() * 100,
    angle: -15 + Math.random() * 30,
    vibrAccX: Math.random() * 2 - 1,
    vibrAccY: Math.random() * 2 - 1,
    vibrAccZ: Math.random() * 2 - 1,
    latitude: 39.0742 + gpsOffset.lat + (Math.random() - 0.5) * 0.001,
    longitude: 16.3027 + gpsOffset.lng + (Math.random() - 0.5) * 0.001,
    device_id: selectedDevice.value
  }))

  updateCurrentReadings(sensorData.value)
}

/* -----------------------
 * Statistical Computations
 * -----------------------*/
const calculateStat = (key, operation) => {
  const values = sensorData.value
    .map(d => d[key])
    .filter(v => v != null)
  
  if (!values.length) return 0
  
  switch (operation) {
    case 'avg':
      return values.reduce((a, b) => a + b, 0) / values.length
    case 'min':
      return Math.min(...values)
    case 'max':
      return Math.max(...values)
    default:
      return 0
  }
}

// Temperature stats
const avgTemperature = computed(() => calculateStat('temperature', 'avg'))
const minTemperature = computed(() => calculateStat('temperature', 'min'))
const maxTemperature = computed(() => calculateStat('temperature', 'max'))

// Humidity stats
const avgHumidity = computed(() => calculateStat('humidity', 'avg'))
const minHumidity = computed(() => calculateStat('humidity', 'min'))
const maxHumidity = computed(() => calculateStat('humidity', 'max'))

// Pressure stats
const avgPressure = computed(() => calculateStat('pressure', 'avg'))

// Noise stats
const avgNoise = computed(() => calculateStat('noise', 'avg'))
const minNoise = computed(() => calculateStat('noise', 'min'))
const maxNoise = computed(() => calculateStat('noise', 'max'))

/* -----------------------
 * Chart Series Builders
 * -----------------------*/
const buildSeries = (key, minValue, maxValue) => {
  const len = sensorData.value.length
  const points = []
  
  for (let i = 0; i < len; i++) {
    const row = sensorData.value[i]
    const value = row?.[key] ?? null
    const x = xForIndex(i, len)
    const y = yForValue(value, minValue, maxValue)
    
    if (y != null) {
      points.push({ x, y, v: value, t: row.time, i })
    }
  }
  
  return points
}

const temperatureSeries = computed(() => 
  buildSeries('temperature', minTemperature.value, maxTemperature.value)
)

const humiditySeries = computed(() => 
  buildSeries('humidity', minHumidity.value, maxHumidity.value)
)

const noiseSeries = computed(() => 
  buildSeries('noise', minNoise.value, maxNoise.value)
)

const polylinePoints = (series) => 
  series.map(p => `${p.x},${p.y}`).join(' ')

const temperatureLinePoints = computed(() => polylinePoints(temperatureSeries.value))
const humidityLinePoints = computed(() => polylinePoints(humiditySeries.value))

/* -----------------------
 * Noise Bar Chart
 * -----------------------*/
const noiseBars = computed(() => {
  const series = noiseSeries.value
  const len = sensorData.value.length || 1
  const spacing = INNER_WIDTH / len
  const barWidth = Math.max(2, Math.min(8, spacing * 0.8))
  const baseY = PADDING.top + INNER_HEIGHT
  const range = maxNoise.value - minNoise.value || 1

  return series.map(p => {
    const normalized = (p.v - minNoise.value) / range
    const height = Math.max(1, normalized * INNER_HEIGHT)
    
    return {
      x: p.x - barWidth / 2,
      y: baseY - height,
      w: barWidth,
      h: height,
      v: p.v,
      t: p.t,
      i: p.i
    }
  })
})

/* -----------------------
 * Gauge Calculations
 * -----------------------*/
const humidityGauge = computed(() => {
  const percent = currentReadings.value.humidity / 100
  const offset = GAUGE_CIRCUMFERENCE * (1 - percent * 0.75)
  
  let color = '#10b981' // green default
  if (currentReadings.value.humidity < 30) color = '#ef4444' // red
  else if (currentReadings.value.humidity > 60) color = '#3b82f6' // blue
  
  return { offset, color }
})

const pressureGauge = computed(() => {
  const percent = (currentReadings.value.pressure - 900) / 200
  const offset = GAUGE_CIRCUMFERENCE * (1 - percent * 0.75)
  
  let color = '#10b981' // green default
  if (currentReadings.value.pressure < 1000) color = '#3b82f6' // blue
  else if (currentReadings.value.pressure > 1020) color = '#ef4444' // red
  
  return { offset, color }
})

/* -----------------------
 * Visual Components
 * -----------------------*/
const temperaturePercent = computed(() => 
  Math.min(100, Math.max(0, (currentReadings.value.temperature / 100) * 100))
)

const s6000Position = computed(() => {
  const maxDistance = 200
  const minPos = 20
  const maxPos = 200
  const normalized = 1 - Math.min(currentReadings.value.distance, maxDistance) / maxDistance
  return minPos + (maxPos - minPos) * normalized
})

/* -----------------------
 * Auto-refresh Timer
 * -----------------------*/
const stopRefreshTimer = () => {
  if (refreshTimer) {
    clearInterval(refreshTimer)
    refreshTimer = null
  }
}

const startRefreshTimer = () => {
  stopRefreshTimer()
  
  if (!refreshSeconds.value || refreshSeconds.value <= 0) return
  
  refreshTimer = setInterval(fetchSensorData, refreshSeconds.value * 1000)
}

/* -----------------------
 * Event Handlers
 * -----------------------*/
const handleMouseOver = (type, value, time) => {
  hoveredPoint.value = { type, v: value, t: time }
}

const handleMouseOut = () => {
  hoveredPoint.value = null
}

/* -----------------------
 * Watchers & Lifecycle
 * -----------------------*/
watch(refreshSeconds, startRefreshTimer)
watch(timeRange, fetchSensorData)

onMounted(() => {
  fetchSensorData()
  startRefreshTimer()
  // Initialize map after a short delay to ensure container is rendered
  setTimeout(initMap, 100)
})

onBeforeUnmount(() => {
  stopRefreshTimer()
  if (map) {
    map.remove()
    map = null
  }
})
</script>

<template>
  <div class="dashboard">
    <!-- Header -->
    <header class="header">
      <div class="header-left">
        <h1 class="header-title">
          <i class="bi bi-cpu"></i>
          S6000 SENSOR DASHBOARD
        </h1>
        <p class="header-subtitle">Real-time IoT sensor monitoring with InfluxDB integration</p>
      </div>
      <div class="header-right">
        <span class="header-pill device-pill">
          <i class="bi bi-hdd-rack"></i> Device {{ selectedDevice }}
        </span>
        <span class="header-pill">
          <i class="bi bi-clock"></i> {{ timeRange }}
        </span>
        <span class="header-pill">
          <i class="bi bi-arrow-repeat"></i> 
          {{ refreshSeconds ? `${refreshSeconds}s` : 'off' }}
        </span>
        <span class="header-pill" :class="{ 'pill-active': !loading }">
          <i :class="loading ? 'bi bi-hourglass-split' : 'bi bi-check-circle-fill'"></i>
          {{ loading ? 'Loading' : 'Live' }}
        </span>
      </div>
    </header>

    <!-- Controls -->
    <section class="panel">
      <div class="controls-grid">
        <div>
          <label class="label">
            <i class="bi bi-hdd-rack"></i> Device ID
          </label>
          <div class="device-search">
            <input
              v-model="deviceInput"
              type="text"
              class="input"
              placeholder="Enter device ID (e.g., 101)"
              @keyup.enter="searchDevice"
            />
            <button 
              class="btn btn-search" 
              @click="searchDevice"
              :disabled="loading || !deviceInput.trim()"
            >
              <i class="bi bi-search"></i>
              Search
            </button>
          </div>
          <div class="help">
            <strong>Available devices:</strong>
            {{ availableDevices.length ? availableDevices.join(', ') : (loading ? 'Loading…' : '—') }}
          </div>
        </div>

        <div>
          <label class="label">
            <i class="bi bi-calendar-range"></i> Time Range
          </label>
          <select v-model="timeRange" class="input">
            <option value="1h">Last 1 Hour</option>
            <option value="3h">Last 3 Hours</option>
            <option value="6h">Last 6 Hours</option>
            <option value="24h">Last 24 Hours</option>
          </select>
        </div>

        <div>
          <label class="label">
            <i class="bi bi-arrow-repeat"></i> Auto Refresh
          </label>
          <select v-model.number="refreshSeconds" class="input">
            <option :value="0">Off</option>
            <option :value="10">Every 10s</option>
            <option :value="30">Every 30s</option>
            <option :value="60">Every 60s</option>
          </select>
        </div>

        <div class="load-wrap">
          <button 
            class="btn btn-primary" 
            @click="fetchSensorData" 
            :disabled="loading"
          >
            <i :class="loading ? 'bi bi-hourglass-split' : 'bi bi-arrow-clockwise'"></i>
            {{ loading ? 'Loading…' : 'Refresh Data' }}
          </button>
        </div>
      </div>

      <div v-if="error && !deviceNotFound" class="error">
        <i class="bi bi-exclamation-triangle"></i>
        <span>{{ error }} (using simulated data for Device {{ selectedDevice }})</span>
      </div>

      <div v-if="deviceNotFound" class="device-not-found">
        <i class="bi bi-x-circle"></i>
        <div>
          <h3>No Device Found</h3>
          <p>Device ID <strong>{{ selectedDevice }}</strong> was not found in the database.</p>
          <p>Please check the device ID and try again.</p>
        </div>
      </div>

      <!-- Debug info - remove in production -->
      <div v-if="false" style="margin-top: 10px; padding: 10px; background: #333; border-radius: 4px; font-size: 11px;">
        <div>deviceNotFound: {{ deviceNotFound }}</div>
        <div>selectedDevice: {{ selectedDevice }}</div>
        <div>sensorData.length: {{ sensorData.length }}</div>
        <div>loading: {{ loading }}</div>
      </div>
    </section>

    <!-- Main Grid -->
    <div v-if="!deviceNotFound" class="main-grid">
      <!-- Thermometer -->
      <section class="panel thermometer-panel">
        <h3 class="chart-title">
          <i class="bi bi-thermometer-half"></i> Temperature
        </h3>
        <div class="thermometer-container">
          <div class="thermometer-scale">
            <span>100°C</span>
            <span>50°C</span>
            <span>0°C</span>
          </div>
          <div class="thermometer-tube">
            <div 
              class="thermometer-fill" 
              :style="{ height: temperaturePercent + '%' }"
            ></div>
          </div>
          <div class="thermometer-bulb"></div>
        </div>
        <div class="temp-display">{{ currentReadings.temperature.toFixed(1) }}°C</div>
      </section>

      <!-- Temperature & Humidity Chart -->
      <section class="panel chart-panel">
        <h3 class="chart-title">
          <i class="bi bi-graph-up"></i> Temperature & Humidity
        </h3>
        <div class="chart-wrap">
          <svg :viewBox="`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`">
            <!-- Grid Lines -->
            <g style="opacity: 0.08">
              <line 
                v-for="i in 8" 
                :key="`grid-h-${i}`" 
                :x1="PADDING.left" 
                :y1="PADDING.top + (INNER_HEIGHT / 8) * i" 
                :x2="PADDING.left + INNER_WIDTH" 
                :y2="PADDING.top + (INNER_HEIGHT / 8) * i" 
                stroke="white" 
                stroke-width="1"
              />
            </g>

            <!-- Axes -->
            <line 
              :x1="PADDING.left" 
              :y1="PADDING.top" 
              :x2="PADDING.left" 
              :y2="PADDING.top + INNER_HEIGHT" 
              stroke="#4a5568" 
              stroke-width="2"
            />
            <line 
              :x1="PADDING.left" 
              :y1="PADDING.top + INNER_HEIGHT" 
              :x2="PADDING.left + INNER_WIDTH" 
              :y2="PADDING.top + INNER_HEIGHT" 
              stroke="#4a5568" 
              stroke-width="2"
            />

            <!-- Y-axis labels (Temperature - left side) -->
            <g>
              <text
                v-for="(label, i) in temperatureYLabels"
                :key="`temp-y-${i}`"
                :x="PADDING.left - 10"
                :y="label.y"
                text-anchor="end"
                alignment-baseline="middle"
                fill="#ff9b3d"
                font-size="10"
                font-weight="600"
              >
                {{ label.text }}
              </text>
            </g>

            <!-- Y-axis labels (Humidity - right side) -->
            <g>
              <text
                v-for="(label, i) in humidityYLabels"
                :key="`hum-y-${i}`"
                :x="PADDING.left + INNER_WIDTH + 10"
                :y="label.y"
                text-anchor="start"
                alignment-baseline="middle"
                fill="#3d9fff"
                font-size="10"
                font-weight="600"
              >
                {{ label.text }}
              </text>
            </g>

            <!-- X-axis labels (Time) -->
            <g>
              <text
                v-for="(label, i) in getTimeLabels"
                :key="`time-${i}`"
                :x="label.x"
                :y="PADDING.top + INNER_HEIGHT + 20"
                text-anchor="middle"
                fill="#94a3b8"
                font-size="9"
                font-weight="600"
              >
                {{ label.text }}
              </text>
            </g>

            <!-- Temperature Line -->
            <polyline
              v-if="temperatureSeries.length"
              :points="temperatureLinePoints"
              fill="none"
              stroke="#ff9b3d"
              stroke-width="0.5"
              style="filter: drop-shadow(0 0 0.5px rgba(255, 155, 61, 0.5))"
            />

            <!-- Humidity Line -->
            <polyline
              v-if="humiditySeries.length"
              :points="humidityLinePoints"
              fill="none"
              stroke="#3d9fff"
              stroke-width="0.5"
              style="filter: drop-shadow(0 0 0.5px rgba(61, 159, 255, 0.5))"
            />

            <!-- Temperature Points -->
            <circle
              v-for="p in temperatureSeries"
              :key="`temp-${p.i}`"
              :cx="p.x"
              :cy="p.y"
              r="3"
              fill="#ff9b3d"
              class="chart-point"
              @mouseover="handleMouseOver('temp', p.v, p.t)"
              @mouseout="handleMouseOut"
            >
              <title>{{ p.v?.toFixed(1) }}°C</title>
            </circle>

            <!-- Humidity Points -->
            <circle
              v-for="p in humiditySeries"
              :key="`hum-${p.i}`"
              :cx="p.x"
              :cy="p.y"
              r="3"
              fill="#3d9fff"
              class="chart-point"
              @mouseover="handleMouseOver('hum', p.v, p.t)"
              @mouseout="handleMouseOut"
            >
              <title>{{ p.v?.toFixed(1) }}%</title>
            </circle>

            <!-- Y-axis label text -->
            <text
              :x="PADDING.left - 45"
              :y="PADDING.top + INNER_HEIGHT / 2"
              text-anchor="middle"
              fill="#ff9b3d"
              font-size="11"
              font-weight="700"
              transform="rotate(-90, 15, 120)"
            >
              Temperature (°C)
            </text>

            <text
              :x="PADDING.left + INNER_WIDTH + 45"
              :y="PADDING.top + INNER_HEIGHT / 2"
              text-anchor="middle"
              fill="#3d9fff"
              font-size="11"
              font-weight="700"
              transform="rotate(90, 705, 120)"
            >
              Humidity (%)
            </text>

            <!-- X-axis label -->
            <text
              :x="PADDING.left + INNER_WIDTH / 2"
              :y="PADDING.top + INNER_HEIGHT + 40"
              text-anchor="middle"
              fill="#94a3b8"
              font-size="11"
              font-weight="700"
            >
              Time
            </text>
          </svg>

          <div v-if="hoveredPoint" class="tooltip" :class="`tooltip-${hoveredPoint.type}`">
            {{ hoveredPoint.v?.toFixed(1) }}{{ hoveredPoint.type === 'temp' ? '°C' : '%' }}
            <div class="tooltip-sub">{{ formatTimestamp(hoveredPoint.t) }}</div>
          </div>
        </div>
        <div class="legend">
          <span class="legend-item">
            <span class="legend-dot temp"></span> Temperature
          </span>
          <span class="legend-item">
            <span class="legend-dot hum"></span> Humidity
          </span>
        </div>
      </section>

      <!-- Humidity Gauge -->
      <section class="panel gauge-panel-humidity">
        <h3 class="chart-title">
          <i class="bi bi-droplet-half"></i> Humidity
        </h3>
        <div class="gauge-container">
          <svg class="gauge-svg" width="160" height="160" viewBox="0 0 160 160">
            <circle 
              cx="80" 
              cy="80" 
              r="70" 
              fill="none" 
              stroke="rgba(255,255,255,0.1)" 
              stroke-width="12"
            />
            <circle 
              cx="80" 
              cy="80" 
              r="70" 
              fill="none" 
              :stroke="humidityGauge.color" 
              stroke-width="12"
              :stroke-dasharray="GAUGE_CIRCUMFERENCE"
              :stroke-dashoffset="humidityGauge.offset"
              stroke-linecap="round"
              class="gauge-fill"
            />
          </svg>
          <div class="gauge-value">{{ currentReadings.humidity.toFixed(0) }}%</div>
        </div>
      </section>

      <!-- Sound Level Chart -->
      <section class="panel chart-panel-wide">
        <h3 class="chart-title">
          <i class="bi bi-soundwave"></i> Sound Level
        </h3>
        <div class="chart-wrap-noise">
          <svg :viewBox="`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`">
            <!-- Grid Lines -->
            <g style="opacity: 0.08">
              <line 
                v-for="i in 8" 
                :key="`noise-grid-${i}`" 
                :x1="PADDING.left" 
                :y1="PADDING.top + (INNER_HEIGHT / 8) * i" 
                :x2="PADDING.left + INNER_WIDTH" 
                :y2="PADDING.top + (INNER_HEIGHT / 8) * i" 
                stroke="white" 
                stroke-width="1"
              />
            </g>

            <!-- Axes -->
            <line 
              :x1="PADDING.left" 
              :y1="PADDING.top" 
              :x2="PADDING.left" 
              :y2="PADDING.top + INNER_HEIGHT" 
              stroke="#4a5568" 
              stroke-width="2"
            />
            <line 
              :x1="PADDING.left" 
              :y1="PADDING.top + INNER_HEIGHT" 
              :x2="PADDING.left + INNER_WIDTH" 
              :y2="PADDING.top + INNER_HEIGHT" 
              stroke="#4a5568" 
              stroke-width="2"
            />

            <!-- Y-axis labels (Noise - left side) -->
            <g>
              <text
                v-for="(label, i) in noiseYLabels"
                :key="`noise-y-${i}`"
                :x="PADDING.left - 10"
                :y="label.y"
                text-anchor="end"
                alignment-baseline="middle"
                fill="#22c55e"
                font-size="10"
                font-weight="600"
              >
                {{ label.text }}
              </text>
            </g>

            <!-- X-axis labels (Time) -->
            <g>
              <text
                v-for="(label, i) in getTimeLabels"
                :key="`noise-time-${i}`"
                :x="label.x"
                :y="PADDING.top + INNER_HEIGHT + 20"
                text-anchor="middle"
                fill="#94a3b8"
                font-size="9"
                font-weight="600"
              >
                {{ label.text }}
              </text>
            </g>

            <!-- Noise Bars -->
            <rect
              v-for="b in noiseBars"
              :key="`noise-${b.i}`"
              :x="b.x"
              :y="b.y"
              :width="b.w"
              :height="b.h"
              rx="1"
              :fill="`hsl(${120 - ((b.v - minNoise) / (maxNoise - minNoise)) * 60}, 70%, 50%)`"
              class="noise-bar"
              @mouseover="handleMouseOver('noise', b.v, b.t)"
              @mouseout="handleMouseOut"
            >
              <title>{{ b.v?.toFixed(1) }} dB</title>
            </rect>

            <!-- Y-axis label text -->
            <text
              :x="PADDING.left - 45"
              :y="PADDING.top + INNER_HEIGHT / 2"
              text-anchor="middle"
              fill="#22c55e"
              font-size="11"
              font-weight="700"
              transform="rotate(-90, 15, 120)"
            >
              Sound Level (dB)
            </text>

            <!-- X-axis label -->
            <text
              :x="PADDING.left + INNER_WIDTH / 2"
              :y="PADDING.top + INNER_HEIGHT + 40"
              text-anchor="middle"
              fill="#94a3b8"
              font-size="11"
              font-weight="700"
            >
              Time
            </text>
          </svg>

          <div v-if="hoveredPoint?.type === 'noise'" class="tooltip tooltip-noise">
            {{ hoveredPoint.v?.toFixed(1) }} dB
            <div class="tooltip-sub">{{ formatTimestamp(hoveredPoint.t) }}</div>
          </div>
        </div>
      </section>

      <!-- Tilt Visualization -->
      <section class="panel svg-panel">
        <h3 class="chart-title">
          <i class="bi bi-phone-landscape"></i> Tilt
        </h3>
        <div class="svg-display">
          <div class="tilt-viz">
            <div class="tilt-label">{{ currentReadings.tilt.toFixed(1) }}°</div>
            <div 
              class="tilt-indicator" 
              :style="{ transform: `rotate(${currentReadings.tilt}deg)` }"
            ></div>
            <div 
              class="tilt-device"
              :style="{ transform: `translateX(-50%) rotate(${currentReadings.tilt}deg)` }"
            >
              S6000
            </div>
            <div class="tilt-surface"></div>
          </div>
        </div>
      </section>

      <!-- Distance Visualization -->
      <section class="panel svg-panel">
        <h3 class="chart-title">
          <i class="bi bi-rulers"></i> Distance
        </h3>
        <div class="svg-display">
          <div class="distance-viz">
            <div 
              class="s6000-box" 
              :style="{ left: `${s6000Position}px` }"
            >
              S6000
            </div>
            <div class="obstacle"></div>
            <div 
              class="distance-line" 
              :style="{ 
                left: `${s6000Position + 70}px`,
                width: `${220 - s6000Position}px`
              }"
            ></div>
            <div class="distance-label">{{ currentReadings.distance.toFixed(0) }}cm</div>
          </div>
        </div>
      </section>

      <!-- Pressure Gauge -->
      <section class="panel gauge-panel">
        <h3 class="chart-title">
          <i class="bi bi-speedometer2"></i> Pressure
        </h3>
        <div class="gauge-container">
          <svg class="gauge-svg" width="160" height="160" viewBox="0 0 160 160">
            <circle 
              cx="80" 
              cy="80" 
              r="70" 
              fill="none" 
              stroke="rgba(255,255,255,0.1)" 
              stroke-width="12"
            />
            <circle 
              cx="80" 
              cy="80" 
              r="70" 
              fill="none" 
              :stroke="pressureGauge.color" 
              stroke-width="12"
              :stroke-dasharray="GAUGE_CIRCUMFERENCE"
              :stroke-dashoffset="pressureGauge.offset"
              stroke-linecap="round"
              class="gauge-fill"
            />
          </svg>
          <div class="gauge-value" style="font-size: 20px;">
            {{ currentReadings.pressure.toFixed(0) /1000 }}
            <span style="font-size: 12px; color: var(--muted);"> kPa</span>
          </div>
        </div>
      </section>

      <!-- GPS Map with Leaflet -->
      <section class="panel map-panel">
        <h3 class="chart-title">
          <i class="bi bi-geo-alt"></i> GPS Location
        </h3>
        <div class="map-container">
          <div ref="mapContainer" class="leaflet-map"></div>
          <div class="map-coords">
            {{ currentReadings.gps.latitude.toFixed(6) }}°N, 
            {{ currentReadings.gps.longitude.toFixed(6) }}°E
          </div>
        </div>
      </section>
    </div>

    <!-- Statistics Footer -->
    <footer v-if="!deviceNotFound" class="stats-grid">
      <div class="stat stat-temp">
        <div class="stat-label">
          <i class="bi bi-thermometer-half"></i> Temperature
        </div>
        <div class="stat-value">{{ avgTemperature.toFixed(1) }}°C</div>
        <div class="stat-sub">
          Min: {{ minTemperature.toFixed(1) }}°C · Max: {{ maxTemperature.toFixed(1) }}°C
        </div>
      </div>

      <div class="stat stat-hum">
        <div class="stat-label">
          <i class="bi bi-droplet-half"></i> Humidity
        </div>
        <div class="stat-value">{{ avgHumidity.toFixed(1) }}%</div>
        <div class="stat-sub">
          Min: {{ minHumidity.toFixed(1) }}% · Max: {{ maxHumidity.toFixed(1) }}%
        </div>
      </div>

      <div class="stat stat-pres">
        <div class="stat-label">
          <i class="bi bi-speedometer2"></i> Pressure
        </div>
        <div class="stat-value">{{ avgPressure.toFixed(1) /1000 }} kPa</div>
        <div class="stat-sub">Average over {{ timeRange }}</div>
      </div>

      <div class="stat stat-count">
        <div class="stat-label">
          <i class="bi bi-graph-up"></i> Data Points
        </div>
        <div class="stat-value">{{ sensorData.length }}</div>
        <div class="stat-sub">Range: {{ timeRange }} · Device: {{ selectedDevice }}</div>
      </div>
    </footer>
  </div>
</template>

<style scoped>
.dashboard {
  --bg: #0b0f14;
  --panel: #111827;
  --panel-2: #0b1118;
  --panel-border: #1f2937;
  --text: #e5e7eb;
  --muted: #94a3b8;
  --accent: #60a5fa;
  --accent-2: #22c55e;
  background:
    radial-gradient(1200px 600px at 20% -10%, rgba(29, 78, 216, 0.15), transparent 60%),
    radial-gradient(900px 500px at 90% 10%, rgba(14, 165, 233, 0.12), transparent 55%),
    var(--bg);
  min-height: 100vh;
  padding: 20px;
  font-family: "Space Grotesk", "IBM Plex Sans", "Segoe UI", sans-serif;
  color: var(--text);
}

.header {
  background: rgba(17, 24, 39, 0.8);
  padding: 16px 18px;
  border-radius: 6px;
  margin-bottom: 16px;
  border: 1px solid var(--panel-border);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  backdrop-filter: blur(8px);
}

.header-left {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.header-title {
  color: var(--text);
  margin: 0;
  font-size: 20px;
  font-weight: 800;
  letter-spacing: 0.3px;
  display: flex;
  align-items: center;
  gap: 10px;
}

.header-subtitle {
  color: var(--muted);
  margin: 0;
  font-size: 12px;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 8px;
}

.header-pill {
  background: #0f172a;
  border: 1px solid var(--panel-border);
  color: var(--muted);
  padding: 6px 10px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 700;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  text-transform: uppercase;
  letter-spacing: 0.4px;
  transition: all 0.3s ease;
}

.device-pill {
  border-color: var(--accent);
  color: var(--accent);
  background: rgba(96, 165, 250, 0.1);
}

.pill-active {
  border-color: var(--accent-2);
  color: var(--accent-2);
}

.panel {
  background: var(--panel);
  padding: 16px;
  border-radius: 6px;
  border: 1px solid var(--panel-border);
  box-shadow: 0 10px 24px rgba(0,0,0,0.2);
  margin-bottom: 16px;
  transition: box-shadow 0.3s ease;
}

.panel:hover {
  box-shadow: 0 14px 32px rgba(0,0,0,0.3);
}

.controls-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 15px;
}

.device-search {
  display: flex;
  gap: 8px;
}

.device-search .input {
  flex: 1;
}

.help {
  margin-top: 8px;
  color: #94a3b8;
  font-size: 11px;
  line-height: 1.4;
}

.help strong {
  color: #cbd5e0;
  font-weight: 700;
}

.btn-search {
  background: var(--accent);
  color: white;
  border-color: var(--accent);
  padding: 8px 16px;
  white-space: nowrap;
}

.btn-search:hover:not(:disabled) {
  background: #4a8fd8;
  box-shadow: 0 0 14px rgba(96, 165, 250, 0.4);
}

.device-not-found {
  margin-top: 12px;
  padding: 24px;
  background: rgba(127, 29, 29, 0.3);
  border: 2px solid #dc2626;
  border-radius: 8px;
  color: #fecaca;
  display: flex;
  align-items: flex-start;
  gap: 16px;
  font-size: 14px;
  animation: slideDown 0.3s ease-out;
}

@keyframes slideDown {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.device-not-found i {
  font-size: 40px;
  color: #ef4444;
  flex-shrink: 0;
  animation: pulse 2s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.6;
  }
}

.device-not-found h3 {
  margin: 0 0 12px 0;
  color: #fca5a5;
  font-size: 20px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.device-not-found p {
  margin: 6px 0;
  line-height: 1.6;
  font-size: 14px;
}

.device-not-found strong {
  color: white;
  font-weight: 800;
  background: rgba(255, 255, 255, 0.1);
  padding: 2px 6px;
  border-radius: 3px;
}

.label {
  color: var(--muted);
  font-weight: 700;
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 6px;
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.4px;
}

.input {
  width: 100%;
  padding: 8px 10px;
  background: #0f172a;
  color: var(--text);
  border: 1px solid var(--panel-border);
  border-radius: 4px;
  font-size: 13px;
  outline: none;
  transition: border-color 0.2s ease;
}

.input:focus {
  border-color: var(--accent);
}

.load-wrap {
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
}

.btn {
  padding: 8px 14px;
  border: 1px solid var(--panel-border);
  border-radius: 4px;
  font-weight: 700;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  transition: all 0.15s ease;
  text-transform: uppercase;
  font-size: 12px;
  letter-spacing: 0.4px;
  background: #0f172a;
  color: var(--text);
}

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-primary {
  background: #0f172a;
  color: var(--text);
  border-color: var(--accent);
}

.btn-primary:hover:not(:disabled) {
  background: #0b1220;
  box-shadow: 0 0 14px rgba(96, 165, 250, 0.25);
  transform: translateY(-1px);
}

.error {
  margin-top: 12px;
  padding: 10px 12px;
  background: #3f1d22;
  border: 1px solid #7f1d1d;
  border-radius: 6px;
  color: #fecaca;
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
}

.main-grid {
  display: grid;
  grid-template-columns: repeat(24, 1fr);
  gap: 16px;
  margin-bottom: 20px;
}

.thermometer-panel {
  grid-column: span 2;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.chart-panel {
  grid-column: span 18;
}

.gauge-panel {
  grid-column: span 8;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.gauge-panel-humidity {
  grid-column: span 4;
  display: flex;
  flex-direction: column;
  align-items: center;
  
}

.chart-panel-wide {
  grid-column: span 24;
}

.svg-panel {
  grid-column: span 8;
}

.map-panel {
  grid-column: span 24;
}

.chart-title {
  color: var(--text);
  margin: 0 0 12px 0;
  font-size: 12px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.4px;
  display: flex;
  align-items: center;
  gap: 8px;
}

/* Thermometer */
.thermometer-container {
  position: relative;
  width: 60px;
  height: 180px;
  margin: 10px 0;
}

.thermometer-scale {
  position: absolute;
  left: -40px;
  top: 0;
  height: 140px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  font-size: 10px;
  color: var(--muted);
}

.thermometer-tube {
  width: 18px;
  height: 140px;
  background: rgba(255, 255, 255, 0.05);
  border: 2px solid var(--panel-border);
  border-radius: 10px;
  position: relative;
  overflow: hidden;
  margin: 0 auto;
}

.thermometer-fill {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  background: linear-gradient(to top, #ef4444, #ff9b3d);
  transition: height 1s cubic-bezier(0.4, 0, 0.2, 1);
  border-radius: 0 0 8px 8px;
}

.thermometer-bulb {
  width: 26px;
  height: 26px;
  background: radial-gradient(circle, #ef4444, #cc0000);
  border-radius: 50%;
  margin: 8px auto 0;
  border: 2px solid var(--panel-border);
  position: relative;
}

.thermometer-bulb::after {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 10px;
  height: 10px;
  background: rgba(255, 255, 255, 0.3);
  border-radius: 50%;
}

.temp-display {
  font-size: 18px;
  font-weight: 700;
  color: #ff9b3d;
  margin-top: 10px;
  text-align: center;
}

/* Charts */
.chart-wrap {
  height: 360px;
  background: var(--panel-2);
  border: 1px solid var(--panel-border);
  border-radius: 6px;
  overflow: hidden;
  position: relative;
}
.chart-wrap-noise {
  height: 460px;
  background: var(--panel-2);
  border: 0.5px solid var(--panel-border);
  border-radius: 6px;
  overflow: hidden;
  position: relative;
}

.chart-point {
  opacity: 0.5;
  cursor: pointer;
  transition: opacity 0.2s ease;
}

.chart-point:hover {
  opacity: 1;
}

.noise-bar {
  opacity: 0.85;
  cursor: pointer;
  transition: opacity 0.2s ease;
}

.noise-bar:hover {
  opacity: 1;
}

.tooltip {
  position: absolute;
  bottom: 12px;
  left: 12px;
  background: rgba(10, 15, 20, 0.92);
  padding: 8px 12px;
  border-radius: 6px;
  font-weight: 800;
  border: 1px solid var(--panel-border);
  font-size: 14px;
  pointer-events: none;
}

.tooltip-sub {
  font-size: 10px;
  opacity: 0.8;
  margin-top: 4px;
  font-weight: 600;
}

.tooltip-temp { 
  color: #ff9b3d; 
  border-color: rgba(255, 155, 61, 0.7); 
}

.tooltip-hum { 
  color: #3d9fff; 
  border-color: rgba(61, 159, 255, 0.7); 
}

.tooltip-noise { 
  color: #22c55e; 
  border-color: rgba(34, 197, 94, 0.7); 
}

.legend {
  display: flex;
  gap: 16px;
  justify-content: center;
  margin-top: 10px;
  font-size: 11px;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 6px;
  color: var(--muted);
}

.legend-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
}

.legend-dot.temp { background: #ff9b3d; }
.legend-dot.hum { background: #3d9fff; }

/* Gauges */
.gauge-container {
  width: 160px;
  height: 160px;
  position: relative;
  margin: 10px 0;
}

.gauge-svg {
  transform: rotate(-90deg);
}

.gauge-fill {
  transition: stroke-dashoffset 1s cubic-bezier(0.4, 0, 0.2, 1), 
              stroke 0.3s ease;
}

.gauge-value {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  font-size: 32px;
  font-weight: 700;
  color: var(--text);
}

/* Tilt Visualization */
.svg-display {
  width: 100%;
  height: 200px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.tilt-viz {
  width: 100%;
  max-width: 240px;
  height: 180px;
  position: relative;
}

.tilt-surface {
  position: absolute;
  bottom: 30px;
  left: 50%;
  transform: translateX(-50%);
  width: 180px;
  height: 3px;
  background: repeating-linear-gradient(
    90deg,
    #4a5568,
    #4a5568 10px,
    transparent 10px,
    transparent 20px
  );
}

.tilt-device {
  position: absolute;
  bottom: 36px;
  left: 50%;
  width: 50px;
  height: 16px;
  background: #4d4d4d;
  border: 1px solid var(--panel-border);
  border-radius: 2px;
  transform-origin: center bottom;
  transition: transform 1s cubic-bezier(0.4, 0, 0.2, 1);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 9px;
  color: white;
  font-weight: 700;
}

.tilt-indicator {
  position: absolute;
  bottom: 52px;
  left: 50%;
  width: 2px;
  height: 80px;
  background: linear-gradient(to top, #ef4444, transparent);
  transform-origin: center bottom;
  transition: transform 1s cubic-bezier(0.4, 0, 0.2, 1);
}

.tilt-label {
  position: absolute;
  top: 10px;
  left: 50%;
  transform: translateX(-50%);
  font-size: 16px;
  color: #ef4444;
  font-weight: 700;
}

/* Distance Visualization */
.distance-viz {
  width: 100%;
  max-width: 260px;
  height: 180px;
  position: relative;
}

.s6000-box {
  position: absolute;
  left: 20px;
  top: 50%;
  transform: translateY(-50%);
  background: #4d4d4d;
  padding: 6px 14px;
  border-radius: 4px;
  font-size: 12px;
  color: white;
  font-weight: 700;
  transition: left 1s cubic-bezier(0.4, 0, 0.2, 1);
}

.obstacle {
  position: absolute;
  right: 20px;
  top: 50%;
  transform: translateY(-50%);
  width: 30px;
  height: 100px;
  background: repeating-linear-gradient(
    45deg,
    #4a5568,
    #4a5568 8px,
    #374151 8px,
    #374151 16px
  );
  border: 2px solid var(--panel-border);
}

.distance-line {
  position: absolute;
  top: 50%;
  height: 2px;
  background: rgba(239, 68, 68, 0.4);
  border-top: 2px dashed #ef4444;
  transition: left 1s cubic-bezier(0.4, 0, 0.2, 1), 
              width 1s cubic-bezier(0.4, 0, 0.2, 1);
}

.distance-label {
  position: absolute;
  top: 35%;
  left: 50%;
  transform: translateX(-50%);
  font-size: 14px;
  color: #ef4444;
  font-weight: 700;
}

/* GPS Map with Leaflet */
.map-container {
  width: 100%;
  height: 400px;
  background: var(--panel-2);
  border-radius: 6px;
  border: 1px solid var(--panel-border);
  position: relative;
  overflow: hidden;
}

.leaflet-map {
  width: 100%;
  height: 100%;
  border-radius: 6px;
}

.map-coords {
  position: absolute;
  bottom: 12px;
  left: 12px;
  font-size: 11px;
  color: var(--text);
  background: rgba(17, 24, 39, 0.95);
  padding: 8px 12px;
  border-radius: 4px;
  font-weight: 700;
  backdrop-filter: blur(8px);
  border: 1px solid var(--panel-border);
  z-index: 1000;
}

/* Statistics Footer */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 15px;
}

.stat {
  padding: 14px;
  border-radius: 6px;
  color: var(--text);
  background: var(--panel);
  border: 1px solid var(--panel-border);
  box-shadow: 0 8px 18px rgba(0,0,0,0.2);
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.stat:hover {
  transform: translateY(-2px);
  box-shadow: 0 12px 24px rgba(0,0,0,0.3);
}

.stat-temp { border-left: 3px solid #ef4444; }
.stat-hum { border-left: 3px solid #3b82f6; }
.stat-pres { border-left: 3px solid #10b981; }
.stat-count { border-left: 3px solid #8b5cf6; }

.stat-label { 
  font-size: 11px; 
  opacity: 0.85; 
  margin-bottom: 6px; 
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.4px;
  display: flex;
  align-items: center;
  gap: 6px;
}

.stat-value { 
  font-size: 26px; 
  font-weight: 900; 
  margin-bottom: 6px; 
}

.stat-sub { 
  font-size: 11px; 
  opacity: 0.75; 
}

/* Responsive Design */
@media (max-width: 1400px) {
  .chart-panel {
    grid-column: span 24;
  }
  .thermometer-panel,
  .gauge-panel {
    grid-column: span 8;
  }
}

@media (max-width: 768px) {
  .main-grid > * {
    grid-column: span 24 !important;
  }
  
  .header {
    flex-direction: column;
    align-items: flex-start;
  }
  
  .header-right {
    width: 100%;
    justify-content: space-between;
  }
}

@media (max-width: 480px) {
  .controls-grid {
    grid-template-columns: 1fr;
  }
  
  .stats-grid {
    grid-template-columns: 1fr;
  }
}
</style>