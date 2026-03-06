<!-- ChartPage.vue - Enhanced Interactive Grafana-like Dashboard with Axes -->
<script setup>
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue'
import api from '../../utils/api.js'

/* -----------------------
 * State
 * --------------------- */
const selectedDevice = ref('101')
const timeRange = ref('6h')
const bucketMinutes = ref(5)
const refreshSeconds = ref(30)
const selectedVisualization = ref('line')

const chartData = ref([])
const availableDevices = ref([])
const loading = ref(false)
const error = ref('')

const zoomLevel = ref(1)
const panX = ref(0)
const panY = ref(0)
const hoveredPoint = ref(null)
const selectedPoints = ref([])
const showStats = ref(true)
const showGrid = ref(true)
const fullscreenChart = ref(null) // null, 'temp', 'hum', 'pres', 'noise'

/* -----------------------
 * Chart constants
 * --------------------- */
const svgWidth = 800
const svgHeight = 350

const PADDING = { left: 70, right: 30, top: 20, bottom: 50 }
const innerWidth = svgWidth - PADDING.left - PADDING.right
const innerHeight = svgHeight - PADDING.top - PADDING.bottom

let timer = null

const visualizationTypes = [
  { id: 'line', label: 'Line Chart', icon: 'bi-graph-up', number: '1' },
  { id: 'area', label: 'Area Chart', icon: 'bi-graph-up', number: '2' },
  { id: 'bar', label: 'Bar Chart', icon: 'bi-bar-chart', number: '3' },
  { id: 'scatter', label: 'Scatter Plot', icon: 'bi-scatter', number: '4' }
]

/* -----------------------
 * Helpers
 * --------------------- */
function toNum(v) {
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}

function minutesForRange(range) {
  const ranges = { '1h': 60, '6h': 360, '24h': 1440, '7d': 10080, '30d': 43200 }
  return ranges[range] || 360
}

function formatTs(ts, short = false) {
  try {
    const d = new Date(ts)
    if (short) {
      return d.toLocaleString('en-US', { hour: '2-digit', minute: '2-digit' })
    }
    return d.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
  } catch {
    return ''
  }
}

function xForIndex(i, len) {
  if (len <= 1) return PADDING.left + innerWidth / 2
  return PADDING.left + (innerWidth * i) / (len - 1)
}

function yForValue(v, min, max) {
  if (v == null) return null
  const range = max - min || 1
  const t = (v - min) / range
  return PADDING.top + (1 - t) * innerHeight
}

function bucketize(rows) {
  const bm = bucketMinutes.value
  if (!bm || bm <= 0) return rows

  const bucketMs = bm * 60 * 1000
  const m = new Map()

  for (const r of rows) {
    const b = Math.floor(r.t / bucketMs) * bucketMs
    const cur = m.get(b) || { t: b, tempSum: 0, humSum: 0, presSum: 0, noiseSum: 0, tempN: 0, humN: 0, presN: 0, noiseN: 0 }

    if (r.temperature != null) { cur.tempSum += r.temperature; cur.tempN++ }
    if (r.humidity != null) { cur.humSum += r.humidity; cur.humN++ }
    if (r.pressure != null) { cur.presSum += r.pressure; cur.presN++ }
    if (r.noise != null) { cur.noiseSum += r.noise; cur.noiseN++ }
    m.set(b, cur)
  }

  return [...m.values()].sort((a, b) => a.t - b.t).map(b => ({
    t: b.t,
    temperature: b.tempN ? b.tempSum / b.tempN : null,
    humidity: b.humN ? b.humSum / b.humN : null,
    pressure: b.presN ? b.presSum / b.presN : null,
    noise: b.noiseN ? b.noiseSum / b.noiseN : null
  }))
}

/* -----------------------
 * Fetch data with Auth
 * --------------------- */
async function loadChartData() {
  loading.value = true
  error.value = ''
  hoveredPoint.value = null
  selectedPoints.value = []
  resetView()

  try {
    const minutes = minutesForRange(timeRange.value)
    const data = await api.get(`/api/weather/forecast/?minutes=${minutes}`)

    if (!Array.isArray(data)) throw new Error('Unexpected API response')

    const uniqueDevices = [...new Set(data.map(d => String(d.device_id ?? 'unknown')))].sort()
    availableDevices.value = uniqueDevices

    const filtered = data.filter(d => String(d.device_id) === String(selectedDevice.value))
    
    const normalized = filtered
      .map(d => ({
        t: new Date(d.time).getTime(),
        temperature: toNum(d.temperature),
        humidity: toNum(d.humidity),
        pressure: toNum(d.pressure),
        noise: toNum(d.noise)
      }))
      .filter(d => Number.isFinite(d.t))
      .sort((a, b) => a.t - b.t)

    chartData.value = bucketize(normalized)
  } catch (e) {
    console.error('Chart data error:', e)
    error.value = String(e?.message || e)
    chartData.value = []
    availableDevices.value = []
  } finally {
    loading.value = false
  }
}

/* -----------------------
 * Axis helpers
 * --------------------- */
function generateYAxisLabels(min, max, count = 5) {
  const range = max - min || 1
  const step = range / (count - 1)
  const labels = []
  for (let i = 0; i < count; i++) {
    const value = min + step * i
    const y = yForValue(value, min, max)
    labels.push({ value, y })
  }
  return labels.reverse()
}

function generateXAxisLabels(count = 6) {
  const len = chartData.value.length
  if (len === 0) return []
  
  const labels = []
  const step = Math.max(1, Math.floor(len / (count - 1)))
  
  for (let i = 0; i < len; i += step) {
    const row = chartData.value[i]
    const x = xForIndex(i, len)
    labels.push({ time: row.t, x })
  }
  
  if (labels[labels.length - 1]?.time !== chartData.value[len - 1]?.t) {
    const last = chartData.value[len - 1]
    labels.push({ time: last.t, x: xForIndex(len - 1, len) })
  }
  
  return labels
}

const tempYLabels = computed(() => {
  if (chartData.value.length === 0) return []
  return generateYAxisLabels(minTemperature.value, maxTemperature.value)
})
const humYLabels = computed(() => {
  if (chartData.value.length === 0) return []
  return generateYAxisLabels(minHumidity.value, maxHumidity.value)
})
const presYLabels = computed(() => {
  if (chartData.value.length === 0) return []
  return generateYAxisLabels(minPressure.value, maxPressure.value)
})
const noiseYLabels = computed(() => {
  if (chartData.value.length === 0) return []
  return generateYAxisLabels(minNoise.value, maxNoise.value)
})
const xLabels = computed(() => {
  if (chartData.value.length === 0) return []
  return generateXAxisLabels()
})

/* -----------------------
 * Stats
 * --------------------- */
function avgOf(key) {
  const vals = chartData.value.map(d => d[key]).filter(v => v != null)
  if (!vals.length) return 0
  return vals.reduce((a, b) => a + b, 0) / vals.length
}

function minOf(key) {
  const vals = chartData.value.map(d => d[key]).filter(v => v != null)
  return vals.length ? Math.min(...vals) : 0
}

function maxOf(key) {
  const vals = chartData.value.map(d => d[key]).filter(v => v != null)
  return vals.length ? Math.max(...vals) : 0
}

const avgTemperature = computed(() => avgOf('temperature'))
const avgHumidity = computed(() => avgOf('humidity'))
const avgPressure = computed(() => avgOf('pressure'))
const avgNoise = computed(() => avgOf('noise'))

