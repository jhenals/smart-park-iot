<script setup>
import { ref } from 'vue';

const hoveredIndex = ref(null);
const selectedMember = ref(null);

const showDetails = (member) => {
  selectedMember.value = member;
};

const closeModal = () => {
  selectedMember.value = null;
};

const members = [
  { 
    id: 1, 
    name: "Sisay Desalegn", 
    role: "Sensor & External Data APIs", 
    responsibilities: "Setup and Configuration of S6000U/EG120. Implementing the 'Virtual Sensor' logic to fetch External Weather API data for the system.",
    color: "#FF6B6B" 
  },
  { 
    id: 2, 
    name: "Yonas Yifter", 
    role: "Node-Red Orchestration", 
    responsibilities: "Managing data flows between Sensor, Weather APIs, DB, and ML models. The 'Spine' implementation.",
    color: "#4ECDC4" 
  },
  { 
    id: 3, 
    name: "Zakariye Hassan", 
    role: "Database Architecture", 
    responsibilities: "Schema design for sensor data. Designing the storage structure for User GPS coordinates and historical weather logs.",
    color: "#45B7D1" 
  },
  { 
    id: 4, 
    name: "Meron Temesgen", 
    role: "Data Visualization", 
    responsibilities: "Grafana dashboard creation. Visualizing the 'Local Sensor Data', 'Forecasted Weather Data' and 'main parameters of visitors'.",
    color: "#FFA07A" 
  },
  { 
    id: 5, 
    name: "Jhena Subol", 
    role: "Web Development & GPS", 
    responsibilities: "Frontend creation. Implementing the HTML5 Geolocation API to capture and display User GPS location on the park map.",
    color: "#98D8C8" 
  },
  { 
    id: 6, 
    name: "Husayn Ismail", 
    role: "ML (Recommendation)", 
    responsibilities: "Developing the Random Forest model for trail tagging and Content-Based Filtering algorithms.",
    color: "#F7B731" 
  },
  { 
    id: 7, 
    name: "Rima Kasem", 
    role: "ML (Chatbot)", 
    responsibilities: "Developing the RAG pipeline, Web Scraping for park info, and LLM integration.",
    color: "#A29BFE" 
  }
];
</script>

<template>
  <div class="container-fluid">
    <div class="content-wrapper">
      <div class="header-section">
        <h1 class="main-title">Group Members</h1>
        <p class="subtitle">Meet our amazing team of professionals</p>
      </div>

      <div class="members-list">
        <div
          v-for="(member, index) in members"
          :key="member.id"
          class="member-row"
          :class="{ 'hovered': hoveredIndex === index }"
          :style="{ borderLeftColor: hoveredIndex === index ? member.color : 'transparent' }"
          @mouseenter="hoveredIndex = index"
          @mouseleave="hoveredIndex = null"
          @click="showDetails(member)"
        >
          <div class="member-number">{{ index + 1 }}</div>
          
          <div 
            class="avatar"
            :style="{ 
              background: `linear-gradient(135deg, ${member.color}, ${member.color}dd)`,
              boxShadow: `0 5px 15px ${member.color}66`
            }"
          >
            {{ member.name.charAt(0) }}
          </div>
          
          <div class="member-info">
            <h3 class="member-name">{{ member.name }}</h3>
            <p class="member-role" :style="{ color: member.color }">
              {{ member.role }}
            </p>
            <p class="member-responsibilities">
              {{ member.responsibilities }}
            </p>
          </div>

          <div class="member-badge" :style="{ background: member.color }">
            Team Member
          </div>
        </div>
      </div>

      <!-- Modal Popup -->
      <div v-if="selectedMember" class="modal-overlay" @click="closeModal">
        <div class="modal-content" @click.stop>
          <button class="close-button" @click="closeModal">&times;</button>
          
          <div class="modal-header">
            <div 
              class="modal-avatar"
              :style="{ 
                background: `linear-gradient(135deg, ${selectedMember.color}, ${selectedMember.color}dd)`,
                boxShadow: `0 10px 25px ${selectedMember.color}66`
              }"
            >
              {{ selectedMember.name.charAt(0) }}
            </div>
            <div>
              <h2 class="modal-name">{{ selectedMember.name }}</h2>
              <p class="modal-role" :style="{ color: selectedMember.color }">
                {{ selectedMember.role }}
              </p>
            </div>
          </div>

          <div class="modal-body">
            <h3 class="section-title">Technical Responsibilities</h3>
            <p class="modal-responsibilities">{{ selectedMember.responsibilities }}</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.container-fluid {
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 40px 20px;
  font-family: "Times New Roman", Times, serif;
}

.content-wrapper {
  max-width: 1200px;
  margin: 0 auto;
}

.header-section {
  text-align: center;
  margin-bottom: 50px;
  animation: fadeIn 1s ease-in;
}

