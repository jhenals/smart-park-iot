# 🌲 SmartPark IoT

### Environmental Monitoring System for **I Giganti della Sila – Riserva Naturale Biogenetica di Fallistro**

![Docker](https://img.shields.io/badge/Docker-2496ED?style=flat&logo=docker&logoColor=white)
![Python](https://img.shields.io/badge/Python-3776AB?style=flat&logo=python&logoColor=white)
![FastAPI](https://img.shields.io/badge/FastAPI-009688?style=flat&logo=fastapi&logoColor=white)
![Vue.js](https://img.shields.io/badge/Vue.js-4FC08D?style=flat&logo=vuedotjs&logoColor=white)
![InfluxDB](https://img.shields.io/badge/InfluxDB-22ADF6?style=flat&logo=influxdb&logoColor=white)
![Firebase](https://img.shields.io/badge/Firebase-FFCA28?style=flat&logo=firebase&logoColor=black)
![Nginx](https://img.shields.io/badge/Nginx-009639?style=flat&logo=nginx&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-339933?style=flat&logo=nodedotjs&logoColor=white)

---

SmartPark IoT is a full-stack Internet of Things (IoT) system developed as part of an **IoT university course project**. The system focuses on **real-time environmental monitoring** and **visitor support** for **I Giganti della Sila – Riserva Naturale Biogenetica di Fallistro**, a protected ancient forest located in **Sila National Park**, Calabria, Italy.

The reserve contains **58 monumental Laricio pine trees (*Pinus nigra* subsp. *laricio*)**, some over **350 years old** and reaching heights of **up to 45 metres**. The area is managed by **FAI – Fondo Ambiente Italiano** and represents one of the most ecologically significant forest ecosystems in southern Italy.

The platform integrates **IoT sensing devices, environmental data collection, backend services, a visitor-facing web application**, and an **administrative monitoring dashboard**.

---

## 📋 Table of Contents

- [Project Overview](#-project-overview)
- [System Architecture](#-system-architecture)
- [Repository Structure](#-repository-structure)
- [Technology Stack](#-technology-stack)
- [Prerequisites](#-prerequisites)
- [Getting Started](#-getting-started)
- [Environment Variables](#-environment-variables)
- [Services & Ports](#-services--ports)
- [Project Modules](#-project-modules)
- [API Reference](#-api-reference)
- [Project Contributions](#-project-contributions)
- [Troubleshooting](#-troubleshooting)
- [License](#-license)
- [About the Reserve](#-about-the-reserve)

---

## 🌍 Project Overview

The SmartPark IoT platform collects **environmental and meteorological data from IoT sensors deployed across the reserve**. Sensor readings are ingested by a backend API, stored in a time-series database, and made accessible through two dedicated interfaces.

### Key Features

- 📡 **Real-time sensor data ingestion** from IoT devices deployed in the field
- 🌡️ **Environmental monitoring** — temperature, humidity, air quality, and weather conditions
- 🗺️ **Trail recommendations** based on live weather data and visitor preferences
- 🔐 **User authentication** via Firebase for personalised visitor experience
- 📊 **Administrative dashboard** for park staff to monitor system and sensor status
- 📈 **Time-series visualisation** via Grafana for historical data analysis

---

## 🏗 System Architecture

The system follows a **two-tier architecture**: an **Edge Tier** (sensors and gateway with on-device ML inference),and a **Cloud Tier** (remote management, cloud sync, and web applications).

```
╔══════════════════════════════════════════════════════════════╗
║                        EDGE TIER                             ║
║                                                              ║
║   S6000U Sensor  ──(Modbus RTU / RS485)──►  Robustel EG5120 ║
║   (Temp, Humidity, Pressure, Light,          │               ║
║    Noise, ToF, GPS)                          │ App Center    ║
║                                              ├─ Node-RED     ║
║                                              │   (orchestration,║
║                                              │    Modbus poll,  ║
║                                              │    GPS parsing,  ║
║                                              │    ML exec)      ║
║                                              ├─ InfluxDB     ║
║                                              │   (local time-║
║                                              │    series DB) ║
║                                              ├─ Grafana      ║
║                                              │   (on-device  ║
║                                              │    dashboard) ║
║                                              └─ 
╚══════════════════════════════╤═══════════════════════════════╝
                               │ HTTPS / 4G-5G Cellular
╔══════════════════════════════▼═══════════════════════════════╗
║                        CLOUD TIER                            ║
║                                                              ║
║  ┌─────────────────┐        ┌──────────────────────────┐    ║
║  │  InfluxDB Cloud │        │  Firebase Firestore       │    ║
║  │  (AWS region)   │        │  - User auth & prefs      │    ║
║  │  Long-term      │        │  - Trail tags & metadata  │    ║
║  │  telemetry      │        │  - Recommendations        │    ║
║  └────────┬────────┘        └──────────┬───────────────┘    ║
║           │                            │                     ║
║           ▼                            ▼                     ║
║  ┌──────────────────────────────────────────────────────┐    ║
║  │               FastAPI Backend                        │    ║
║  │  - Data ingestion & validation                       │    ║
║  │  - REST endpoints for both frontends                 │    ║
║  └──────────────┬───────────────────────────────────────┘    ║
║                 │                                            ║
║      ┌──────────┴──────────┐                                 ║
║      ▼                     ▼                                 ║
║  ┌───────────────┐   ┌──────────────────────────────────┐   ║
║  │ Admin Dashboard│   │     Visitor Web Application       │   ║
║  │ (Vue.js 3)    │   │     (HTML5 / CSS3 / Vanilla JS)   │   ║
║  │               │   │                                   │   ║
║  │ - Station map │   │  - Weather dashboard              │   ║
║  │ - Live sensor │   │  - Interactive map (Leaflet.js)   │   ║
║  │   readings    │   │  - Firebase Auth                  │   ║
║  │ - Historical  │   │  - Trail recommendations (CBF)    │   ║
║  │   trends      │   │  
║  │ - RAG Chatbot │   │                                   │   ║
║  └───────────────┘   └──────────────┬────────────────────┘   ║
║                                     │                        ║
║                             ┌───────▼──────────┐            ║
║                             │  ML Engine        │            ║
║                             │  (Node.js/Express)│            ║
║                             │  Content-Based    │            ║
║                             │  Filtering (CBF)  │            ║
║                             └───────────────────┘            ║
╚══════════════════════════════════════════════════════════════╝
```

### Architecture Layers

**1. Hardware Layer** — The Robustel EG5120 (ARM Cortex-A7, 512 MB RAM, 4G LTE) acts as the central edge computing hub. The S6000U multi-purpose sensor connects via RS485/Modbus RTU and measures temperature, humidity, pressure, light, noise, ToF distance, and orientation.

**2. Edge Processing Layer** — Node-RED runs on the EG5120 and orchestrates the entire local pipeline: it polls the S6000U every 60 seconds via Modbus, parses GPS NMEA sentences, runs the Random Forest predictor (`predictor.py`) via an exec node, fuses sensor + GPS + ML results, writes to local InfluxDB, and syncs to the cloud.

**3. ML Inference (Edge)** — A Random Forest multi-label classifier trained on one year of historical weather data from Open-Meteo classifies current conditions into "Weather Vibe" categories (Frosty, Brisk, Crisp, Moody, Serene, Sun-Drenched). The model runs directly on the EG5120 and pushes trail tags to Firebase Firestore.

**4. Storage Layer** — Local InfluxDB on the gateway provides edge buffering. InfluxDB Cloud (AWS) stores long-term telemetry. Firebase Firestore holds user data, trail metadata, and recommendation outputs.

**5. Application Layer** — The FastAPI backend serves both frontends, handles data ingestion, and integrates a RAG-based AI chatbot (Groq API + Llama-3.3-70b + ChromaDB + LangChain). The Visitor Web App and Admin Dashboard consume these services. Trail recommendations are generated by a dedicated Node.js/Express CBF engine.

---

## 📂 Repository Structure

```
smart-park-iot/
│
├── Dockerfile                        # Root Dockerfile
├── compose.yaml                      # Main Docker Compose configuration
├── compose.debug.yaml                # Debug/development Compose override
├── nginx.conf                        # Nginx reverse proxy configuration
│
├── IoT_ProjectWeatherForcast/
│   ├── app/                          # FastAPI backend application
│   │   ├── main.py                   # Application entry point
│   │   ├── routers/                  # API route handlers
│   │   ├── models/                   # Data models / schemas
│   │   ├── services/                 # Business logic layer
│   │   └── database/                 # InfluxDB client & queries
│   ├── weather/                      # Admin dashboard (Vue.js)
│   │   ├── src/
│   │   │   ├── components/           # Reusable Vue components
│   │   │   ├── views/                # Page-level views
│   │   │   └── stores/               # State management (Pinia)
│   │   └── vite.config.js
│   ├── Robustel EG5120/              # IoT gateway configuration files
│   ├── Robustel EG5120 ML/           # Gateway ML integration config
│   ├── requirements.txt              # Python dependencies
│   └── .env.example                  # Environment variable template
│
├── web-app/                          # Visitor-facing web application
│   ├── index.html
│   ├── assets/
│   ├── public/
│   └── src/
│
├── ml-engines/                       # Machine learning recommendation engine
│   ├── generate_recom.js.js
│   ├── server.js
│   └── package.json
│
├── firebase-config/                  # Firebase project configuration
├── database/                         # Database schemas and seed data
└── docs/                             # Project documentation and diagrams
```

---

## ⚙️ Technology Stack

| Layer                      | Technology                                          | Purpose                                           |
| -------------------------- | --------------------------------------------------- | ------------------------------------------------- |
| IoT Sensor                 | Robustel S6000U (RS485 / Modbus RTU)                | Multi-parameter environmental sensing             |
| IoT Gateway                | Robustel EG5120 (ARM Cortex-A7, 4G LTE, GPS)       | Edge computing hub; data acquisition & forwarding |
| Edge Orchestration         | Node-RED (on EG5120 App Center)                     | Modbus polling, GPS parsing, ML exec, cloud sync  |
| Edge ML Inference          | Python 3, scikit-learn Random Forest, joblib        | Weather Vibe classification at the edge           |
| Edge Monitoring            | Grafana + InfluxDB (on EG5120)                      | Local real-time dashboards and data buffering     |
| Backend API                | Python 3.11+, FastAPI, Uvicorn                      | Data ingestion, REST API, RAG chatbot             |
| Trail Recommendation       | Node.js 18+, Express, Content-Based Filtering (CBF) | Personalised trail ranking from user preferences  |
| Visitor Web Application    | HTML5, CSS3 (Bootstrap 5), Vanilla JS, Leaflet.js   | Visitor-facing UI: weather, map, recommendations  |
| Admin Dashboard            | Vue.js 3, Vite, Pinia                               | SPA for park administrators                       |
| Cloud Time-Series DB       | InfluxDB Cloud (AWS)                                | Long-term telemetry storage and analytics         |
| User Data & Sync           | Firebase Firestore + Firebase Authentication        | User profiles, trail tags, recommendations        |
| Infrastructure             | Docker, Docker Compose, Nginx                       | Containerisation, routing, static file serving    |
| Remote Device Management   | Robustel RCMS                                       | OTA updates, remote Node-RED deploy, diagnostics  |

---

## 🛠 Prerequisites

Before running the project, ensure the following tools are installed on your machine:

| Tool               | Minimum Version | Installation                          |
| ------------------ | --------------- | ------------------------------------- |
| Docker             | 24.x            | https://docs.docker.com/get-docker/   |
| Docker Compose     | 2.x (plugin)    | Included with Docker Desktop          |
| Git                | 2.x             | https://git-scm.com/                  |
---

## 🚀 Getting Started

### 1. Clone the repository

```bash
git clone https://github.com/jhenals/smart-park-iot.git
cd smart-park-iot
```

---

### 2. Configure environment variables

Copy the environment variable template and fill in the required values:

```bash
cp IoT_ProjectWeatherForcast/.env.example IoT_ProjectWeatherForcast/.env
```

Open `.env` in your editor and configure the values. See the [Environment Variables](#-environment-variables) section for a full description of each variable.

---

### 3. Build and start all services

```bash
docker compose up --build
```

To run in detached (background) mode:

```bash
docker compose up --build -d
```

The first build may take several minutes as Docker pulls base images and installs dependencies.

---

### 4. Verify services are running

```bash
docker compose ps
```

All services should show a status of `running`. If any service has exited, check its logs:

```bash
docker compose logs <service-name>
```

---

### 5. Access the applications

| Service                 | URL                           |
| ----------------------- | ----------------------------- |
| Visitor Web Application | http://localhost:8081         |
| FastAPI Backend         | http://localhost:8000         |
| Admin Dashboard         | http://localhost:5173         |
| InfluxDB            | http://localhost:8086         |
| Grafana Dashboard       | http://localhost:3001         |

---

### 6. Stop the system

```bash
docker compose down
```

To also remove all volumes (database data will be lost):

```bash
docker compose down -v
```

---

## 🔐 Environment Variables

The following variables must be set in `IoT_ProjectWeatherForcast/.env`:

| Variable                   | Description                                           | Example                        |
| -------------------------- | ----------------------------------------------------- | ------------------------------ |
| `INFLUXDB_URL`             | URL of the InfluxDB instance                          | `http://influxdb:8086`         |
| `INFLUXDB_TOKEN`           | InfluxDB authentication token                         | `your-influxdb-token`          |
| `INFLUXDB_ORG`             | InfluxDB organisation name                            | `smartpark`                    |
| `INFLUXDB_BUCKET`          | InfluxDB bucket for sensor data                       | `sensor_data`                  |
| `FIREBASE_PROJECT_ID`      | Firebase project ID                                   | `smartpark-iot`                |
| `FIREBASE_CREDENTIALS`     | Path to Firebase service account JSON                 | `./firebase-config/key.json`   |
| `GRAFANA_ADMIN_USER`       | Grafana admin username                                | `admin`                        |
| `GRAFANA_ADMIN_PASSWORD`   | Grafana admin password                                | `changeme`                     |

> ⚠️ Never commit the `.env` file or any Firebase credentials to version control.

---

## 🔧 Services

The system is composed of several containerised services managed through **Docker Compose**:

| Service         | Container Name    | Description                                       |
| --------------- | ----------------- | ------------------------------------------------- |
| `webapp`        | smartpark-webapp  | Visitor-facing web application served by Nginx    |
| `fastapi`       | smartpark-api     | Backend API for data ingestion and REST endpoints |
| `adminfrontend` | smartpark-admin   | Vue.js administrative dashboard                   |
| `mlengine`      | smartpark-ml      | Node.js trail recommendation engine               |
| `influxdb`      | smartpark-influx  | Time-series database storing sensor telemetry     |
| `grafana`       | smartpark-grafana | Monitoring dashboards and data visualisation      |

---

## 🧩 Project Modules

### Visitor Web Application (`web-app/`)

A lightweight, static web interface designed for park visitors. It provides:

- **Environmental conditions panel** — live temperature, humidity, and air quality readings retrieved from the backend API
- **Weather information** — current and forecast data relevant to the reserve
- **Trail recommendation system** — suggests trails based on current weather conditions and visitor-selected preferences
- **User authentication** — visitors can log in via Firebase to save preferences and view personalised suggestions

The application is served by Nginx and is intentionally lightweight to ensure fast load times, even on mobile networks.

---

### Backend API (`IoT_ProjectWeatherForcast/app/`)

A **FastAPI-based REST API** responsible for:

- Receiving and validating data from IoT sensors and the Robustel EG5120 gateway
- Writing telemetry to InfluxDB using the InfluxDB Python client
- Exposing REST endpoints consumed by both the visitor web app and the admin dashboard
- Providing automatic interactive API documentation at `/docs` (Swagger UI) and `/redoc` (ReDoc)

---

### Admin Dashboard (`IoT_ProjectWeatherForcast/weather/`)

A **Vue.js 3 single-page application** providing park administrators with:

- Real-time and historical sensor data visualisation
- System health and connectivity status for each IoT device
- Chart-based exploration of environmental trends over time

---

### Machine Learning Engine (`ml-engines/`)

A **Node.js module** that:

- Analyses current and forecast weather data retrieved from the backend
- Combines environmental data with visitor-submitted preferences (duration, difficulty, accessibility)
- Produces ranked trail recommendations returned to the visitor web application

---

### IoT Gateway (Robustel EG5120)

The **Robustel EG5120** acts as an industrial-grade cellular IoT gateway deployed in the field. It aggregates data from connected environmental sensors and forwards readings to the backend over the mobile network. The `Robustel EG5120 ML/` directory contains additional configuration for edge-side ML pre-processing.

---

## 📖 API Reference

The FastAPI backend automatically generates interactive documentation. Once the system is running, visit:

- **Swagger UI** → http://localhost:8000/docs
- **ReDoc** → http://localhost:8000/redoc

### Key Endpoints (overview)

| Method | Endpoint                  | Description                             |
| ------ | ------------------------- | --------------------------------------- |
| GET    | `/api/weather/forecast/?minutes={minutes}&measurement={name}`            | minutes={minutes}&measurement={name}Retrieve sensor data for the specified time window and measurement           |


> Full request/response schemas are available in the interactive documentation.

---

## 👥 Project Contributions

This project was developed as a **group assignment for a university IoT course**. The system was built collaboratively, with team members contributing to different components of the stack.

**Group contributions covered:**

- IoT device configuration and gateway setup (Robustel EG5120)
- FastAPI backend development and InfluxDB integration
- Admin dashboard (Vue.js)
- System integration, Docker Compose orchestration, and deployment

**My individual contribution** focused on the **visitor-facing layer** of the system:

- Designed and implemented the **visitor web application** (HTML, CSS, JavaScript)
- Integrated the web interface with the FastAPI backend to display live environmental data
- Connected the application to the **ML engine** for trail recommendations
- Integrated **Firebase Authentication** for user login and personalised experience
- Modified and adapted existing backend endpoints where necessary to meet frontend requirements
- Contributed to **system integration testing** across the full stack

> Parts of the backend and infrastructure in this repository originate from the original group project and have been adapted where needed to support the web application integration.

---

## 🐛 Troubleshooting

### A service fails to start

Check the logs for that specific service:

```bash
docker compose logs fastapi
docker compose logs influxdb
```

### InfluxDB connection errors

Ensure the `INFLUXDB_TOKEN`, `INFLUXDB_ORG`, and `INFLUXDB_BUCKET` values in your `.env` file match the values used when InfluxDB was initialised. If running for the first time, InfluxDB may take a few seconds to become ready — the backend will retry automatically.

### Port conflicts

If a port is already in use on your machine, edit `compose.yaml` and change the host-side port mapping. For example, to change the web app from port `8081` to `9081`:

```yaml
ports:
  - "9081:80"
```

### Admin dashboard not loading

The admin dashboard (`adminfrontend`) runs a Vite development server. If it is slow to start, wait 15–20 seconds after `docker compose up` and then refresh the browser.

### Rebuilding after code changes

```bash
docker compose up --build
```

To force a full clean rebuild:

```bash
docker compose down
docker compose build --no-cache
docker compose up
```

---

## 📄 License

> This project was developed for **educational purposes** as part of a university IoT course. It is not intended for production deployment without further security hardening.

---

## 🌱 About the Reserve

**I Giganti della Sila – Riserva Naturale Biogenetica di Fallistro** is a protected forest located in **Sila National Park**, near **Camigliatello Silano** in the province of **Cosenza**, Calabria, southern Italy.

The reserve takes its name from its most remarkable feature: a stand of **ancient Laricio pine trees (*Pinus nigra* subsp. *laricio*)** planted in the **17th century**. Some trees reach **45 metres in height** and nearly **2 metres in trunk diameter**, making them among the largest and oldest individual trees in Italy.

The forest floor hosts a rich understorey of ferns, mosses, and flowering plants, while the broader Sila plateau supports a diverse ecosystem including wolves, deer, and a wide variety of bird species.

The reserve is managed by **FAI – Fondo Ambiente Italiano** (*Italian Environment Fund*) and is open to visitors from **April to November**.

📍 **Location:** Near Camigliatello Silano, Province of Cosenza, Calabria, Italy  
🌐 **More information:** [fondoambiente.it/i-giganti-della-sila-eng](https://fondoambiente.it/i-giganti-della-sila-eng/)

---

*Developed as part of an IoT course project — academic year 2025/2026.*