const minTemperature = computed(() => minOf('temperature'))
const maxTemperature = computed(() => maxOf('temperature'))
const minHumidity = computed(() => minOf('humidity'))
const maxHumidity = computed(() => maxOf('humidity'))
const minPressure = computed(() => minOf('pressure'))
const maxPressure = computed(() => maxOf('pressure'))
const minNoise = computed(() => minOf('noise'))
const maxNoise = computed(() => maxOf('noise'))

const selectedPointStats = computed(() => {
  if (selectedPoints.value.length === 0) return null
  const temps = selectedPoints.value.map(p => p.temp).filter(v => v != null)
  const hums = selectedPoints.value.map(p => p.hum).filter(v => v != null)
  const press = selectedPoints.value.map(p => p.pres).filter(v => v != null)
  const noises = selectedPoints.value.map(p => p.noise).filter(v => v != null)
  
  return {
    tempAvg: temps.length ? (temps.reduce((a, b) => a + b) / temps.length).toFixed(2) : '—',
    humAvg: hums.length ? (hums.reduce((a, b) => a + b) / hums.length).toFixed(2) : '—',
    presAvg: press.length ? (press.reduce((a, b) => a + b) / press.length).toFixed(2) : '—',
    noiseAvg: noises.length ? (noises.reduce((a, b) => a + b) / noises.length).toFixed(2) : '—',
    count: selectedPoints.value.length
  }
})

/* -----------------------
 * Series builders
 * --------------------- */
function buildSeries(key, minV, maxV) {
  const len = chartData.value.length
  const pts = []
  for (let i = 0; i < len; i++) {
    const row = chartData.value[i]
    const v = row?.[key] ?? null
    const x = xForIndex(i, len)
    const y = yForValue(v, minV, maxV)
    if (y != null) {
      pts.push({ x, y, v, t: row.t, i })
    }
  }
  return pts
}

const temperatureSeries = computed(() => buildSeries('temperature', minTemperature.value, maxTemperature.value))
const humiditySeries = computed(() => buildSeries('humidity', minHumidity.value, maxHumidity.value))
const pressureSeries = computed(() => buildSeries('pressure', minPressure.value, maxPressure.value))
const noiseSeries = computed(() => buildSeries('noise', minNoise.value, maxNoise.value))

function polylinePoints(series) {
  return series.map(p => `${p.x},${p.y}`).join(' ')
}

function areaPath(series) {
  if (!series.length) return ''
  const first = series[0]
  const last = series[series.length - 1]
  const topLine = series.map(p => `${p.x},${p.y}`).join(' ')
  const baseY = PADDING.top + innerHeight
  return `M ${first.x},${baseY} L ${topLine} L ${last.x},${baseY} Z`
}

const temperatureLinePoints = computed(() => polylinePoints(temperatureSeries.value))
const humidityLinePoints = computed(() => polylinePoints(humiditySeries.value))
const pressureLinePoints = computed(() => polylinePoints(pressureSeries.value))
const noiseLinePoints = computed(() => polylinePoints(noiseSeries.value))

const temperatureAreaPath = computed(() => areaPath(temperatureSeries.value))
const humidityAreaPath = computed(() => areaPath(humiditySeries.value))
const pressureAreaPath = computed(() => areaPath(pressureSeries.value))
const noiseAreaPath = computed(() => areaPath(noiseSeries.value))

/* -----------------------
 * Bar helpers
 * --------------------- */
function barRects(series, minV, maxV) {
  const len = chartData.value.length || 1
  const spacing = innerWidth / len
  const bw = Math.max(6, Math.min(22, spacing * 0.7))
  const baseY = PADDING.top + innerHeight
  const range = maxV - minV || 1

  return series.map(p => {
    const t = (p.v - minV) / range
    const h = Math.max(1, t * innerHeight)
    return { x: p.x - bw / 2, y: baseY - h, w: bw, h, v: p.v, t: p.t, i: p.i }
  })
}

const tempBars = computed(() => barRects(temperatureSeries.value, minTemperature.value, maxTemperature.value))
const humBars = computed(() => barRects(humiditySeries.value, minHumidity.value, maxHumidity.value))
const presBars = computed(() => barRects(pressureSeries.value, minPressure.value, maxPressure.value))
const noiseBars = computed(() => barRects(noiseSeries.value, minNoise.value, maxNoise.value))

/* -----------------------
 * Point selection
 * --------------------- */
function togglePointSelection(type, i, temp, hum, pres, t, noise) {
  const key = `${type}-${i}`
  const existing = selectedPoints.value.findIndex(p => p.key === key)
  
  if (existing >= 0) {
    selectedPoints.value.splice(existing, 1)
  } else {
    selectedPoints.value.push({ key, type, i, temp, hum, pres, noise, t })
  }
}

function isPointSelected(type, i) {
  return selectedPoints.value.some(p => p.key === `${type}-${i}`)
}

function clearSelection() {
  selectedPoints.value = []
}

/* -----------------------
 * Fullscreen toggle
 * --------------------- */
function toggleFullscreen(chartType) {
  if (fullscreenChart.value === chartType) {
    fullscreenChart.value = null
  } else {
    fullscreenChart.value = chartType
  }
}

/* -----------------------
 * Zoom & Pan
 * --------------------- */
const isPanning = ref(false)
let panStart = null

const svgTransformStyle = computed(() => ({
  width: '100%',
  height: '100%',
  transform: `translate(${panX.value}px, ${panY.value}px) scale(${zoomLevel.value})`,
  transformOrigin: 'top left',
  transition: isPanning.value ? 'none' : 'transform 0.15s ease'
}))

function zoomIn() {
  zoomLevel.value = Math.min(zoomLevel.value + 0.2, 3)
}

function zoomOut() {
  zoomLevel.value = Math.max(zoomLevel.value - 0.2, 1)
}

function resetView() {
  zoomLevel.value = 1
  panX.value = 0
  panY.value = 0
}

function handleWheel(event) {
  event.preventDefault()
  if (event.deltaY < 0) zoomIn()
  else zoomOut()
}

function onPanMove(e) {
  if (!isPanning.value || !panStart) return
  panX.value = panStart.x + (e.clientX - panStart.startX)
  panY.value = panStart.y + (e.clientY - panStart.startY)
}

function endPan() {
  isPanning.value = false
  panStart = null
  window.removeEventListener('mousemove', onPanMove)
  window.removeEventListener('mouseup', endPan)
}

function startPan(e) {
  if (e.button !== 0) return
  isPanning.value = true
  panStart = {
    startX: e.clientX,
    startY: e.clientY,
    x: panX.value,
    y: panY.value
  }
  window.addEventListener('mousemove', onPanMove)
  window.addEventListener('mouseup', endPan)
}

/* -----------------------
 * Timer
 * --------------------- */
function stopTimer() {
  if (timer) clearInterval(timer)
  timer = null
}

function startTimer() {
  stopTimer()
  if (!refreshSeconds.value || refreshSeconds.value <= 0) return
  timer = setInterval(loadChartData, refreshSeconds.value * 1000)
}

watch(refreshSeconds, startTimer)
watch([selectedDevice, timeRange, bucketMinutes], () => loadChartData())

onMounted(() => {
  loadChartData()
  startTimer()
})

onBeforeUnmount(() => {
  stopTimer()
  endPan()
})
</script>

