// SensorDashboardPage.vue - Updated with Detail Modal and Weather Prediction
<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import api from '../utils/api.js'
import AppShell from '../components/layout/AppShell.vue'
import SensorPanel from '../components/sensors/SensorPanel.vue'
import RagChatbot from '../components/RagChatbot.vue'

const devices = ref([]) // Array to store all device readings
const error = ref('')
const loading = ref(false)
const searchQuery = ref('')
const searchAttempted = ref(false)
const notFoundMessage = ref('')
const showDetailModal = ref(false)
const selectedDevice = ref(null)
const detailLoading = ref(false)
const deviceHistory = ref([])

let timer = null

async function loadLatest() {
  try {
    error.value = ''
    loading.value = true

    const data = await api.get(`/api/weather/forecast/?minutes=60`)

    if (!Array.isArray(data) || data.length === 0) {
      devices.value = []
      return
    }

    // Group readings by device_id and get the latest reading for each device
    const deviceMap = new Map()
    
    data.forEach(reading => {
      const deviceId = reading.device_id || 'unknown'
      const existingReading = deviceMap.get(deviceId)
      
      // Skip readings without a timestamp
      if (!reading.time) return
      
      const currentTime = new Date(reading.time).getTime()
      
      // Keep the reading with the most recent timestamp
      if (!existingReading) {
        deviceMap.set(deviceId, reading)
      } else {
        const existingTime = new Date(existingReading.time).getTime()
        if (currentTime > existingTime) {
          deviceMap.set(deviceId, reading)
        }
      }
    })

    // Convert map to array, transform data, and sort by device_id
    devices.value = Array.from(deviceMap.values()).map(reading => ({
      deviceId: reading.device_id || 'unknown',
      temperature: reading.temperature ?? '—',
      humidity: reading.humidity ?? '—',
      pressure: reading.pressure ? (reading.pressure / 1000).toFixed(2) : '—',
      light: reading.light ?? '—',
      noise: reading.noise ?? '—',
      tof: reading.tof ?? '—',
      angle: reading.angle ?? '—',
      weather_prediction: reading.weather_prediction ?? '—',
      accX: reading.accX ?? '—',
      accY: reading.accY ?? '—',
      accZ: reading.accZ ?? '—',
      vibrAccX: reading.vibrAccX ?? '—',
      vibrAccY: reading.vibrAccY ?? '—',
      vibrAccZ: reading.vibrAccZ ?? '—',
      observedAt: reading.time ? new Date(reading.time).toLocaleString() : '—',
      timestamp: reading.time
    })).sort((a, b) => {
      const idA = String(a.deviceId || '')
      const idB = String(b.deviceId || '')
      return idA.localeCompare(idB)
    })

  } catch (e) {
    error.value = String(e)
    console.error('Error loading data:', e)
  } finally {
    loading.value = false
  }
}

// Load detailed device information for specific device only
async function loadDeviceDetails(deviceId) {
  try {
    detailLoading.value = true
    
    // Fetch device history for the last 1 hour for this specific device only
    const data = await api.get(`/api/weather/forecast/?device_id=${deviceId}&minutes=60`)
    
    // Filter to ensure we only have data for this specific device
    const filteredData = data.filter(reading => reading.device_id === deviceId)
    
    deviceHistory.value = filteredData.map(reading => ({
      time: reading.time ? new Date(reading.time).toLocaleString() : '—',
      temperature: reading.temperature ?? '—',
      humidity: reading.humidity ?? '—',
      pressure: reading.pressure ?? '—',
      light: reading.light ?? '—',
      noise: reading.noise ?? '—',
      tof: reading.tof ?? '—',
      angle: reading.angle ?? '—',
      weather_prediction: reading.weather_prediction ?? '—',
      accX: reading.accX ?? '—',
      accY: reading.accY ?? '—',
      accZ: reading.accZ ?? '—',
      vibrAccX: reading.vibrAccX ?? '—',
      vibrAccY: reading.vibrAccY ?? '—',
      vibrAccZ: reading.vibrAccZ ?? '—',
      deviceId: reading.device_id
    })).reverse() // Most recent first
    
  } catch (e) {
    console.error('Error loading device details:', e)
    deviceHistory.value = []
  } finally {
    detailLoading.value = false
  }
}

// Show detail modal
async function showDetails(device) {
  selectedDevice.value = device
  showDetailModal.value = true
  await loadDeviceDetails(device.deviceId)
}

// Close modal
function closeModal() {
  showDetailModal.value = false
  selectedDevice.value = null
  deviceHistory.value = []
}

