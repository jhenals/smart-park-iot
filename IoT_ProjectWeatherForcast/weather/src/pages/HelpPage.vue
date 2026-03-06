/ HelpPage.vue
<script setup>
const helpTopics = [
  {
    icon: 'bi-question-circle-fill',
    title: 'Getting Started',
    description: 'Learn the basics of using the IoT Smart Park weather monitoring system.',
    color: 'primary'
  },
  {
    icon: 'bi-gear-fill',
    title: 'Device Configuration',
    description: 'Configure and manage your Robustel S5120 Edge Gateway and S6000U sensors.',
    color: 'success'
  },
  {
    icon: 'bi-graph-up',
    title: 'Data Monitoring',
    description: 'View real-time weather data and analyze historical trends.',
    color: 'info'
  },
  {
    icon: 'bi-exclamation-triangle-fill',
    title: 'Troubleshooting',
    description: 'Common issues and their solutions for optimal system performance.',
    color: 'warning'
  }
]

const externalResources = [
  {
    title: 'Università della Calabria - Telecommunication Engineering',
    description: 'Visit the official university department website',
    url: 'https://www.unical.it',
    icon: 'bi-building',
    color: 'primary'
  },
  {
    title: 'Robustel S5120 Edge Gateway',
    description: 'Official documentation and specifications for the S5120 gateway',
    url: 'https://www.robustel.com/en/products/5g-edge-computing-gateway/s5120',
    icon: 'bi-router',
    color: 'success'
  },
  {
    title: 'Robustel S6000U Multi-Purpose Sensor',
    description: 'Resource guide and technical specifications',
    url: 'https://www.robustel.com/en/products/iot-sensor/s6000u',
    icon: 'bi-thermometer-half',
    color: 'info'
  }
]

const faqs = [
  {
    question: 'How do I add a new device?',
    answer: 'New devices are automatically detected when they start sending data to the API endpoint. Ensure your device is properly configured with the correct API URL.'
  },
  {
    question: 'Why is my device showing "No data"?',
    answer: 'This usually means the device hasn\'t sent data in the last 60 minutes. Check your device connection, power supply, and network connectivity.'
  },
  {
    question: 'How often does the data refresh?',
    answer: 'The dashboard automatically refreshes every 15 seconds to display the latest sensor readings from all connected devices.'
  },
  {
    question: 'Can I export the data?',
    answer: 'Yes, you can access the raw data through the API endpoint at /api/weather/forecast/ and export it in JSON format.'
  }
]
</script>

<template>
  <div class="min-vh-100" style="background: linear-gradient(to bottom, #0f2027 0%, #203a43 50%, #2c5364 100%);">
    <div class="container py-5">
      <!-- Header -->
      <div class="text-center mb-5">
        <h1 class="display-4 text-white fw-bold mb-3">
          <i class="bi bi-question-circle me-3"></i>
          Help Center
        </h1>
        <p class="lead text-white-50">
          Everything you need to know about the IoT Smart Park Project
        </p>
      </div>

      <!-- Search Bar -->
      <div class="row justify-content-center mb-5">
        <div class="col-lg-8">
          <div class="card bg-dark border-0 shadow-lg">
            <div class="card-body p-4">
              <div class="input-group input-group-lg">
                <span class="input-group-text bg-primary border-0">
                  <i class="bi bi-search text-white"></i>
                </span>
                <input 
                  type="text" 
                  class="form-control bg-dark text-white border-0" 
                  placeholder="Search for help topics..."
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Help Topics Grid -->
      <div class="row g-4 mb-5">
        <div 
          v-for="topic in helpTopics" 
          :key="topic.title"
          class="col-md-6 col-lg-3"
        >
          <div class="card bg-dark border-0 shadow-lg h-100 help-card">
            <div class="card-body text-center p-4">
              <div :class="`text-${topic.color} mb-3`">
                <i :class="`${topic.icon} display-4`"></i>
              </div>
              <h5 class="card-title text-white fw-bold mb-3">{{ topic.title }}</h5>
              <p class="card-text text-white-50 small">{{ topic.description }}</p>
              <button :class="`btn btn-outline-${topic.color} btn-sm mt-2`">
                Learn More
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- External Resources -->
      <div class="mb-5">
        <h2 class="text-white fw-bold mb-4">
          <i class="bi bi-link-45deg me-2"></i>
          External Resources
        </h2>
        <div class="row g-4">
          <div 
            v-for="resource in externalResources" 
            :key="resource.title"
            class="col-lg-4"
          >
            <div class="card bg-dark border-0 shadow-lg h-100 resource-card">
              <div class="card-body p-4">
                <div :class="`text-${resource.color} mb-3`">
                  <i :class="`${resource.icon} fs-1`"></i>
                </div>
                <h5 class="card-title text-white fw-bold mb-2">{{ resource.title }}</h5>
                <p class="card-text text-white-50 small mb-4">{{ resource.description }}</p>
                <a 
                  :href="resource.url" 
                  target="_blank"
                  :class="`btn btn-${resource.color} w-100`"
                >
                  <i class="bi bi-box-arrow-up-right me-2"></i>
                  Visit Website
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- FAQs -->
      <div>
        <h2 class="text-white fw-bold mb-4">
          <i class="bi bi-chat-dots me-2"></i>
          Frequently Asked Questions
        </h2>
        <div class="accordion" id="faqAccordion">
          <div 
            v-for="(faq, index) in faqs" 
            :key="index"
            class="accordion-item bg-dark border-0 mb-3"
          >
            <h2 class="accordion-header">
              <button 
                class="accordion-button bg-dark text-white collapsed" 
                type="button" 
                :data-bs-toggle="`collapse`" 
                :data-bs-target="`#faq${index}`"
              >
                {{ faq.question }}
              </button>
            </h2>
            <div 
              :id="`faq${index}`" 
              class="accordion-collapse collapse" 
              data-bs-parent="#faqAccordion"
            >
              <div class="accordion-body text-white-50">
                {{ faq.answer }}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.help-card {
  transition: transform 0.3s ease, box-shadow 0.3s ease;
  cursor: pointer;
}

.help-card:hover {
  transform: translateY(-10px);
  box-shadow: 0 15px 40px rgba(0, 0, 0, 0.5) !important;
}

.resource-card {
  transition: transform 0.3s ease;
}

.resource-card:hover {
  transform: translateY(-5px);
}

.accordion-button:not(.collapsed) {
  background-color: #0d6efd !important;
  color: white !important;
}

.accordion-button::after {
  filter: brightness(0) invert(1);
}
</style>