.main-title {
  font-size: 3rem;
  color: white;
  margin-bottom: 10px;
  text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.3);
  font-weight: bold;
}

.subtitle {
  font-size: 1.2rem;
  color: rgba(255, 255, 255, 0.9);
  text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.2);
}

.members-list {
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.member-row {
  background: rgba(255, 255, 255, 0.95);
  border-radius: 12px;
  padding: 25px 30px;
  display: flex;
  align-items: center;
  gap: 25px;
  box-shadow: 0 5px 15px rgba(0, 0, 0, 0.2);
  transform: translateX(0);
  transition: all 0.3s ease;
  cursor: pointer;
  border-left: 5px solid transparent;
}

.member-row.hovered {
  background: white;
  box-shadow: 0 15px 35px rgba(0, 0, 0, 0.3);
  transform: translateX(10px) scale(1.02);
  animation: flash 0.5s ease;
}

.member-number {
  font-size: 1.8rem;
  font-weight: bold;
  color: #95a5a6;
  min-width: 40px;
  text-align: center;
  transition: all 0.3s ease;
}

.member-row.hovered .member-number {
  color: #2d3436;
  transform: scale(1.2);
}

.avatar {
  width: 70px;
  height: 70px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.8rem;
  color: white;
  font-weight: bold;
  transform: rotate(0deg);
  transition: transform 0.6s ease;
  flex-shrink: 0;
}

.member-row.hovered .avatar {
  transform: rotate(360deg);
}

.member-info {
  flex: 1;
  min-width: 0;
}

.member-name {
  font-size: 1.6rem;
  color: #2d3436;
  margin: 0 0 5px 0;
  font-weight: 600;
}

.member-role {
  font-size: 1rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin: 0 0 10px 0;
}

.member-responsibilities {
  font-size: 0.95rem;
  color: #636e72;
  line-height: 1.5;
  margin: 0;
  opacity: 0.9;
}

.member-badge {
  padding: 8px 20px;
  border-radius: 20px;
  color: white;
  font-weight: 600;
  font-size: 0.85rem;
  text-transform: uppercase;
  letter-spacing: 1px;
  opacity: 0;
  transform: translateX(-20px);
  transition: all 0.3s ease;
  flex-shrink: 0;
}

.member-row.hovered .member-badge {
  opacity: 1;
  transform: translateX(0);
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(-20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes flash {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.7;
  }
}

@media (max-width: 992px) {
  .member-row {
    padding: 20px 20px;
    gap: 20px;
  }

  .member-name {
    font-size: 1.4rem;
  }

  .member-responsibilities {
    font-size: 0.9rem;
  }
}

@media (max-width: 768px) {
  .member-row {
    padding: 20px 15px;
    gap: 15px;
    flex-wrap: wrap;
  }

  .member-number {
    font-size: 1.4rem;
    min-width: 30px;
  }

  .avatar {
    width: 60px;
    height: 60px;
    font-size: 1.5rem;
  }

  .member-info {
    flex: 1 1 100%;
    order: 3;
  }

  .member-name {
    font-size: 1.3rem;
  }

  .member-responsibilities {
    font-size: 0.85rem;
  }

  .member-badge {
    display: none;
  }
}

/* Modal Styles */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  animation: fadeIn 0.3s ease;
}

.modal-content {
  background: white;
  border-radius: 15px;
  padding: 40px;
  max-width: 600px;
  width: 90%;
  max-height: 80vh;
  overflow-y: auto;
  position: relative;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  animation: slideUp 0.3s ease;
}

.close-button {
  position: absolute;
  top: 15px;
  right: 15px;
  background: none;
  border: none;
  font-size: 2.5rem;
  color: #95a5a6;
  cursor: pointer;
  transition: color 0.3s ease;
  line-height: 1;
  padding: 0;
  width: 40px;
  height: 40px;
}

.close-button:hover {
  color: #2d3436;
}

.modal-header {
  display: flex;
  align-items: center;
  gap: 25px;
  margin-bottom: 30px;
  padding-bottom: 20px;
  border-bottom: 2px solid #f0f0f0;
}

.modal-avatar {
  width: 90px;
  height: 90px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 2.5rem;
  color: white;
  font-weight: bold;
  flex-shrink: 0;
}

.modal-name {
  font-size: 2rem;
  color: #2d3436;
  margin: 0 0 5px 0;
  font-weight: 600;
}

.modal-role {
  font-size: 1.1rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin: 0;
}

.modal-body {
  padding-top: 10px;
}

.section-title {
  font-size: 1.4rem;
  color: #2d3436;
  margin: 0 0 15px 0;
  font-weight: 600;
}

.modal-responsibilities {
  font-size: 1.1rem;
  color: #636e72;
  line-height: 1.8;
  margin: 0;
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(50px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>