# Stage 1: Admin Dashboard Dev Server (Vue.js)
FROM node:20-alpine AS admin-frontend
WORKDIR /admin
COPY IoT_ProjectWeatherForcast/weather/package*.json ./
RUN npm ci
COPY IoT_ProjectWeatherForcast/weather/ ./
EXPOSE 5173
CMD ["npm", "run", "dev", "--", "--host"]

# Stage 2: FastAPI Backend
FROM python:3.11-slim AS backend
ENV PYTHONUNBUFFERED=1 \
  PYTHONDONTWRITEBYTECODE=1 \
  PIP_NO_CACHE_DIR=1 \
  PIP_DISABLE_PIP_VERSION_CHECK=1

RUN apt-get update && \
  apt-get install -y --no-install-recommends curl && \
  rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY IoT_ProjectWeatherForcast/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY IoT_ProjectWeatherForcast/app/ ./app/
COPY firebase-config/ ./firebase-config/
COPY ml-engines/ ./ml-engines/

# Optional Robustel folders
# COPY Robustel\ EG5120/ ./Robustel_EG5120/
# COPY Robustel\ EG5120\ ML/ ./Robustel_EG5120_ML/

RUN useradd -m -u 1000 appuser && chown -R appuser:appuser /app

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:8000/health || exit 1

USER appuser

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]


# Stage 3: Web App Server (Nginx)
FROM nginx:alpine AS webapp
COPY web-app/ /usr/share/nginx/html/
COPY firebase-config/ /usr/share/nginx/html/firebase-config/
COPY ml-engines/ /usr/share/nginx/html/ml-engines/
COPY IoT_ProjectWeatherForcast/ /usr/share/nginx/html/IoT_ProjectWeatherForcast/

COPY nginx.conf /etc/nginx/nginx.conf
EXPOSE 8081
CMD ["nginx", "-g", "daemon off;"]