<template>
  <div class="dashboard">
    <!-- Fullscreen overlay -->
    <div v-if="fullscreenChart" class="fullscreen-overlay" @click.self="fullscreenChart = null">
      <div class="fullscreen-chart-wrapper">
        <button class="close-fullscreen" @click="fullscreenChart = null">
          <i class="bi bi-x-lg"></i>
        </button>
        
        <!-- Temperature Fullscreen -->
        <div v-if="fullscreenChart === 'temp'" class="fullscreen-chart">
          <h2 class="fs-chart-title"><i class="bi bi-thermometer-half"></i> Temperature Over Time</h2>
          <div class="fs-chart-wrap">
            <svg viewBox="0 0 1400 700">
              <g v-for="label in tempYLabels" :key="`fs-ty-${label.y}`">
                <text :x="55" :y="(label.y / svgHeight) * 700" text-anchor="end" fill="#a0aec0" font-size="16">{{ label.value.toFixed(1) }}°C</text>
                <line :x1="70" :y1="(label.y / svgHeight) * 700" :x2="1370" :y2="(label.y / svgHeight) * 700" stroke="rgba(255,255,255,0.05)" stroke-width="1"/>
              </g>
              <g v-for="(label, idx) in xLabels" :key="`fs-tx-${idx}`">
                <text :x="(label.x / svgWidth) * 1400" y="680" text-anchor="middle" fill="#a0aec0" font-size="14">{{ formatTs(label.time, true) }}</text>
                <line :x1="(label.x / svgWidth) * 1400" y1="30" :x2="(label.x / svgWidth) * 1400" y2="650" stroke="rgba(255,255,255,0.05)" stroke-width="1"/>
              </g>
              <line x1="70" y1="30" x2="70" y2="650" stroke="#4a5568" stroke-width="3"/>
              <line x1="70" y1="650" x2="1370" y2="650" stroke="#4a5568" stroke-width="3"/>
              <path v-if="selectedVisualization === 'area'" :d="`M ${temperatureSeries.map(p => `${(p.x / svgWidth) * 1400},${(p.y / svgHeight) * 700}`).join(' L ')} L ${temperatureSeries.length ? (temperatureSeries[temperatureSeries.length-1].x / svgWidth) * 1400 : 0},650 L ${temperatureSeries.length ? (temperatureSeries[0].x / svgWidth) * 1400 : 0},650 Z`" fill="#ef4444" style="opacity: 0.2"/>
              <polyline v-if="selectedVisualization === 'line' || selectedVisualization === 'area'" :points="temperatureSeries.map(p => `${(p.x / svgWidth) * 1400},${(p.y / svgHeight) * 700}`).join(' ')" fill="none" stroke="#ef4444" stroke-width="4"/>
              <template v-if="selectedVisualization === 'scatter' || selectedVisualization === 'line' || selectedVisualization === 'area'">
                <circle v-for="p in temperatureSeries" :key="`fs-t-pt-${p.i}`" :cx="(p.x / svgWidth) * 1400" :cy="(p.y / svgHeight) * 700" :r="selectedVisualization === 'scatter' ? 8 : 6" fill="#ef4444" style="cursor: pointer" @mouseover="hoveredPoint = { type: 'temp', v: p.v, t: p.t }" @mouseout="hoveredPoint = null"/>
              </template>
              <template v-if="selectedVisualization === 'bar'">
                <rect v-for="b in tempBars" :key="`fs-t-bar-${b.i}`" :x="(b.x / svgWidth) * 1400" :y="(b.y / svgHeight) * 700" :width="(b.w / svgWidth) * 1400" :height="(b.h / svgHeight) * 700" rx="4" fill="#ef4444" style="cursor: pointer" @mouseover="hoveredPoint = { type: 'temp', v: b.v, t: b.t }" @mouseout="hoveredPoint = null"/>
              </template>
            </svg>
            <div v-if="hoveredPoint?.type === 'temp'" class="fs-tooltip fs-tooltip-temp">
              <div class="fs-tooltip-value">{{ hoveredPoint.v?.toFixed(2) }}°C</div>
              <div class="fs-tooltip-time">{{ formatTs(hoveredPoint.t) }}</div>
            </div>
          </div>
        </div>

        <!-- Humidity Fullscreen -->
        <div v-if="fullscreenChart === 'hum'" class="fullscreen-chart">
          <h2 class="fs-chart-title"><i class="bi bi-droplet-half"></i> Humidity Over Time</h2>
          <div class="fs-chart-wrap">
            <svg viewBox="0 0 1400 700">
              <g v-for="label in humYLabels" :key="`fs-hy-${label.y}`">
                <text :x="55" :y="(label.y / svgHeight) * 700" text-anchor="end" fill="#a0aec0" font-size="16">{{ label.value.toFixed(1) }}%</text>
                <line :x1="70" :y1="(label.y / svgHeight) * 700" :x2="1370" :y2="(label.y / svgHeight) * 700" stroke="rgba(255,255,255,0.05)" stroke-width="1"/>
              </g>
              <g v-for="(label, idx) in xLabels" :key="`fs-hx-${idx}`">
                <text :x="(label.x / svgWidth) * 1400" y="680" text-anchor="middle" fill="#a0aec0" font-size="14">{{ formatTs(label.time, true) }}</text>
                <line :x1="(label.x / svgWidth) * 1400" y1="30" :x2="(label.x / svgWidth) * 1400" y2="650" stroke="rgba(255,255,255,0.05)" stroke-width="1"/>
              </g>
              <line x1="70" y1="30" x2="70" y2="650" stroke="#4a5568" stroke-width="3"/>
              <line x1="70" y1="650" x2="1370" y2="650" stroke="#4a5568" stroke-width="3"/>
              <path v-if="selectedVisualization === 'area'" :d="`M ${humiditySeries.map(p => `${(p.x / svgWidth) * 1400},${(p.y / svgHeight) * 700}`).join(' L ')} L ${humiditySeries.length ? (humiditySeries[humiditySeries.length-1].x / svgWidth) * 1400 : 0},650 L ${humiditySeries.length ? (humiditySeries[0].x / svgWidth) * 1400 : 0},650 Z`" fill="#3b82f6" style="opacity: 0.2"/>
              <polyline v-if="selectedVisualization === 'line' || selectedVisualization === 'area'" :points="humiditySeries.map(p => `${(p.x / svgWidth) * 1400},${(p.y / svgHeight) * 700}`).join(' ')" fill="none" stroke="#3b82f6" stroke-width="4"/>
              <template v-if="selectedVisualization === 'scatter' || selectedVisualization === 'line' || selectedVisualization === 'area'">
                <circle v-for="p in humiditySeries" :key="`fs-h-pt-${p.i}`" :cx="(p.x / svgWidth) * 1400" :cy="(p.y / svgHeight) * 700" :r="selectedVisualization === 'scatter' ? 8 : 6" fill="#3b82f6" style="cursor: pointer" @mouseover="hoveredPoint = { type: 'hum', v: p.v, t: p.t }" @mouseout="hoveredPoint = null"/>
              </template>
              <template v-if="selectedVisualization === 'bar'">
                <rect v-for="b in humBars" :key="`fs-h-bar-${b.i}`" :x="(b.x / svgWidth) * 1400" :y="(b.y / svgHeight) * 700" :width="(b.w / svgWidth) * 1400" :height="(b.h / svgHeight) * 700" rx="4" fill="#3b82f6" style="cursor: pointer" @mouseover="hoveredPoint = { type: 'hum', v: b.v, t: b.t }" @mouseout="hoveredPoint = null"/>
              </template>
            </svg>
            <div v-if="hoveredPoint?.type === 'hum'" class="fs-tooltip fs-tooltip-hum">
              <div class="fs-tooltip-value">{{ hoveredPoint.v?.toFixed(2) }}%</div>
              <div class="fs-tooltip-time">{{ formatTs(hoveredPoint.t) }}</div>
            </div>
          </div>
        </div>

        <!-- Pressure Fullscreen -->
        <div v-if="fullscreenChart === 'pres'" class="fullscreen-chart">
          <h2 class="fs-chart-title"><i class="bi bi-speedometer2"></i> Pressure Over Time</h2>
          <div class="fs-chart-wrap">
            <svg viewBox="0 0 1400 700">
              <g v-for="label in presYLabels" :key="`fs-py-${label.y}`">
                <text :x="55" :y="(label.y / svgHeight) * 700" text-anchor="end" fill="#a0aec0" font-size="16">{{ (label.value / 1000).toFixed(2) }} kPa</text>
                <line :x1="70" :y1="(label.y / svgHeight) * 700" :x2="1370" :y2="(label.y / svgHeight) * 700" stroke="rgba(255,255,255,0.05)" stroke-width="1"/>
              </g>
              <g v-for="(label, idx) in xLabels" :key="`fs-px-${idx}`">
                <text :x="(label.x / svgWidth) * 1400" y="680" text-anchor="middle" fill="#a0aec0" font-size="14">{{ formatTs(label.time, true) }}</text>
                <line :x1="(label.x / svgWidth) * 1400" y1="30" :x2="(label.x / svgWidth) * 1400" y2="650" stroke="rgba(255,255,255,0.05)" stroke-width="1"/>
              </g>
              <line x1="70" y1="30" x2="70" y2="650" stroke="#4a5568" stroke-width="3"/>
              <line x1="70" y1="650" x2="1370" y2="650" stroke="#4a5568" stroke-width="3"/>
              <path v-if="selectedVisualization === 'area'" :d="`M ${pressureSeries.map(p => `${(p.x / svgWidth) * 1400},${(p.y / svgHeight) * 700}`).join(' L ')} L ${pressureSeries.length ? (pressureSeries[pressureSeries.length-1].x / svgWidth) * 1400 : 0},650 L ${pressureSeries.length ? (pressureSeries[0].x / svgWidth) * 1400 : 0},650 Z`" fill="#10b981" style="opacity: 0.2"/>
              <polyline v-if="selectedVisualization === 'line' || selectedVisualization === 'area'" :points="pressureSeries.map(p => `${(p.x / svgWidth) * 1400},${(p.y / svgHeight) * 700}`).join(' ')" fill="none" stroke="#10b981" stroke-width="4"/>
              <template v-if="selectedVisualization === 'scatter' || selectedVisualization === 'line' || selectedVisualization === 'area'">
                <circle v-for="p in pressureSeries" :key="`fs-p-pt-${p.i}`" :cx="(p.x / svgWidth) * 1400" :cy="(p.y / svgHeight) * 700" :r="selectedVisualization === 'scatter' ? 8 : 6" fill="#10b981" style="cursor: pointer" @mouseover="hoveredPoint = { type: 'pres', v: p.v, t: p.t }" @mouseout="hoveredPoint = null"/>
              </template>
              <template v-if="selectedVisualization === 'bar'">
                <rect v-for="b in presBars" :key="`fs-p-bar-${b.i}`" :x="(b.x / svgWidth) * 1400" :y="(b.y / svgHeight) * 700" :width="(b.w / svgWidth) * 1400" :height="(b.h / svgHeight) * 700" rx="4" fill="#10b981" style="cursor: pointer" @mouseover="hoveredPoint = { type: 'pres', v: b.v, t: b.t }" @mouseout="hoveredPoint = null"/>
              </template>
            </svg>
            <div v-if="hoveredPoint?.type === 'pres'" class="fs-tooltip fs-tooltip-pres">
              <div class="fs-tooltip-value">{{ (hoveredPoint.v / 1000)?.toFixed(2) }} kPa</div>
              <div class="fs-tooltip-time">{{ formatTs(hoveredPoint.t) }}</div>
            </div>
          </div>
        </div>

        <!-- Noise Fullscreen -->
        <div v-if="fullscreenChart === 'noise'" class="fullscreen-chart">
          <h2 class="fs-chart-title"><i class="bi bi-soundwave"></i> Noise Over Time</h2>
          <div class="fs-chart-wrap">
            <svg viewBox="0 0 1400 700">
              <g v-for="label in noiseYLabels" :key="`fs-ny-${label.y}`">
                <text :x="55" :y="(label.y / svgHeight) * 700" text-anchor="end" fill="#a0aec0" font-size="16">{{ label.value.toFixed(1) }} dB</text>
                <line :x1="70" :y1="(label.y / svgHeight) * 700" :x2="1370" :y2="(label.y / svgHeight) * 700" stroke="rgba(255,255,255,0.05)" stroke-width="1"/>
              </g>
              <g v-for="(label, idx) in xLabels" :key="`fs-nx-${idx}`">
                <text :x="(label.x / svgWidth) * 1400" y="680" text-anchor="middle" fill="#a0aec0" font-size="14">{{ formatTs(label.time, true) }}</text>
                <line :x1="(label.x / svgWidth) * 1400" y1="30" :x2="(label.x / svgWidth) * 1400" y2="650" stroke="rgba(255,255,255,0.05)" stroke-width="1"/>
              </g>
              <line x1="70" y1="30" x2="70" y2="650" stroke="#4a5568" stroke-width="3"/>
              <line x1="70" y1="650" x2="1370" y2="650" stroke="#4a5568" stroke-width="3"/>
              <path v-if="selectedVisualization === 'area'" :d="`M ${noiseSeries.map(p => `${(p.x / svgWidth) * 1400},${(p.y / svgHeight) * 700}`).join(' L ')} L ${noiseSeries.length ? (noiseSeries[noiseSeries.length-1].x / svgWidth) * 1400 : 0},650 L ${noiseSeries.length ? (noiseSeries[0].x / svgWidth) * 1400 : 0},650 Z`" fill="#f59e0b" style="opacity: 0.2"/>
              <polyline v-if="selectedVisualization === 'line' || selectedVisualization === 'area'" :points="noiseSeries.map(p => `${(p.x / svgWidth) * 1400},${(p.y / svgHeight) * 700}`).join(' ')" fill="none" stroke="#f59e0b" stroke-width="4"/>
              <template v-if="selectedVisualization === 'scatter' || selectedVisualization === 'line' || selectedVisualization === 'area'">
                <circle v-for="p in noiseSeries" :key="`fs-n-pt-${p.i}`" :cx="(p.x / svgWidth) * 1400" :cy="(p.y / svgHeight) * 700" :r="selectedVisualization === 'scatter' ? 8 : 6" fill="#f59e0b" style="cursor: pointer" @mouseover="hoveredPoint = { type: 'noise', v: p.v, t: p.t }" @mouseout="hoveredPoint = null"/>
              </template>
              <template v-if="selectedVisualization === 'bar'">
                <rect v-for="b in noiseBars" :key="`fs-n-bar-${b.i}`" :x="(b.x / svgWidth) * 1400" :y="(b.y / svgHeight) * 700" :width="(b.w / svgWidth) * 1400" :height="(b.h / svgHeight) * 700" rx="4" fill="#f59e0b" style="cursor: pointer" @mouseover="hoveredPoint = { type: 'noise', v: b.v, t: b.t }" @mouseout="hoveredPoint = null"/>
              </template>
            </svg>
            <div v-if="hoveredPoint?.type === 'noise'" class="fs-tooltip fs-tooltip-noise">
              <div class="fs-tooltip-value">{{ hoveredPoint.v?.toFixed(2) }} dB</div>
              <div class="fs-tooltip-time">{{ formatTs(hoveredPoint.t) }}</div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Header -->
    <div class="header">
      <div class="header-top">
        <h1 class="header-title">
          <i class="bi bi-graph-up"></i>
          Sensor Analytics Dashboard
        </h1>
        <div class="live-badge" :class="{ updating: loading }">
          <span class="pulse"></span>
          {{ loading ? 'Updating...' : 'Live' }}
        </div>
      </div>
      <p class="header-subtitle">Real-time monitoring and visualization of IoT sensors</p>
    </div>

    <!-- Controls -->
    <div class="panel">
      <div class="controls-grid">
        <div>
          <label class="label"><i class="bi bi-hdd"></i> Device ID</label>
          <input v-model="selectedDevice" type="text" class="input" placeholder="Enter device ID (e.g., 101, 102)" />
          <div class="help">
            <strong>Available devices:</strong>
            {{ availableDevices.length ? availableDevices.join(', ') : (loading ? 'Loading…' : '—') }}
          </div>
        </div>

        <div>
          <label class="label"><i class="bi bi-calendar"></i> Time Range</label>
          <select v-model="timeRange" class="input">
            <option value="1h">Last 1 Hour</option>
            <option value="6h">Last 6 Hours</option>
            <option value="24h">Last 24 Hours</option>
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
          </select>
        </div>

        <div>
          <label class="label"><i class="bi bi-clock"></i> Aggregation</label>
          <select v-model.number="bucketMinutes" class="input">
            <option :value="0">Raw Data</option>
            <option :value="1">1 Minute</option>
            <option :value="5">5 Minutes</option>
            <option :value="15">15 Minutes</option>
            <option :value="60">1 Hour</option>
          </select>
        </div>

        <div>
          <label class="label"><i class="bi bi-arrow-repeat"></i> Auto Refresh</label>
          <select v-model.number="refreshSeconds" class="input">
            <option :value="0">Off</option>
            <option :value="10">Every 10s</option>
            <option :value="30">Every 30s</option>
            <option :value="60">Every 60s</option>
          </select>
        </div>

        <div class="load-wrap">
          <button class="btn btn-primary" @click="loadChartData" :disabled="loading">
            <i :class="loading ? 'bi bi-hourglass-split' : 'bi bi-arrow-clockwise'"></i>
            {{ loading ? 'Loading…' : 'Load Data' }}
          </button>
        </div>
      </div>

      <div v-if="error" class="error">
        <i class="bi bi-exclamation-triangle"></i>
        <span>{{ error }}</span>
      </div>
    </div>

    <!-- Toolbar -->
    <div class="toolbar">
      <button class="tool-btn" :class="{ active: showStats }" @click="showStats = !showStats">
        <i class="bi bi-speedometer2"></i> Stats
      </button>
      <button class="tool-btn" :class="{ active: showGrid }" @click="showGrid = !showGrid">
        <i class="bi bi-grid-3x3"></i> Grid
      </button>
      <button class="tool-btn" @click="clearSelection" v-if="selectedPoints.length">
        <i class="bi bi-x-circle"></i> Clear ({{ selectedPoints.length }})
      </button>
      <div style="flex: 1;"></div>
      <span class="toolbar-info">💡 Click chart to fullscreen • Ctrl+Click points • Scroll to zoom</span>
    </div>

    <!-- Stats Cards -->
    <div v-if="chartData.length && showStats" class="stats-grid">
      <div class="stat stat-temp">
        <div class="stat-label"><i class="bi bi-thermometer-half"></i> Temperature</div>
        <div class="stat-value">{{ avgTemperature.toFixed(1) }}°C</div>
        <div class="stat-sub">Min: {{ minTemperature.toFixed(1) }}°C · Max: {{ maxTemperature.toFixed(1) }}°C</div>
      </div>

      <div class="stat stat-hum">
        <div class="stat-label"><i class="bi bi-droplet-half"></i> Humidity</div>
        <div class="stat-value">{{ avgHumidity.toFixed(1) }}%</div>
        <div class="stat-sub">Min: {{ minHumidity.toFixed(1) }}% · Max: {{ maxHumidity.toFixed(1) }}%</div>
      </div>

      <div class="stat stat-pres">
        <div class="stat-label"><i class="bi bi-speedometer2"></i> Pressure</div>
        <div class="stat-value">{{ (avgPressure / 1000).toFixed(2) }} kPa</div>
        <div class="stat-sub">Min: {{ (minPressure / 1000).toFixed(2) }} · Max: {{ (maxPressure / 1000).toFixed(2) }}</div>
      </div>

      <div class="stat stat-noise">
        <div class="stat-label"><i class="bi bi-soundwave"></i> Noise</div>
        <div class="stat-value">{{ avgNoise.toFixed(1) }} dB</div>
        <div class="stat-sub">Min: {{ minNoise.toFixed(1) }} dB · Max: {{ maxNoise.toFixed(1) }} dB</div>
      </div>

      <div class="stat stat-count">
        <div class="stat-label"><i class="bi bi-graph-up"></i> Data Points</div>
        <div class="stat-value">{{ chartData.length }}</div>
        <div class="stat-sub">Range: {{ timeRange }} · Bucket: {{ bucketMinutes ? `${bucketMinutes}m` : 'raw' }}</div>
      </div>
    </div>

    <!-- Visualization selector -->
    <div class="panel viz-panel" v-if="chartData.length">
      <div class="viz-title">Visualization Type:</div>
      <button
        v-for="viz in visualizationTypes"
        :key="viz.id"
        class="viz-btn"
        :class="{ active: selectedVisualization === viz.id }"
        @click="selectedVisualization = viz.id"
      >
        <span class="viz-num">{{ viz.number }}</span>
        <i :class="`bi ${viz.icon}`"></i>
        {{ viz.label }}
      </button>
    </div>

    <!-- Charts Grid with Axes -->
    <div v-if="chartData.length" class="charts-grid">
      <!-- Temperature Chart -->
      <div class="panel chart-panel">
        <div class="chart-header">
          <h3 class="chart-title"><i class="bi bi-thermometer-half"></i> Temperature Over Time</h3>
          <button class="btn-expand" @click="toggleFullscreen('temp')" title="Expand"><i class="bi bi-arrows-fullscreen"></i></button>
        </div>
        <div class="chart-wrap" @wheel="handleWheel" @mousedown="startPan">
          <svg :viewBox="`0 0 ${svgWidth} ${svgHeight}`">
            <g v-for="label in tempYLabels" :key="`ty-${label.y}`">
              <text :x="PADDING.left - 10" :y="label.y + 5" text-anchor="end" fill="#a0aec0" font-size="11">{{ label.value.toFixed(1) }}°C</text>
            </g>
            <g v-for="(label, idx) in xLabels" :key="`tx-${idx}`">
              <text :x="label.x" :y="PADDING.top + innerHeight + 20" text-anchor="middle" fill="#a0aec0" font-size="10" transform="translate(0,0)">{{ formatTs(label.time, true) }}</text>
            </g>
            <g v-if="showGrid" style="opacity: 0.08">
              <line v-for="i in 10" :key="`t-h-${i}`" :x1="PADDING.left" :y1="PADDING.top + (innerHeight / 10) * i" :x2="PADDING.left + innerWidth" :y2="PADDING.top + (innerHeight / 10) * i" stroke="white" stroke-width="1" />
              <line v-for="i in 10" :key="`t-v-${i}`" :x1="PADDING.left + (innerWidth / 10) * i" :y1="PADDING.top" :x2="PADDING.left + (innerWidth / 10) * i" :y2="PADDING.top + innerHeight" stroke="white" stroke-width="1" />
            </g>
            <line :x1="PADDING.left" :y1="PADDING.top" :x2="PADDING.left" :y2="PADDING.top + innerHeight" stroke="#4a5568" stroke-width="2" />
            <line :x1="PADDING.left" :y1="PADDING.top + innerHeight" :x2="PADDING.left + innerWidth" :y2="PADDING.top + innerHeight" stroke="#4a5568" stroke-width="2" />
            <path v-if="selectedVisualization === 'area'" :d="temperatureAreaPath" fill="#ef4444" style="opacity: 0.18" />
            <polyline v-if="selectedVisualization === 'line' || selectedVisualization === 'area'" :points="temperatureLinePoints" fill="none" stroke="#ef4444" stroke-width="2.5" />
            <template v-if="selectedVisualization === 'scatter' || selectedVisualization === 'line' || selectedVisualization === 'area'">
              <circle v-for="p in temperatureSeries" :key="`t-pt-${p.i}`" :cx="p.x" :cy="p.y" r="4" fill="#ef4444" style="cursor: pointer" @click.ctrl="togglePointSelection('temp', p.i, p.v, null, null, p.t, null)" @mouseover="hoveredPoint = { type: 'temp', v: p.v, t: p.t }" @mouseout="hoveredPoint = null" />
            </template>
            <template v-if="selectedVisualization === 'bar'">
              <rect v-for="b in tempBars" :key="`t-bar-${b.i}`" :x="b.x" :y="b.y" :width="b.w" :height="b.h" rx="3" fill="#ef4444" style="cursor: pointer" @mouseover="hoveredPoint = { type: 'temp', v: b.v, t: b.t }" @mouseout="hoveredPoint = null" />
            </template>
          </svg>
          <div v-if="hoveredPoint?.type === 'temp'" class="tooltip tooltip-temp">
            <div class="tooltip-value">{{ hoveredPoint.v?.toFixed(2) }}°C</div>
            <div class="tooltip-sub">{{ formatTs(hoveredPoint.t) }}</div>
          </div>
        </div>
      </div>

      <!-- Humidity Chart -->
      <div class="panel chart-panel">
        <div class="chart-header">
          <h3 class="chart-title"><i class="bi bi-droplet-half"></i> Humidity Over Time</h3>
          <button class="btn-expand" @click="toggleFullscreen('hum')" title="Expand"><i class="bi bi-arrows-fullscreen"></i></button>
        </div>
        <div class="chart-wrap" @wheel="handleWheel" @mousedown="startPan">
          <svg :viewBox="`0 0 ${svgWidth} ${svgHeight}`">
            <g v-for="label in humYLabels" :key="`hy-${label.y}`">
              <text :x="PADDING.left - 10" :y="label.y + 5" text-anchor="end" fill="#a0aec0" font-size="11">{{ label.value.toFixed(1) }}%</text>
            </g>
            <g v-for="(label, idx) in xLabels" :key="`hx-${idx}`">
              <text :x="label.x" :y="PADDING.top + innerHeight + 20" text-anchor="middle" fill="#a0aec0" font-size="10">{{ formatTs(label.time, true) }}</text>
            </g>
            <g v-if="showGrid" style="opacity: 0.08">
              <line v-for="i in 10" :key="`h-h-${i}`" :x1="PADDING.left" :y1="PADDING.top + (innerHeight / 10) * i" :x2="PADDING.left + innerWidth" :y2="PADDING.top + (innerHeight / 10) * i" stroke="white" stroke-width="1" />
              <line v-for="i in 10" :key="`h-v-${i}`" :x1="PADDING.left + (innerWidth / 10) * i" :y1="PADDING.top" :x2="PADDING.left + (innerWidth / 10) * i" :y2="PADDING.top + innerHeight" stroke="white" stroke-width="1" />
            </g>
            <line :x1="PADDING.left" :y1="PADDING.top" :x2="PADDING.left" :y2="PADDING.top + innerHeight" stroke="#4a5568" stroke-width="2" />
            <line :x1="PADDING.left" :y1="PADDING.top + innerHeight" :x2="PADDING.left + innerWidth" :y2="PADDING.top + innerHeight" stroke="#4a5568" stroke-width="2" />
            <path v-if="selectedVisualization === 'area'" :d="humidityAreaPath" fill="#3b82f6" style="opacity: 0.18" />
            <polyline v-if="selectedVisualization === 'line' || selectedVisualization === 'area'" :points="humidityLinePoints" fill="none" stroke="#3b82f6" stroke-width="2.5" />
            <template v-if="selectedVisualization === 'scatter' || selectedVisualization === 'line' || selectedVisualization === 'area'">
              <circle v-for="p in humiditySeries" :key="`h-pt-${p.i}`" :cx="p.x" :cy="p.y" r="4" fill="#3b82f6" style="cursor: pointer" @mouseover="hoveredPoint = { type: 'hum', v: p.v, t: p.t }" @mouseout="hoveredPoint = null" />
            </template>
            <template v-if="selectedVisualization === 'bar'">
              <rect v-for="b in humBars" :key="`h-bar-${b.i}`" :x="b.x" :y="b.y" :width="b.w" :height="b.h" rx="3" fill="#3b82f6" style="cursor: pointer" @mouseover="hoveredPoint = { type: 'hum', v: b.v, t: b.t }" @mouseout="hoveredPoint = null" />
            </template>
          </svg>
          <div v-if="hoveredPoint?.type === 'hum'" class="tooltip tooltip-hum">
            <div class="tooltip-value">{{ hoveredPoint.v?.toFixed(2) }}%</div>
            <div class="tooltip-sub">{{ formatTs(hoveredPoint.t) }}</div>
          </div>
        </div>
      </div>

      <!-- Pressure Chart -->
      <div class="panel chart-panel">
        <div class="chart-header">
          <h3 class="chart-title"><i class="bi bi-speedometer2"></i> Pressure Over Time</h3>
          <button class="btn-expand" @click="toggleFullscreen('pres')" title="Expand"><i class="bi bi-arrows-fullscreen"></i></button>
        </div>
        <div class="chart-wrap" @wheel="handleWheel" @mousedown="startPan">
          <svg :viewBox="`0 0 ${svgWidth} ${svgHeight}`">
            <g v-for="label in presYLabels" :key="`py-${label.y}`">
              <text :x="PADDING.left - 10" :y="label.y + 5" text-anchor="end" fill="#a0aec0" font-size="11">{{ (label.value / 1000).toFixed(2) }} kPa</text>
            </g>
            <g v-for="(label, idx) in xLabels" :key="`px-${idx}`">
              <text :x="label.x" :y="PADDING.top + innerHeight + 20" text-anchor="middle" fill="#a0aec0" font-size="10">{{ formatTs(label.time, true) }}</text>
            </g>
            <g v-if="showGrid" style="opacity: 0.08">
              <line v-for="i in 10" :key="`p-h-${i}`" :x1="PADDING.left" :y1="PADDING.top + (innerHeight / 10) * i" :x2="PADDING.left + innerWidth" :y2="PADDING.top + (innerHeight / 10) * i" stroke="white" stroke-width="1" />
              <line v-for="i in 10" :key="`p-v-${i}`" :x1="PADDING.left + (innerWidth / 10) * i" :y1="PADDING.top" :x2="PADDING.left + (innerWidth / 10) * i" :y2="PADDING.top + innerHeight" stroke="white" stroke-width="1" />
            </g>
            <line :x1="PADDING.left" :y1="PADDING.top" :x2="PADDING.left" :y2="PADDING.top + innerHeight" stroke="#4a5568" stroke-width="2" />
            <line :x1="PADDING.left" :y1="PADDING.top + innerHeight" :x2="PADDING.left + innerWidth" :y2="PADDING.top + innerHeight" stroke="#4a5568" stroke-width="2" />
            <path v-if="selectedVisualization === 'area'" :d="pressureAreaPath" fill="#10b981" style="opacity: 0.18" />
            <polyline v-if="selectedVisualization === 'line' || selectedVisualization === 'area'" :points="pressureLinePoints" fill="none" stroke="#10b981" stroke-width="2.5" />
            <template v-if="selectedVisualization === 'scatter' || selectedVisualization === 'line' || selectedVisualization === 'area'">
              <circle v-for="p in pressureSeries" :key="`p-pt-${p.i}`" :cx="p.x" :cy="p.y" r="4" fill="#10b981" style="cursor: pointer" @mouseover="hoveredPoint = { type: 'pres', v: p.v, t: p.t }" @mouseout="hoveredPoint = null" />
            </template>
            <template v-if="selectedVisualization === 'bar'">
              <rect v-for="b in presBars" :key="`p-bar-${b.i}`" :x="b.x" :y="b.y" :width="b.w" :height="b.h" rx="3" fill="#10b981" style="cursor: pointer" @mouseover="hoveredPoint = { type: 'pres', v: b.v, t: b.t }" @mouseout="hoveredPoint = null" />
            </template>
          </svg>
          <div v-if="hoveredPoint?.type === 'pres'" class="tooltip tooltip-pres">
            <div class="tooltip-value">{{ (hoveredPoint.v / 1000)?.toFixed(2) }} kPa</div>
            <div class="tooltip-sub">{{ formatTs(hoveredPoint.t) }}</div>
          </div>
        </div>
      </div>

      <!-- Noise Chart -->
      <div class="panel chart-panel">
        <div class="chart-header">
          <h3 class="chart-title"><i class="bi bi-soundwave"></i> Noise Over Time</h3>
          <button class="btn-expand" @click="toggleFullscreen('noise')" title="Expand"><i class="bi bi-arrows-fullscreen"></i></button>
        </div>
        <div class="chart-wrap" @wheel="handleWheel" @mousedown="startPan">
          <svg :viewBox="`0 0 ${svgWidth} ${svgHeight}`">
            <g v-for="label in noiseYLabels" :key="`ny-${label.y}`">
              <text :x="PADDING.left - 10" :y="label.y + 5" text-anchor="end" fill="#a0aec0" font-size="11">{{ label.value.toFixed(1) }} dB</text>
            </g>
            <g v-for="(label, idx) in xLabels" :key="`nx-${idx}`">
              <text :x="label.x" :y="PADDING.top + innerHeight + 20" text-anchor="middle" fill="#a0aec0" font-size="10">{{ formatTs(label.time, true) }}</text>
            </g>
            <g v-if="showGrid" style="opacity: 0.08">
              <line v-for="i in 10" :key="`n-h-${i}`" :x1="PADDING.left" :y1="PADDING.top + (innerHeight / 10) * i" :x2="PADDING.left + innerWidth" :y2="PADDING.top + (innerHeight / 10) * i" stroke="white" stroke-width="1" />
              <line v-for="i in 10" :key="`n-v-${i}`" :x1="PADDING.left + (innerWidth / 10) * i" :y1="PADDING.top" :x2="PADDING.left + (innerWidth / 10) * i" :y2="PADDING.top + innerHeight" stroke="white" stroke-width="1" />
            </g>
            <line :x1="PADDING.left" :y1="PADDING.top" :x2="PADDING.left" :y2="PADDING.top + innerHeight" stroke="#4a5568" stroke-width="2" />
            <line :x1="PADDING.left" :y1="PADDING.top + innerHeight" :x2="PADDING.left + innerWidth" :y2="PADDING.top + innerHeight" stroke="#4a5568" stroke-width="2" />
            <path v-if="selectedVisualization === 'area'" :d="noiseAreaPath" fill="#f59e0b" style="opacity: 0.18" />
            <polyline v-if="selectedVisualization === 'line' || selectedVisualization === 'area'" :points="noiseLinePoints" fill="none" stroke="#f59e0b" stroke-width="2.5" />
            <template v-if="selectedVisualization === 'scatter' || selectedVisualization === 'line' || selectedVisualization === 'area'">
              <circle v-for="p in noiseSeries" :key="`n-pt-${p.i}`" :cx="p.x" :cy="p.y" r="4" fill="#f59e0b" style="cursor: pointer" @click.ctrl="togglePointSelection('noise', p.i, null, null, null, p.t, p.v)" @mouseover="hoveredPoint = { type: 'noise', v: p.v, t: p.t }" @mouseout="hoveredPoint = null" />
            </template>
            <template v-if="selectedVisualization === 'bar'">
              <rect v-for="b in noiseBars" :key="`n-bar-${b.i}`" :x="b.x" :y="b.y" :width="b.w" :height="b.h" rx="3" fill="#f59e0b" style="cursor: pointer" @mouseover="hoveredPoint = { type: 'noise', v: b.v, t: b.t }" @mouseout="hoveredPoint = null" />
            </template>
          </svg>
          <div v-if="hoveredPoint?.type === 'noise'" class="tooltip tooltip-noise">
            <div class="tooltip-value">{{ hoveredPoint.v?.toFixed(2) }} dB</div>
            <div class="tooltip-sub">{{ formatTs(hoveredPoint.t) }}</div>
          </div>
        </div>
      </div>
    </div>

    <!-- Empty state -->
    <div v-else class="panel empty">
      <i class="bi bi-inbox empty-icon"></i>
      <p class="empty-text">No data available. Select a device and load data to begin.</p>
    </div>
  </div>
