/ DocsPage.vue
<script setup>
const techStack = [
  {
    name: 'Robustel S5120',
    icon: 'bi-router',
    description: '5G Edge Computing Gateway for IoT connectivity and data processing',
    color: 'warning',
    link: 'https://www.robustel.com/en/products/5g-edge-computing-gateway/s5120'
  },
  {
    name: 'Robustel S6000U',
    icon: 'bi-thermometer-half',
    description: 'Multi-purpose sensor for temperature, humidity, and pressure monitoring',
    color: 'danger',
    link: 'https://www.robustel.com/en/products/iot-sensor/s6000u'
  },
  {
    name: 'Node-RED',
    icon: 'bi-diagram-3',
    description: 'Flow-based programming tool for wiring together IoT devices',
    color: 'danger',
    link: 'https://nodered.org/'
  },
  {
    name: 'InfluxDB',
    icon: 'bi-database',
    description: 'Time-series database for storing and querying sensor data',
    color: 'info',
    link: 'https://www.influxdata.com/'
  },
  {
    name: 'Grafana',
    icon: 'bi-bar-chart-line',
    description: 'Analytics and monitoring dashboard for data visualization',
    color: 'warning',
    link: 'https://grafana.com/'
  },
  {
    name: 'Docker',
    icon: 'bi-box-seam',
    description: 'Containerization platform for deploying applications',
    color: 'primary',
    link: 'https://www.docker.com/'
  },
  {
    name: 'FastAPI',
    icon: 'bi-lightning-charge-fill',
    description: 'Modern Python backend framework for building high-performance APIs',
    color: 'success',
    link: 'https://fastapi.tiangolo.com/'
  },
  {
    name: 'Random Forest ML',
    icon: 'bi-brain',
    description: 'Machine Learning algorithm for weather forecasting based on historical sensor data',
    color: 'info',
    link: 'https://scikit-learn.org/stable/modules/ensemble.html#forest'
  },
  {
    name: 'Vue.js 3',
    icon: 'bi-code-square',
    description: 'Progressive JavaScript framework for building interactive user interfaces',
    color: 'success',
    link: 'https://vuejs.org/'
  },
  {
    name: 'Bootstrap 5',
    icon: 'bi-bootstrap-fill',
    description: 'Powerful CSS framework for responsive and modern web design',
    color: 'purple',
    link: 'https://getbootstrap.com/'
  }
]

const iotKeyPoints = [
  {
    title: 'Real-Time Monitoring',
    description: 'Collect and analyze sensor data in real-time for immediate insights and decision-making.',
    icon: 'bi-speedometer2'
  },
  {
    title: 'Edge Computing',
    description: 'Process data closer to the source, reducing latency and bandwidth usage while improving response times.',
    icon: 'bi-cpu'
  },
  {
    title: 'Scalability',
    description: 'Easily add multiple sensors and devices to expand your monitoring network without infrastructure changes.',
    icon: 'bi-arrows-angle-expand'
  },
  {
    title: 'Data Analytics',
    description: 'Historical data analysis enables predictive maintenance and trend identification for better planning.',
    icon: 'bi-graph-up-arrow'
  },
  {
    title: 'Remote Access',
    description: 'Monitor and manage your IoT devices from anywhere with secure cloud connectivity.',
    icon: 'bi-globe'
  },
  {
    title: 'Energy Efficiency',
    description: 'Optimize resource usage with smart automation based on environmental conditions.',
    icon: 'bi-lightning-charge'
  }
]

const apiEndpoints = [
  {
    method: 'GET',
    endpoint: '/api/weather/forecast/',
    description: 'Retrieve weather data for the last 60 minutes',
    params: 'minutes=60'
  },
  {
    method: 'GET',
    endpoint: '/api/devices/',
    description: 'List all connected devices',
    params: 'None'
  },
  {
    method: 'POST',
    endpoint: '/api/weather/data/',
    description: 'Submit new sensor readings',
    params: 'JSON body with sensor data'
  }
]
</script>