// Filter devices based on search query
const filteredDevices = computed(() => {
  if (!searchQuery.value.trim()) {
    return devices.value
  }
  const query = searchQuery.value.toLowerCase()
  return devices.value.filter(device => {
    const deviceIdStr = String(device.deviceId || '').toLowerCase()
    return deviceIdStr.includes(query)
  })
})

function handleSearch() {
  searchAttempted.value = true
  notFoundMessage.value = ''
  
  if (!searchQuery.value.trim()) {
    searchAttempted.value = false
    return
  }
  
  const query = searchQuery.value.toLowerCase()
  const found = devices.value.some(device => {
    const deviceIdStr = String(device.deviceId || '').toLowerCase()
    return deviceIdStr.includes(query)
  })
  
  if (!found) {
    notFoundMessage.value = `Device ID "${searchQuery.value}" does not exist`
    setTimeout(() => {
      notFoundMessage.value = ''
    }, 5000)
  }
}

function clearSearch() {
  searchQuery.value = ''
  searchAttempted.value = false
  notFoundMessage.value = ''
}

function formatValue(v, unit) {
  if (v === '—' || v === null || v === undefined) return '—'
  const n = Number(v)
  if (Number.isNaN(n)) return String(v)
  return `${n.toFixed(1)} ${unit}`
}

onMounted(() => {
  loadLatest()
  timer = setInterval(loadLatest, 15_000) // Refresh every 15 seconds
})

onUnmounted(() => {
  if (timer) clearInterval(timer)
})
</script>

