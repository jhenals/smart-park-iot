# 🌲 SmartPark IoT — Web Application
### *I Giganti della Sila — Riserva Naturale Fallistro*

This directory contains the **front-end web application** of the SmartPark IoT project — an IoT-powered monitoring and visitor management system for the **I Giganti della Sila** nature reserve (Riserva Naturale Biogenetica di Fallistro), located within the Sila National Park in Calabria, Italy.

The reserve is home to 58 ancient Laricio pine trees (Calabrian black pines) over 350 years old, rising up to 45 metres tall, and is managed by FAI – Fondo Ambiente Italiano. This web application provides a real-time dashboard displaying current weather and environmental conditions at the reserve, and offers personalised trail recommendations — helping visitors plan and make the most of their experience among the ancient pines.

---

## 📋 Table of Contents

- [Overview](#overview)
- [Project Structure](#project-structure)
- [Tech Stack](#tech-stack)
- [System Architecture](#system-architecture)
- [Prerequisites](#prerequisites)
- [Getting Started](#getting-started)
- [Configuration](#configuration)
- [Features](#features)
- [Integration with the IoT Layer](#integration-with-the-iot-layer)
- [Contributing](#contributing)

---

## Overview

The web application is the visitor-facing component of the SmartPark IoT system. It consumes real-time data collected by IoT sensors deployed within the reserve and presents current weather and environmental conditions in a clear, accessible interface. It also recommends trails tailored to each visitor's preferences — helping them decide when to visit, which path suits them best, and how to prepare for their time among the ancient pines.

This module is part of the larger `smart-park-iot` monorepo. It is designed to run alongside the IoT hardware and broker/backend components found in the other subdirectories of this repository.

---

## Project Structure

```
web-app/
│   index.html                        # Homepage / entry point
│   README.md                         # This file
│
├── assets/
│   ├── js/                           # Page-level JavaScript files
│   │   │   discover.js               # Discover page logic
│   │   │   dynamic-navbar.js         # Responsive navbar behaviour
│   │   │   eco-insight.js            # Eco stats and insights logic
│   │   │   hero.js                   # Homepage hero section logic
│   │   │   index.js                  # Homepage entry script
│   │   │   login.js                  # Authentication logic
│   │   │   ml-integration.js         # ML model integration (trail recommendations)
│   │   │   public-env.js             # Public environmental data logic
│   │   │   trail-preferences.js      # Trail preference selection logic
│   │   │   user-dashboard.js         # User dashboard logic
│   │   │   user-location.js          # User geolocation logic
│   │   │   weather.js                # Weather data fetching and display
│   │   │
│   │   ├── components/
│   │   │       park-insights.js      # Park insights component logic
│   │   │
│   │   └── utils/
│   │           auth.js               # Authentication utilities
│   │           changingImages.js     # Rotating/slideshow image utility
│   │           constants.js          # Shared constants
│   │           mapsUtils.js          # Map helper functions
│   │           utils.js              # General utility functions
│   │
│   └── styles/                       # CSS stylesheets
│       │   discover.css
│       │   eco-insight.css
│       │   hero.css
│       │   index.css
│       │   login.css
│       │   map.css
│       │   public-env.css
│       │   trail-pref.css
│       │   user-dashboard.css
│       │   user-loc.css
│       │   weather.css
│       │
│       └── components/
│               dynamic-navbar.css
│               park-insights.css
│
├── public/
│   ├── icons/                        # SVG and PNG icons (chatbot, markers, etc.)
│   └── images/                       # All image assets
│       ├── homepage-imgs/            # Hero/homepage carousel images
│       ├── trail-pref-images/        # Trail preference selection images
│       └── user-dashboard-imgs/      # User dashboard illustrations
│
└── src/                              # HTML pages
    │   discover.html                 # Discover the reserve page
    │   login.html                    # Login / registration page
    │   logout.html                   # Logout handler
    │   public-env.html               # Public environmental conditions page
    │   weather.html                  # Weather dashboard page
    │
    ├── components/                   # Reusable HTML components
    │       chatbot-ui.html           # AI chatbot interface
    │       footer.html               # Shared footer
    │       park-insights.html        # Park insights component
    │
    └── user/                         # Authenticated user pages
            eco-stats.html            # Personal eco statistics
            trail-preferences.html    # Trail preference setup
            user-dashboard.html       # User dashboard
            user-location.html        # User location tracking
```

---

## Tech Stack

| Technology | Purpose |
|---|---|
| HTML5 / CSS3 | Page structure and styling |
| Vanilla JavaScript (ES6+) | Client-side logic and interactivity |
| ML integration (`ml-integration.js`) | Trail recommendation based on user preferences |
| Geolocation API | User location tracking |
| Weather API *(verify)* | Real-time environmental and weather data |
| Maps API (`mapsUtils.js`) *(verify)* | Interactive map display |
| Nginx | Static file serving inside Docker |
| Docker / Docker Compose | Containerised multi-service deployment |

---

## System Architecture

The web app is one of several services orchestrated by Docker Compose. The full system is composed of:

| Service | Technology | Port | Description |
|---|---|---|---|
| `webapp` | Nginx | `8081` | Serves the static web app (this module) |
| `fastapi` | Python / FastAPI | `8000` | Backend REST API |
| `adminfrontend` | Vue.js / Vite | `5173` | Admin dashboard |
| `mlengine` | Node.js | `3100` | ML engine for trail recommendations |
| `influxdb` | InfluxDB 2.7 | `8086` | Time-series sensor data storage |
| `grafana` | Grafana | `3001` | Data visualisation and monitoring |

The web app (`webapp`) depends on both `fastapi` and `adminfrontend` being healthy before starting.

---

## Prerequisites

Make sure you have the following installed before proceeding:

- [Docker](https://www.docker.com/) **v24 or later**
- [Docker Compose](https://docs.docker.com/compose/) **v2 or later**

No local Node.js, Python, or web server installation is required — everything runs inside containers.

---

## Getting Started

### 1. Clone the repository

```bash
git clone https://github.com/jhenals/smart-park-iot.git
cd smart-park-iot
```

### 2. Configure environment variables

Copy the example environment file and fill in your values:

```bash
cp IoT_ProjectWeatherForcast/.env.example IoT_ProjectWeatherForcast/.env
```

Edit the `.env` file with your API keys and settings (see [Configuration](#configuration) below).

### 3. Build and start all services

From the **root of the repository** (not inside `web-app/`), run:

```bash
docker compose up --build
```

Once all containers are running, the web app will be available at:

```
http://localhost:8081
```

Other services are accessible at:

| Service | URL |
|---|---|
| Web App | http://localhost:8081 |
| FastAPI Backend | http://localhost:8000 |
| Admin Dashboard | http://localhost:5173 |
| ML Engine | http://localhost:3100 |
| InfluxDB | http://localhost:8086 |
| Grafana | http://localhost:3001 |

### 4. Stop all services

```bash
docker compose down
```

To also remove persistent volumes (InfluxDB and Grafana data):

```bash
docker compose down -v
```

---

## Configuration

Create or edit the `.env` file at `IoT_ProjectWeatherForcast/.env`. Example variables:

```env
# Weather API
WEATHER_API_KEY=your_weather_api_key

# Firebase
FIREBASE_API_KEY=your_firebase_api_key
FIREBASE_PROJECT_ID=your_project_id

# InfluxDB
INFLUXDB_URL=http://influxdb:8086
INFLUXDB_TOKEN=admintoken
INFLUXDB_ORG=smartpark
INFLUXDB_BUCKET=main
```

> Adjust variable names to match those actually used in your project.  
> Never commit `.env` files containing real secrets to version control.

---

## Features

- **Real-time weather display** — current temperature, humidity, wind speed, and other conditions recorded at the reserve
- **Environmental condition indicators** — clear visual cues (e.g. good / caution / unfavourable) to help visitors assess conditions before or during their visit
- **Personalised trail recommendations** — suggests trails based on the visitor's preferences (e.g. difficulty level, duration, accessibility) and current environmental conditions
- **Responsive design** — accessible from desktop, tablet, and mobile browsers so visitors can check conditions on the go
- **Historical data view** *(if applicable)* — charts of past weather readings to spot trends and patterns

---

## Integration with the IoT Layer

This web app is part of a wider IoT system. The typical data flow is:

```
IoT Sensors (e.g. ESP32 / Arduino)
        │
        ▼  (MQTT publish)
MQTT Broker (e.g. Mosquitto)
        │
        ▼  (WebSocket / REST)
  Web Application  ◄──►  Visitor / Staff
```

Make sure the MQTT broker and/or backend API is running and reachable before starting the web app. Refer to the other subdirectories in this repository for setup instructions on the hardware firmware and broker configuration.

---

## About the Reserve

**I Giganti della Sila** (The Giants of Sila) is a Biogenetic Nature Reserve located in the Sila National Park, near Camigliatello Silano in the province of Cosenza, Calabria, Italy. It preserves 58 ancient Laricio pine trees (*Pinus nigra subsp. laricio*) planted in the 17th century, standing up to 45 metres tall with trunk diameters of nearly 2 metres. The reserve is managed by **FAI – Fondo Ambiente Italiano** and is open to visitors from April to November.

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

> **Part of the [smart-park-iot](https://github.com/jhenals/smart-park-iot) monorepo.**  
> Reserve managed by [FAI – Fondo Ambiente Italiano](https://fondoambiente.it/i-giganti-della-sila-eng/).