<template>
  <div class="min-vh-100" style="background: linear-gradient(to bottom, #141e30 0%, #243b55 100%);">
    <div class="container py-5">
      <!-- Header -->
      <div class="text-center mb-5">
        <h1 class="display-4 text-white fw-bold mb-3">
          <i class="bi bi-book me-3"></i>
          Documentation
        </h1>
        <p class="lead text-white-50">
          Technical documentation and IoT insights for the Smart Park Project
        </p>
      </div>

      <!-- Technology Stack -->
      <div class="mb-5">
        <h2 class="text-white fw-bold mb-4">
          <i class="bi bi-stack me-2"></i>
          Technology Stack
        </h2>
        <div class="row g-4">
          <div 
            v-for="tech in techStack" 
            :key="tech.name"
            class="col-md-6 col-lg-4 col-xl-3"
          >
            <div class="card bg-dark border-0 shadow-lg h-100 tech-card">
              <div class="card-body text-center p-4">
                <div :class="`text-${tech.color} mb-3`">
                  <i :class="`${tech.icon} display-4`"></i>
                </div>
                <h5 class="card-title text-white fw-bold mb-3">{{ tech.name }}</h5>
                <p class="card-text text-white-50 small mb-3">{{ tech.description }}</p>
                <a 
                  :href="tech.link" 
                  target="_blank"
                  class="btn btn-outline-light btn-sm"
                >
                  <i class="bi bi-arrow-right-circle me-1"></i>
                  Learn More
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- IoT Key Points -->
      <div class="mb-5">
        <h2 class="text-white fw-bold mb-4">
          <i class="bi bi-lightbulb me-2"></i>
          Key IoT Concepts & Takeaways
        </h2>
        <div class="card bg-dark border-0 shadow-lg">
          <div class="card-body p-4">
            <div class="row g-4">
              <div 
                v-for="point in iotKeyPoints" 
                :key="point.title"
                class="col-md-6"
              >
                <div class="d-flex gap-3">
                  <div class="text-primary flex-shrink-0">
                    <i :class="`${point.icon} fs-2`"></i>
                  </div>
                  <div>
                    <h5 class="text-white fw-bold mb-2">{{ point.title }}</h5>
                    <p class="text-white-50 mb-0 small">{{ point.description }}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- API Documentation -->
      <div class="mb-5">
        <h2 class="text-white fw-bold mb-4">
          <i class="bi bi-code-slash me-2"></i>
          API Endpoints
        </h2>
        <div class="card bg-dark border-0 shadow-lg">
          <div class="card-body p-0">
            <div class="table-responsive">
              <table class="table table-dark table-hover mb-0">
                <thead>
                  <tr>
                    <th>Method</th>
                    <th>Endpoint</th>
                    <th>Description</th>
                    <th>Parameters</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="api in apiEndpoints" :key="api.endpoint">
                    <td>
                      <span 
                        :class="[
                          'badge',
                          api.method === 'GET' ? 'bg-success' : 'bg-primary'
                        ]"
                      >
                        {{ api.method }}
                      </span>
                    </td>
                    <td><code class="text-warning">{{ api.endpoint }}</code></td>
                    <td class="text-white-50">{{ api.description }}</td>
                    <td class="text-white-50 small">{{ api.params }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      <!-- Hardware Setup -->
      <div class="mb-5">
        <h2 class="text-white fw-bold mb-4">
          <i class="bi bi-diagram-3 me-2"></i>
          Hardware Setup Guide
        </h2>
        <div class="row g-4">
          <div class="col-lg-6">
            <div class="card bg-dark border-0 shadow-lg h-100">
              <div class="card-body p-4">
                <h5 class="card-title text-white fw-bold mb-3">
                  <i class="bi bi-router text-warning me-2"></i>
                  Robustel S5120 Edge Gateway
                </h5>
                <ul class="text-white-50 mb-3">
                  <li>5G connectivity with edge computing capabilities</li>
                  <li>Multiple connectivity options (Ethernet, Wi-Fi, Cellular)</li>
                  <li>Industrial-grade design for harsh environments</li>
                  <li>Built-in security features and VPN support</li>
                </ul>
                <a 
                  href="https://www.robustel.com/en/products/5g-edge-computing-gateway/s5120" 
                  target="_blank"
                  class="btn btn-warning w-100"
                >
                  <i class="bi bi-box-arrow-up-right me-2"></i>
                  View Specifications
                </a>
              </div>
            </div>
          </div>

          <div class="col-lg-6">
            <div class="card bg-dark border-0 shadow-lg h-100">
              <div class="card-body p-4">
                <h5 class="card-title text-white fw-bold mb-3">
                  <i class="bi bi-thermometer-half text-info me-2"></i>
                  Robustel S6000U Multi-Purpose Sensor
                </h5>
                <ul class="text-white-50 mb-3">
                  <li>Temperature, humidity, and pressure monitoring</li>
                  <li>Long battery life with low power consumption</li>
                  <li>Wireless connectivity (LoRaWAN/NB-IoT)</li>
                  <li>IP67 waterproof rating for outdoor use</li>
                </ul>
                <a 
                  href="https://www.robustel.com/en/products/iot-sensor/s6000u" 
                  target="_blank"
                  class="btn btn-info w-100"
                >
                  <i class="bi bi-box-arrow-up-right me-2"></i>
                  View Resource Guide
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Quick Start -->
      <div>
        <h2 class="text-white fw-bold mb-4">
          <i class="bi bi-rocket-takeoff me-2"></i>
          Quick Start Guide
        </h2>
        <div class="card bg-dark border-0 shadow-lg">
          <div class="card-body p-4">
            <div class="row">
              <div class="col-md-6 mb-4">
                <div class="d-flex align-items-start gap-3">
                  <div class="badge bg-primary rounded-circle p-3">
                    <span class="fs-5">1</span>
                  </div>
                  <div>
                    <h6 class="text-white fw-bold">Configure Hardware</h6>
                    <p class="text-white-50 small mb-0">Set up your Robustel gateway and sensors according to the manufacturer's instructions.</p>
                  </div>
                </div>
              </div>
              <div class="col-md-6 mb-4">
                <div class="d-flex align-items-start gap-3">
                  <div class="badge bg-primary rounded-circle p-3">
                    <span class="fs-5">2</span>
                  </div>
                  <div>
                    <h6 class="text-white fw-bold">Connect to Network</h6>
                    <p class="text-white-50 small mb-0">Ensure devices are connected to the network and can communicate with the API.</p>
                  </div>
                </div>
              </div>
              <div class="col-md-6 mb-4">
                <div class="d-flex align-items-start gap-3">
                  <div class="badge bg-primary rounded-circle p-3">
                    <span class="fs-5">3</span>
                  </div>
                  <div>
                    <h6 class="text-white fw-bold">Start Monitoring</h6>
                    <p class="text-white-50 small mb-0">Access the dashboard to view real-time data from all connected devices.</p>
                  </div>
                </div>
              </div>
              <div class="col-md-6 mb-4">
                <div class="d-flex align-items-start gap-3">
                  <div class="badge bg-primary rounded-circle p-3">
                    <span class="fs-5">4</span>
                  </div>
                  <div>
                    <h6 class="text-white fw-bold">Analyze Data</h6>
                    <p class="text-white-50 small mb-0">Use the built-in tools to analyze trends and optimize your IoT deployment.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.tech-card {
  transition: transform 0.3s ease;
  cursor: pointer;
}

.tech-card:hover {
  transform: translateY(-10px);
}

.text-purple {
  color: #6f42c1 !important;
}

code {
  background-color: rgba(255, 255, 255, 0.1);
  padding: 2px 6px;
  border-radius: 4px;
}

.table-dark {
  --bs-table-bg: transparent;
}

.badge.rounded-circle {
  width: 50px;
  height: 50px;
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>