<template>
  <AppShell
    :breadcrumbs="['Università della Calabria', 'TELECOMMUNICATION ENGINEERING: SMART SENSING, COMPUTING AND NETWORKING', 'IOT-Smart Park Project']"
    title="Load Weather Data and Monitor Dashboard"
    :tabs="tabs"
    v-model="activeTab"
  >
    <template #toolbar>
      <div class="d-flex flex-wrap gap-3 align-items-center">
        <div class="input-group" style="max-width: 520px;">
          <span class="input-group-text bg-black bg-opacity-25 border-secondary text-secondary">⌕</span>
          <input 
            v-model="searchQuery"
            @keyup.enter="handleSearch"
            class="form-control bg-black bg-opacity-25 border-secondary text-white"
            placeholder="Search based on device_ID..." 
          />
          <button 
            v-if="searchQuery"
            class="btn btn-outline-secondary"
            @click="clearSearch"
            title="Clear search"
          >
            <i class="bi bi-x-lg"></i>
          </button>
        </div>

        <div class="d-flex gap-2 flex-shrink-0">
          <button class="btn btn-outline-secondary fw-bold" @click="handleSearch">
            <i class="bi bi-search me-1"></i>
            Search
          </button>
          <button class="btn btn-outline-primary fw-bold" @click="loadLatest">
            <i class="bi bi-arrow-clockwise me-1"></i>
            Refresh All
          </button>
        </div>

        <div class="ms-auto text-secondary">
          <strong>{{ filteredDevices.length }}</strong> device{{ filteredDevices.length !== 1 ? 's' : '' }} 
          {{ searchQuery ? 'found' : 'total' }}
        </div>
      </div>
    </template>

    <!-- Device Not Found Alert -->
    <div v-if="notFoundMessage" class="alert alert-warning alert-dismissible fade show m-3" role="alert">
      <i class="bi bi-exclamation-triangle-fill me-2"></i>
      <strong>{{ notFoundMessage }}</strong>
      <p class="mb-0 mt-2 small">Available devices: {{ devices.map(d => d.deviceId).join(', ') || 'None' }}</p>
      <button type="button" class="btn-close" @click="notFoundMessage = ''" aria-label="Close"></button>
    </div>

    <!-- Loading State -->
    <div v-if="loading && devices.length === 0" class="text-center py-5">
      <div class="spinner-border text-secondary" role="status">
        <span class="visually-hidden">Loading...</span>
      </div>
      <p class="text-secondary mt-3">Loading device data...</p>
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="alert alert-danger m-3" role="alert">
      <i class="bi bi-exclamation-triangle me-2"></i>
      <strong>Error:</strong> {{ error }}
    </div>

    <!-- Empty State - No Data at All -->
    <div v-else-if="devices.length === 0" class="text-center py-5">
      <i class="bi bi-inbox fs-1 text-secondary"></i>
      <p class="text-secondary mt-3">No device data available</p>
      <button class="btn btn-primary mt-2" @click="loadLatest">
        <i class="bi bi-arrow-clockwise me-1"></i>
        Reload Data
      </button>
    </div>

    <!-- Search Result - No Matches -->
    <div v-else-if="searchAttempted && filteredDevices.length === 0" class="text-center py-5">
      <i class="bi bi-search fs-1 text-warning"></i>
      <p class="text-secondary mt-3 h5">No devices found matching "{{ searchQuery }}"</p>
      <p class="text-muted">Try searching for one of these available devices:</p>
      <div class="d-flex flex-wrap justify-content-center gap-2 mt-3">
        <button 
          v-for="device in devices" 
          :key="device.deviceId"
          class="btn btn-outline-primary btn-sm"
          @click="searchQuery = device.deviceId; handleSearch()"
        >
          {{ device.deviceId }}
        </button>
      </div>
      <button class="btn btn-secondary mt-4" @click="clearSearch">
        <i class="bi bi-x-circle me-1"></i>
        Clear Search & Show All
      </button>
    </div>

    <!-- Device Panels Grid -->
    <div v-else class="row g-3 p-3">
      <div 
        v-for="device in filteredDevices" 
        :key="device.deviceId"
        class="col-12 col-md-6 col-lg-4"
      >
        <SensorPanel
          :title="`Device: ${device.deviceId}`"
          :temperature="device.temperature"
          :humidity="device.humidity"
          :pressure="device.pressure"
          :light="device.light"
          :noise="device.noise"
          :tof="device.tof"
          :angle="device.angle"
          :accX="device.accX"
          :accY="device.accY"
          :accZ="device.accZ"
          :vibrAccX="device.vibrAccX"
          :vibrAccY="device.vibrAccY"
          :vibrAccZ="device.vibrAccZ"

          :device-id="device.deviceId"
          :observed-at="device.observedAt"
          :loading="loading"
          :error="error"
          :format-value="formatValue"
          @refresh="showDetails(device)"
          @click="showDetails(device)"
        />
      </div>
    </div>

    <!-- Refresh Indicator -->
    <div v-if="loading && devices.length > 0" class="position-fixed bottom-0 end-0 m-3" style="z-index: 1050;">
      <div class="bg-primary text-white px-3 py-2 rounded shadow">
        <div class="spinner-border spinner-border-sm me-2" role="status">
          <span class="visually-hidden">Loading...</span>
        </div>
        Updating...
      </div>
    </div>

    <!-- RAG Chatbot Component -->
    <RagChatbot :deviceData="sensorRows" />


    <!-- Detail Modal -->
    <div 
      v-if="showDetailModal" 
      class="modal fade show d-block" 
      tabindex="-1" 
      style="background-color: rgba(0,0,0,0.5);"
      @click.self="closeModal"
    >
      <div class="modal-dialog modal-dialog-centered modal-lg modal-dialog-scrollable">
        <div class="modal-content bg-dark text-white">
          <div class="modal-header border-secondary">
            <h5 class="modal-title">
              <i class="bi bi-info-circle me-2"></i>
              Device Details: {{ selectedDevice?.deviceId }}
            </h5>
            <button type="button" class="btn-close btn-close-white" @click="closeModal"></button>
          </div>
          <div class="modal-body">
            <!-- Current Readings -->
            <div class="card bg-black bg-opacity-25 border-secondary mb-4">
              <div class="card-header bg-black bg-opacity-50 border-secondary">
                <h6 class="mb-0">Current Readings</h6>
              </div>
              <div class="card-body">
                <div class="row g-3">
                  <div class="col-md-4">
                    <div class="d-flex flex-column">
                      <small class="text-secondary mb-1">Temperature</small>
                      <strong class="fs-4 text-warning">
                        {{ formatValue(selectedDevice?.temperature, '°C') }}
                      </strong>
                    </div>
                  </div>
                  <div class="col-md-4">
                    <div class="d-flex flex-column">
                      <small class="text-secondary mb-1">Humidity</small>
                      <strong class="fs-4 text-info">
                        {{ formatValue(selectedDevice?.humidity, '%') }}
                      </strong>
                    </div>
                  </div>
                  <div class="col-md-4">
                    <div class="d-flex flex-column">
                      <small class="text-secondary mb-1">Pressure</small>
                      <strong class="fs-4 text-success">
                        {{ formatValue(selectedDevice?.pressure, 'kPa') }}
                      </strong>
                    </div>
                  </div>
                  <div class="col-md-3">
                    <div class="d-flex flex-column">
                      <small class="text-secondary mb-1">Light</small>
                      <strong class="fs-5 text-warning">
                        {{ formatValue(selectedDevice?.light, 'lx') }}
                      </strong>
                    </div>
                  </div>
                  <div class="col-md-3">
                    <div class="d-flex flex-column">
                      <small class="text-secondary mb-1">Noise</small>
                      <strong class="fs-5 text-info">
                        {{ formatValue(selectedDevice?.noise, 'dB') }}
                      </strong>
                    </div>
                  </div>
                  <div class="col-md-3">
                    <div class="d-flex flex-column">
                      <small class="text-secondary mb-1">ToF</small>
                      <strong class="fs-5 text-success">
                        {{ formatValue(selectedDevice?.tof, 'cm') }}
                      </strong>
                    </div>
                  </div>
                  <div class="col-md-3">
                    <div class="d-flex flex-column">
                      <small class="text-secondary mb-1">Angle</small>
                      <strong class="fs-5 text-primary">
                        {{ formatValue(selectedDevice?.angle, 'deg') }}
                      </strong>
                    </div>
                  </div>
                  <div class="col-md-12">
                    <div class="d-flex flex-column">
                      <small class="text-secondary mb-1">Weather Prediction</small>
                      <strong class="fs-5 text-light">
                        {{ selectedDevice?.weather_prediction || '—' }}
                      </strong>
                    </div>
                  </div>
                </div>
                <div class="mt-3 pt-3 border-top border-secondary">
                  <small class="text-secondary">Last Updated:</small>
                  <div class="text-white">{{ selectedDevice?.observedAt }}</div>
                </div>
              </div>
            </div>

            <!-- Historical Data -->
            <div class="card bg-black bg-opacity-25 border-secondary">
              <div class="card-header bg-black bg-opacity-50 border-secondary d-flex justify-content-between align-items-center">
                <h6 class="mb-0">Historical Data (Last 1 Hour) - Device ID: {{ selectedDevice?.deviceId }}</h6>
                <button 
                  class="btn btn-sm btn-outline-primary"
                  @click="loadDeviceDetails(selectedDevice?.deviceId)"
                  :disabled="detailLoading"
                >
                  <i class="bi bi-arrow-clockwise" :class="{ 'spinner-border spinner-border-sm': detailLoading }"></i>
                  {{ detailLoading ? '' : 'Refresh' }}
                </button>
              </div>
              <div class="card-body p-0">
                <div v-if="detailLoading" class="text-center py-4">
                  <div class="spinner-border text-primary" role="status">
                    <span class="visually-hidden">Loading...</span>
                  </div>
                  <p class="text-secondary mt-2">Loading history...</p>
                </div>
                
                <div v-else-if="deviceHistory.length === 0" class="text-center py-4 text-secondary">
                  <i class="bi bi-inbox fs-3"></i>
                  <p class="mt-2">No historical data available</p>
                </div>

                <div v-else class="table-responsive" style="max-height: 400px; overflow-y: auto;">
                  <table class="table table-dark table-striped table-hover mb-0">
                    <thead class="sticky-top bg-dark">
                      <tr>
                        <th>Time</th>
                        <th>Temperature</th>
                        <th>Humidity</th>
                        <th>Pressure</th>
                        <th>Light</th>
                        <th>Noise</th>
                        <th>ToF</th>
                        <th>Angle</th>
                        <th>Weather</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr v-for="(reading, index) in deviceHistory" :key="index">
                        <td class="text-secondary">{{ reading.time }}</td>
                        <td class="text-warning">{{ formatValue(reading.temperature, '°C') }}</td>
                        <td class="text-info">{{ formatValue(reading.humidity, '%') }}</td>
                        <td class="text-success">{{ formatValue(reading.pressure / 1000, 'kPa') }}</td>
                        <td class="text-warning">{{ formatValue(reading.light, 'lx') }}</td>
                        <td class="text-info">{{ formatValue(reading.noise, 'dB') }}</td>
                        <td class="text-success">{{ formatValue(reading.tof, 'cm') }}</td>
                        <td class="text-primary">{{ formatValue(reading.angle, 'deg') }}</td>
                        <td class="text-light">{{ reading.weather_prediction || '—' }}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
          <div class="modal-footer border-secondary">
            <button type="button" class="btn btn-secondary" @click="closeModal">Close</button>
          </div>
        </div>
      </div>
    </div>
  </AppShell>
</template>

<style scoped>
.row {
  --bs-gutter-x: 1rem;
  --bs-gutter-y: 1rem;
}

.modal {
  display: block;
}

.table-responsive::-webkit-scrollbar {
  width: 8px;
}

.table-responsive::-webkit-scrollbar-track {
  background: #212529;
}

.table-responsive::-webkit-scrollbar-thumb {
  background: #495057;
  border-radius: 4px;
}

.table-responsive::-webkit-scrollbar-thumb:hover {
  background: #6c757d;
}
</style>