</template>

<style scoped>
.dashboard { background: linear-gradient(135deg, #1a1f3a 0%, #16213e 50%, #0f3460 100%); min-height: 100vh; padding: 20px; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
.header { background: linear-gradient(135deg, #2d5a8c 0%, #1a3a52 100%); padding: 24px; border-radius: 12px; margin-bottom: 20px; box-shadow: 0 8px 32px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.1); border: 1px solid #3d5a7f; }
.header-top { display: flex; justify-content: space-between; align-items: center; }
.header-title { color: #fff; margin: 0 0 10px 0; font-size: 32px; font-weight: 800; }
.header-subtitle { color: #a0aec0; margin: 0; }
.live-badge { display: flex; align-items: center; gap: 8px; padding: 8px 14px; background: rgba(34, 197, 94, 0.15); border: 1px solid #22c55e; border-radius: 20px; color: #22c55e; font-weight: 700; font-size: 12px; }
.live-badge.updating { background: rgba(249, 115, 22, 0.15); border-color: #f97316; color: #f97316; }
.pulse { display: inline-block; width: 8px; height: 8px; background: #22c55e; border-radius: 50%; animation: pulse 1.5s infinite; }
.live-badge.updating .pulse { background: #f97316; }
@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
.panel { background: linear-gradient(135deg, #2d3a5f 0%, #1f2948 100%); padding: 20px; border-radius: 12px; border: 1px solid #3d4a6f; box-shadow: 0 8px 32px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.1); margin-bottom: 20px; }
.controls-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(210px, 1fr)); gap: 15px; }
.label { color: #cbd5e0; font-weight: 700; display: block; margin-bottom: 8px; }
.input { width: 100%; padding: 10px 12px; background: linear-gradient(135deg, #1f2948 0%, #16213e 100%); color: #e2e8f0; border: 1px solid #3d4a6f; border-radius: 6px; font-size: 14px; outline: none; transition: all 0.3s ease; }
.input:focus { border-color: #5b9dd9; box-shadow: 0 0 12px rgba(91, 157, 217, 0.3); background: linear-gradient(135deg, #2d3a5f 0%, #1f2948 100%); }
.help { margin-top: 8px; color: #a0aec0; font-size: 12px; }
.load-wrap { display: flex; flex-direction: column; justify-content: flex-end; }
.btn { padding: 10px 16px; border: none; border-radius: 6px; font-weight: 700; cursor: pointer; display: inline-flex; align-items: center; justify-content: center; gap: 8px; transition: all 0.15s ease; }
.btn:disabled { opacity: 0.6; cursor: not-allowed; }
.btn-primary { background: #3182ce; color: #fff; }
.btn-primary:hover:not(:disabled) { background: #2563eb; box-shadow: 0 0 14px rgba(49, 130, 206, 0.45); transform: translateY(-1px); }
.error { margin-top: 15px; padding: 12px; background: #742a2a; border: 1px solid #9b2c2c; border-radius: 6px; color: #fc8181; display: flex; align-items: center; gap: 8px; }
.toolbar { display: flex; gap: 12px; align-items: center; padding: 12px 16px; background: linear-gradient(135deg, #2d3a5f 0%, #1f2948 100%); border: 1px solid #3d4a6f; border-radius: 10px; margin-bottom: 20px; flex-wrap: wrap; box-shadow: 0 4px 15px rgba(0,0,0,0.3); }
.tool-btn { padding: 6px 12px; background: #2d3748; color: #a0aec0; border: 1px solid #4a5568; border-radius: 5px; cursor: pointer; font-size: 12px; transition: all 0.2s ease; display: flex; align-items: center; gap: 6px; }
.tool-btn:hover { background: #3d4a5c; color: #e2e8f0; }
.tool-btn.active { background: #3182ce; color: #fff; border-color: #3182ce; }
.toolbar-info { font-size: 12px; color: #718096; }
.stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; margin-bottom: 20px; }
.stat { padding: 18px; border-radius: 10px; color: #fff; box-shadow: 0 4px 15px rgba(0,0,0,0.25); transition: all 0.2s ease; }
.stat:hover { transform: translateY(-2px); box-shadow: 0 8px 20px rgba(0,0,0,0.35); }
.stat-temp { background: linear-gradient(135deg, #dc3545 0%, #fd7e14 100%); }
.stat-hum { background: linear-gradient(135deg, #0dcaf0 0%, #0d6efd 100%); }
.stat-pres { background: linear-gradient(135deg, #20c997 0%, #198754 100%); }
.stat-noise { background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); }
.stat-count { background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); }
.stat-label { font-size: 14px; opacity: 0.9; margin-bottom: 8px; font-weight: 700; }
.stat-value { font-size: 30px; font-weight: 900; margin-bottom: 8px; }
.stat-sub { font-size: 12px; opacity: 0.85; }
.viz-panel { display: flex; flex-wrap: wrap; gap: 10px; align-items: center; }
.viz-title { color: #a0aec0; font-weight: 800; margin-right: 10px; }
.viz-btn { padding: 10px 14px; background: #2d3748; color: #fff; border: 1px solid #4a5568; border-radius: 8px; cursor: pointer; font-size: 13px; display: inline-flex; align-items: center; gap: 8px; transition: all 0.15s ease; }
.viz-btn:hover { box-shadow: 0 0 12px rgba(49, 130, 206, 0.45); transform: translateY(-1px); }
.viz-btn.active { background: #3182ce; border: 2px solid #63b3ed; font-weight: 800; }
.viz-num { background: rgba(0,0,0,0.25); padding: 2px 8px; border-radius: 4px; font-weight: 900; font-size: 12px; }
.charts-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(560px, 1fr)); gap: 20px; }
.chart-panel { transition: box-shadow 0.2s ease; }
.chart-panel:hover { box-shadow: 0 10px 30px rgba(0,0,0,0.5); }
.chart-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
.chart-title { color: #e2e8f0; margin: 0; font-size: 16px; font-weight: 800; }
.btn-expand { background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.2); padding: 6px 12px; border-radius: 6px; color: #fff; cursor: pointer; transition: all 0.2s; }
.btn-expand:hover { background: rgba(255,255,255,0.2); transform: scale(1.05); }
.chart-wrap { height: 350px; background: linear-gradient(135deg, #0f1419 0%, #1a1f3a 100%); border-radius: 8px; overflow: hidden; position: relative; cursor: grab; border: 1px solid #2d3a5f; }
.chart-wrap:active { cursor: grabbing; }
.tooltip { position: absolute; bottom: 18px; left: 18px; background: rgba(0,0,0,0.9); padding: 12px 16px; border-radius: 8px; border: 1px solid #4a5568; animation: slideIn 0.2s ease; pointer-events: none; }
@keyframes slideIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
.tooltip-value { font-size: 18px; font-weight: 800; margin-bottom: 4px; }
.tooltip-sub { font-size: 11px; opacity: 0.8; font-weight: 600; }
.tooltip-temp { color: #ef4444; border-color: rgba(239, 68, 68, 0.7); }
.tooltip-hum { color: #3b82f6; border-color: rgba(59, 130, 246, 0.7); }
.tooltip-pres { color: #10b981; border-color: rgba(16, 185, 129, 0.7); }
.tooltip-noise { color: #f59e0b; border-color: rgba(245, 158, 11, 0.7); }
.empty { padding: 60px; text-align: center; }
.empty-icon { font-size: 48px; color: #4a5568; display: block; margin-bottom: 18px; }
.empty-text { color: #a0aec0; font-size: 18px; margin: 0; }

/* Fullscreen overlay */
.fullscreen-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.95); z-index: 9999; display: flex; align-items: center; justify-content: center; animation: fadeIn 0.3s ease; }
@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
.fullscreen-chart-wrapper { width: 95%; max-width: 1600px; height: 90%; position: relative; }
.close-fullscreen { position: absolute; top: -40px; right: 0; background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.3); color: #fff; padding: 10px 16px; border-radius: 8px; cursor: pointer; font-size: 18px; transition: all 0.2s; z-index: 10000; }
.close-fullscreen:hover { background: rgba(255,255,255,0.2); transform: scale(1.1); }
.fullscreen-chart { width: 1000px; height: 1000px; background: linear-gradient(135deg, #1a1f3a 0%, #0f1419 100%); border-radius: 12px; padding: 30px; overflow: hidden; }
.fs-chart-title { color: #fff; font-size: 28px; margin-bottom: 20px; }
.fs-chart-wrap { height: calc(100% - 60px); position: relative; }
.fs-tooltip { position: absolute; bottom: 30px; left: 30px; background: rgba(0,0,0,0.9); padding: 16px 20px; border-radius: 10px; pointer-events: none; }
.fs-tooltip-temp { border: 2px solid #ef4444; }
.fs-tooltip-hum { border: 2px solid #3b82f6; }
.fs-tooltip-pres { border: 2px solid #10b981; }
.fs-tooltip-noise { border: 2px solid #f59e0b; }
.fs-tooltip-value { font-size: 32px; font-weight: 900; margin-bottom: 6px; }
.fs-tooltip-temp .fs-tooltip-value { color: #ef4444; }
.fs-tooltip-hum .fs-tooltip-value { color: #3b82f6; }
.fs-tooltip-pres .fs-tooltip-value { color: #10b981; }
.fs-tooltip-noise .fs-tooltip-value { color: #f59e0b; }
.fs-tooltip-time { font-size: 14px; color: #a0aec0; }
</style>