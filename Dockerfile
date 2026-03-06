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

COPY database/ ./database/
COPY --from=admin-frontend /admin/dist ./static/admin/

# Copy web-app contents
COPY web-app/assets/ ./static/web-app/assets/
COPY web-app/public/ ./static/web-app/public/
COPY web-app/src/ ./static/web-app/src/
COPY web-app/index.html ./static/web-app/

# Copy firebase contents
COPY firebase-config/ ./firebase-config/

# Copy ml-engines contents
COPY ml-engines/ ./ml-engines/

COPY docs/ ./docs/

# Robustel folders are optional, comment out if not present
# COPY Robustel EG5120/ ./Robustel_EG5120/
# COPY Robustel EG5120 ML/ ./Robustel_EG5120_ML/
RUN useradd -m -u 1000 appuser && chown -R appuser:appuser /app
USER appuser
EXPOSE 8000
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 CMD curl -f http://localhost:8000/health || exit 1
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]

