from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import ORJSONResponse
from contextlib import asynccontextmanager
from app.routes.weather import router as weather_router
from app.routes.rag import router as rag_router
from app.routes.auth import router as auth_router
from app.database import init_firebase
import os
from google import genai
from app.config import GROQ_API_KEY
from fastapi.staticfiles import StaticFiles

@asynccontextmanager
async def lifespan(app: FastAPI):
    init_firebase()
    if GROQ_API_KEY:
        genai.Client(api_key=GROQ_API_KEY)
    yield
    # Shutdown: Clean up resources

# For faster JSON serialization
app = FastAPI(docs_url="/", redoc_url=None,
              title="IoT Weather API", version="1.0.0")

ALLOWED_ORIGINS = os.getenv(
    "ALLOWED_ORIGINS",
    "http://localhost:5173,http://127.0.0.1:5173," 
    "http://localhost:5500,http://127.0.0.1:5500," 
    "http://localhost:8000,http://127.0.0.1:8000," 
    "http://localhost:8081,http://127.0.0.1:8081"
).split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],

)

app.include_router(weather_router, prefix="/api/weather", tags=["weather"])
app.include_router(rag_router, prefix="/api/rag", tags=["AI Assistant"])
app.include_router(auth_router)

@app.get("/health", include_in_schema=False)
async def health():
    return {"status": "ok", "version": "1.1.0"}
