# IoT Weather Forecast and Predictive Analysis 🌦️📡

A full-stack **edge-to-cloud IoT weather monitoring + forecasting** system built around **Robustel EG5120** and **S6000U Multi-Purpose Sensor**.  
It collects environmental data at the edge, stores it as time-series, visualizes it in dashboards, and runs **machine learning** for **classification + predictive forecasting**, with a **RAG-based chatbot** for natural-language insights.

---

## Table of Contents
- [Project Goals](#project-goals)
- [Requirements](#requirements)
- [System Architecture](#system-architecture)
- [Data Model](#data-model)
- [Analytics and ML](#analytics-and-ml)
- [API (FastAPI)](#api-fastapi)
- [Frontend (Vue 3 + Vite)](#frontend-vue-3--vite)
- [RAG-based Chatbot](#rag-based-chatbot)
- [Project Structure](#project-structure)
- [Environment Variables](#environment-variables)
- [Quick Start](#quick-start)
- [Grafana & InfluxDB Notes](#grafana--influxdb-notes)
- [License](#license)

---

## Project Goals
- **Continuous sensing** of weather/environment parameters (e.g., temperature, humidity, pressure, light, etc.)
- **Edge ingestion and processing** using Node-RED (filtering, parsing, validation, smoothing)
- **Time-series storage** in InfluxDB for efficient queries and long-term retention
- **Visualization** using Grafana dashboards (real-time + historical trends)
- **Machine learning**
  - **Classification** (e.g., weather state, anomaly detection, sensor status)
  - **Forecasting** (short-horizon prediction of selected variables)
- **Web UI** using Vue 3 for interactive charts + device selection + time range
- **RAG chatbot** for question answering over:
  - device metadata, documentation, and FAQs
  - latest sensor readings / recent history (via retrieval)

---

## Requirements

### Hardware
- **Robustel EG5120** Edge Gateway  
- **S6000U** Multi-Purpose Sensor

### Software (running on the hardware / edge)
- **Node-RED** (ingestion + preprocessing + routing)
- **InfluxDB** (time-series DB)
- **Grafana** (dashboards)
- **Machine Learning** (classification / forecasting pipeline)

### Software (application layer)
- **Python (FastAPI)** backend API
- **Vue.js** frontend dashboard
- **RAG-based Chatbot** (retrieval + LLM)

---

## System Architecture

### High-level pipeline (rendered with LaTeX on GitHub)
$$
\textbf{S6000U Sensor}
\;\xrightarrow{\;\text{RS-485 / Modbus}\;}\;
\textbf{EG5120 (Node-RED)}
\;\xrightarrow{\;\text{write}\;}\;
\textbf{InfluxDB}
\;\xrightarrow{\;\text{query}\;}\;
\textbf{FastAPI / Grafana}
\;\xrightarrow{\;\text{REST/Web}\;}\;
\textbf{Vue UI + RAG Chatbot}
$$

### Edge processing idea
$$
\tilde{x}_t = \mathrm{clean}(x_t), \qquad
\bar{x}_t = \frac{1}{k}\sum_{i=0}^{k-1}\tilde{x}_{t-i}
$$

Where:
- $x_t$ is the raw sensor measurement at time $t$
- $\tilde{x}_t$ is the cleaned/validated value (e.g., removing spikes, nulls)
- $\bar{x}_t$ is a simple moving average smoothing window of length $k$

---

## Data Model

### Multivariate observation vector
Let each timestamp $t$ produce a feature vector:

$$
\mathbf{x}_t =
\begin{bmatrix}
T_t & RH_t & P_t & L_t & \cdots
\end{bmatrix}
$$

Example meanings:
- $T_t$: temperature (°C)
- $RH_t$: relative humidity (%)
- $P_t$: pressure (hPa)
- $L_t$: luminance/light (lux)
- $\cdots$: additional channels from S6000U

### Optional derived metrics (example: Dew point)
A common derived feature is **dew point**:

$$
\gamma(T,RH) = \frac{aT}{b+T} + \ln\left(\frac{RH}{100}\right)
$$

$$
T_d = \frac{b\gamma(T,RH)}{a-\gamma(T,RH)}
$$

Typical constants (for °C):
- $a = 17.62$, $b = 243.12$

---

## Analytics and ML

### 1) Forecasting (predictive analysis)
We predict future values from a history window of length $L$:

$$
\hat{\mathbf{x}}_{t+h} = f_{\theta}\left(\mathbf{x}_{t-L+1}, \ldots, \mathbf{x}_t\right)
$$

- $h$: forecast horizon (e.g., 10 minutes, 1 hour)
- $f_\theta$: model (e.g., Random Forest regressor, LSTM/GRU, Temporal CNN)

A common regression loss:
$$
\mathcal{L}_{\mathrm{MSE}} = \frac{1}{N}\sum_{i=1}^{N}\left(y_i - \hat{y}_i\right)^2
$$

### 2) Classification (weather state / anomaly / sensor health)
We assign a label $y_t \in \{1,2,\dots,C\}$:

$$
\hat{y}_t = \arg\max_{c} \;\mathrm{softmax}\left(g_{\phi}(\mathbf{x}_{t-L+1:t})\right)_c
$$

Cross-entropy loss:
$$
\mathcal{L}_{\mathrm{CE}} = -\sum_{c=1}^{C} y_c \log(\hat{p}_c)
$$

### 3) Evaluation metrics
Forecasting:
$$
\mathrm{MAE} = \frac{1}{N}\sum_{i=1}^{N}|y_i - \hat{y}_i|,
\qquad
\mathrm{RMSE} = \sqrt{\frac{1}{N}\sum_{i=1}^{N}(y_i - \hat{y}_i)^2}
$$

Classification:
$$
\mathrm{Precision}=\frac{TP}{TP+FP},\quad
\mathrm{Recall}=\frac{TP}{TP+FN},\quad
F1=\frac{2\cdot\mathrm{Precision}\cdot\mathrm{Recall}}{\mathrm{Precision}+\mathrm{Recall}}
$$

---

## API (FastAPI)

Typical backend responsibilities:
- Query latest readings (per device / per sensor)
- Query range data (time-window + downsampling)
- Provide forecast outputs
- Provide classification/anomaly outputs
- Provide chatbot retrieval context (documents + recent time series)

Example endpoints (customize to your implementation):
- `GET /api/devices`
- `GET /api/weather/latest?device_id=101`
- `GET /api/weather/range?device_id=101&from=...&to=...&bucket=5m`
- `GET /api/weather/forecast?device_id=101&horizon=60m`
- `GET /api/weather/classify?device_id=101`
- `POST /api/chat/query`

Run locally (example):
```bash
cd backend
python -m venv .venv
source .venv/bin/activate  # Windows: .venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload --host 0.0.0.0 --port 8000
