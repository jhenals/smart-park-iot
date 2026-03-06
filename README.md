# 🌲 SmartPark IoT
### *I Giganti della Sila — Riserva Naturale Biogenetica di Fallistro*

SmartPark IoT is a full-stack IoT system built for the **I Giganti della Sila** nature reserve, located within the Sila National Park in Calabria, Italy. The reserve is home to 58 ancient Laricio pine trees (*Pinus nigra* subsp. *laricio*) over 350 years old, rising up to 45 metres tall, and is managed by FAI – Fondo Ambiente Italiano.

The system collects real-time environmental and weather data from IoT sensors deployed in the reserve, processes it through a backend API and a machine learning engine, and presents it to visitors through a web application — including personalised trail recommendations based on user preferences and current conditions.

---

## 📋 Table of Contents

- [System Overview](#system-overview)
- [Repository Structure](#repository-structure)
- [Tech Stack](#tech-stack)
- [Architecture](#architecture)
- [Prerequisites](#prerequisites)
- [Getting Started](#getting-started)
- [Configuration](#configuration)
- [Services & Ports](#services--ports)
- [Modules](#modules)
- [Contributing](#contributing)
- [About the Reserve](#about-the-reserve)

---

## System Overview

```
IoT Sensors / Robustel EG5120 (field hardware)
        │
        ▼  (weather & environmental data)
FastAPI Backend  ──►  InfluxDB (time-series data)
        │                    │
        │            Firebase (auth & config)
        │                    │
        ├────────────────────┤
        │   FastAPI +        │
        │   InfluxDB +       ▼
        │   Grafana   ──►  Admin Dashboard (Vue.js)  ◄──►  Administrator
        │
        ▼
  ML Engine
        │
        ▼  (FastAPI + Firebase)
  Web App (Nginx)  ◄──►  Visitor / Tourist
```

---

## Repository Structure

```
smart-park-iot/
│   Dockerfile                  # Multi-stage Docker build
│   compose.yaml                # Main Docker Compose configuration
│   compose.debug.yaml          # Debug Docker Compose override
│   nginx.conf                  # Nginx configuration for the web app
│   .dockerignore
│   .gitignore
│   README.md                   # This file
│
├── IoT_ProjectWeatherForcast/  # Backend + Admin Dashboard
│   ├── app/                    # FastAPI backend (Python)
│   ├── weather/                # Admin dashboard (Vue.js + Vite)
│   │   └── src/
│   │       ├── assets/
│   │       ├── components/
│   │       ├── LogInPage/
│   │       ├── pages/
│   │       ├── utils/
│   │       ├── App.vue
│   │       └── main.js
│   ├── Robustel EG5120/        # Robustel IoT gateway configuration
│   ├── Robustel EG5120 ML/     # Robustel gateway ML configuration
│   ├── requirements.txt        # Python dependencies
│   ├── .env.example            # Environment variable template
│   └── README.md
│
├── database/                   # Database schemas and seed data
├── docs/                       # Project documentation
├── firebase-config/            # Firebase configuration files
├── ml-engines/                 # ML engine for trail recommendations
└── web-app/                    # Visitor-facing web application (Nginx)
```

---

## Tech Stack

| Layer | Technology |
|---|---|
| Visitor Web App | HTML5, CSS3, Vanilla JavaScript, Nginx |
| Admin Dashboard | Vue.js, Vite |
| Backend API | Python, FastAPI, Uvicorn |
| ML Engine | Node.js |
| Database | InfluxDB 2.7 (time-series), Firebase (auth & config) |
| Monitoring | Grafana |
| Infrastructure | Docker, Docker Compose |

**Languages breakdown:** JavaScript 59.8% · HTML 20.7% · CSS 18.6% · Dockerfile 0.9%

---

## Architecture

The entire system is orchestrated with Docker Compose and consists of six services:

| Service | Description | Port |
|---|---|---|
| `webapp` | Visitor-facing web app served by Nginx | `8081` |
| `fastapi` | REST API backend — data ingestion and serving | `8000` |
| `adminfrontend` | Vue.js admin dashboard | `5173` |
| `mlengine` | Node.js ML engine for trail recommendations | `3100` |
| `influxdb` | Time-series storage for sensor data | `8086` |
| `grafana` | Data visualisation and operational monitoring | `3001` |

The `webapp` service depends on both `fastapi` and `adminfrontend` being healthy before it starts.

---

## Prerequisites

- [Docker](https://www.docker.com/) **v24 or later**
- [Docker Compose](https://docs.docker.com/compose/) **v2 or later**

No local Python, Node.js, or web server installation is required — everything runs inside containers.

---

## Getting Started

### 1. Clone the repository

```bash
git clone https://github.com/jhenals/smart-park-iot.git
cd smart-park-iot
```

### 2. Configure environment variables

```bash
cp IoT_ProjectWeatherForcast/.env.example IoT_ProjectWeatherForcast/.env
```

Edit the `.env` file with your API keys and settings (see [Configuration](#configuration) below).

### 3. Build and start all services

```bash
docker compose up --build
```

The visitor web app will be available at **http://localhost:8081**.

### 4. Stop all services

```bash
docker compose down
```

To also remove persistent volumes (InfluxDB and Grafana data):

```bash
docker compose down -v
```

### Debug mode

A debug Compose override is available for development:

```bash
docker compose -f compose.yaml -f compose.debug.yaml up --build
```

---

## Configuration

All runtime configuration is managed through `IoT_ProjectWeatherForcast/.env`. Example variables:

```env
# Weather / Environmental API
WEATHER_API_KEY=your_weather_api_key

# Firebase
FIREBASE_API_KEY=your_firebase_api_key
FIREBASE_PROJECT_ID=your_project_id

# InfluxDB
INFLUXDB_URL=http://influxdb:8086
INFLUXDB_TOKEN=admintoken
INFLUXDB_ORG=smartpark
INFLUXDB_BUCKET=main

# Admin Dashboard
VITE_BACKEND_URL=http://localhost:8000
```

> Never commit `.env` files containing real secrets to version control.

---

## Services & Ports

| Service | URL | Credentials |
|---|---|---|
| Visitor Web App | http://localhost:8081 | — |
| FastAPI Backend | http://localhost:8000 | — |
| FastAPI Docs (Swagger) | http://localhost:8000/docs | — |
| Admin Dashboard | http://localhost:5173 | — |
| ML Engine | http://localhost:3100 | — |
| InfluxDB | http://localhost:8086 | `admin` / `adminpassword` |
| Grafana | http://localhost:3001 | `admin` / `admin` |

> Default credentials are for local development only. Change them before any production deployment.

---

## Modules

### 🌐 [`web-app/`](./web-app)
The visitor-facing web application, served by Nginx. Displays real-time weather and environmental conditions at the reserve, and provides personalised trail recommendations based on visitor preferences. Built with plain HTML, CSS, and JavaScript. See [`web-app/README.md`](./web-app/README.md) for details.

### ⚡ [`IoT_ProjectWeatherForcast/`](./IoT_ProjectWeatherForcast)
Contains two sub-modules:

- **`app/`** — the **FastAPI backend** (Python) responsible for data ingestion from IoT sensors and REST API endpoints. Dependencies are listed in `requirements.txt`. Runtime configuration is managed via `.env` (see `.env.example`).
- **`weather/`** — the **Admin Dashboard**, a Vue.js + Vite single-page application for reserve staff. It is structured as a standard Vite project with `src/` (containing `components/`, `pages/`, `LogInPage/`, `utils/`, `assets/`, `App.vue`, and `main.js`), `public/`, `index.html`, and `vite.config.js`.
- **`Robustel EG5120/`** and **`Robustel EG5120 ML/`** — configuration and ML-related files for the Robustel EG5120 IoT gateway hardware used to collect field data.

### 🤖 [`ml-engines/`](./ml-engines)
Node.js-based machine learning engine that powers the trail recommendation system, analysing user preferences and current environmental conditions to suggest the most suitable trails.

### 🔥 [`firebase-config/`](./firebase-config)
Firebase configuration shared across services, used for authentication and real-time data features.

### 🗄️ [`database/`](./database)
Database schemas, migration scripts, and seed data for the project's data stores.

### 📄 [`docs/`](./docs)
Project documentation, architecture diagrams, and additional references.

---

## Contributing

Contributions are welcome! To propose changes:

1. Fork the repository
2. Create a new branch: `git checkout -b feature/your-feature-name`
3. Commit your changes: `git commit -m "feat: describe your change"`
4. Push to your branch: `git push origin feature/your-feature-name`
5. Open a Pull Request

Please follow the existing code style and write clear, descriptive commit messages.

---

## About the Reserve

**I Giganti della Sila** (The Giants of Sila) is a Biogenetic Nature Reserve located in the Sila National Park, near Camigliatello Silano in the province of Cosenza, Calabria, Italy. It preserves 58 ancient Laricio pine trees planted in the 17th century, standing up to 45 metres tall with trunk diameters of nearly 2 metres. The reserve is managed by **FAI – Fondo Ambiente Italiano** and is open to visitors from April to November.

🔗 [Visit the FAI page](https://fondoambiente.it/i-giganti-della-sila-eng/)