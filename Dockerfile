# ================================
# Stage 1: Build Vue.js Frontend
# ================================
FROM node:20-alpine AS frontend-builder

WORKDIR /frontend

# Copy package files
COPY IoT_ProjectWeatherForcast/weather/package*.json ./

# Install dependencies (including devDependencies for build)
RUN npm ci

# Copy frontend source code
COPY IoT_ProjectWeatherForcast/weather/ ./

# Build the Vue.js app
RUN npm run build

# ================================
# Stage 2: Python FastAPI Backend
# ================================
FROM python:3.11-slim AS backend

# Set environment variables
ENV PYTHONUNBUFFERED=1 \
  PYTHONDONTWRITEBYTECODE=1 \
  PIP_NO_CACHE_DIR=1 \
  PIP_DISABLE_PIP_VERSION_CHECK=1

# Install system dependencies (if needed)
RUN apt-get update && \
  apt-get install -y --no-install-recommends \
  curl \
  && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy requirements file
COPY IoT_ProjectWeatherForcast/requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend application code
COPY IoT_ProjectWeatherForcast/app/ ./app/

# Copy database files
COPY database/ ./database/

# Copy built frontend from stage 1
COPY --from=frontend-builder /frontend/dist ./static/weather

# Copy static web-app files
COPY web-app/ ./static/web-app/

# Create a non-root user for security
RUN useradd -m -u 1000 appuser && \
  chown -R appuser:appuser /app

# Switch to non-root user
USER appuser

# Expose the port FastAPI runs on
EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:8000/health || exit 1

# Set working directory to app folder
WORKDIR /app/app

# Run the application
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
