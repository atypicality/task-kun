print("Starting FastAPI backend...")

# -------------------------
# Imports
# -------------------------

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
from pydantic import BaseModel

import io
import time
import traceback
import asyncio

from tts_service import generate_voice, initialize_model
from chatbot import generate_gemini_response
from auth import router as auth_router
from tasks import router as tasks_router
from user_settings import router as settings_router

import os
import redis
print("All imports completed.")

# -------------------------
# App Setup
# -------------------------

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:5174"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include auth routes
app.include_router(auth_router)

# Include tasks routes
app.include_router(tasks_router)

# Include user settings routes
app.include_router(settings_router)

# 🔒 Prevent concurrent GPU crashes
gpu_lock = asyncio.Lock()

# -------------------------
# Startup Hook (LAZY LOAD MODEL)
# -------------------------
model_ready = False

@app.on_event("startup")
async def startup_event():
    print("🚀 Backend started! (TTS model will load on first request)")
    # Don't load TTS model at startup - load it lazily on first request


# -------------------------
# Request Model
# -------------------------

class TTSRequest(BaseModel):
    text: str
    voice: str | None = None

# -------------------------
# Health Check
# -------------------------

@app.get("/")
def root():
    return {"status": "Backend is running"}


# -------------------------
# Voice Generation Route
# -------------------------

@app.post("/generate-voice")
async def generate_voice_route(data: TTSRequest):
    print("\n===== NEW REQUEST =====")
    print("Text:", data.text)

    global model_ready
    
    # Lazy load model on first request
    if not model_ready:
        print("📦 Loading TTS model for first time (this may take ~30 seconds)...")
        initialize_model()
        model_ready = True
        print("✅ TTS model ready.")

    start_time = time.time()

    try:
        async with gpu_lock:
            audio_bytes = generate_voice(data.text, use_miku=(data.voice == "miku"))

        duration = time.time() - start_time
        print(f"Request completed in {duration:.2f} seconds")
        print("===== END REQUEST =====\n")

        return Response(
            content=audio_bytes,
            media_type="audio/mpeg"
        )

    except Exception:
        print("❌ ERROR DURING GENERATION")
        traceback.print_exc()
        raise


# -------------------------
# Google Gemini Route
# -------------------------

@app.post("/generate-gemini")
async def generate_gemini_route(data: TTSRequest):
    print("\n===== NEW GEMINI REQUEST =====")
    print("Text:", data.text)

    start_time = time.time()

    try:
        chat_response = await generate_gemini_response(data.text)

        duration = time.time() - start_time
        print(f"Gemini request completed in {duration:.2f} seconds")
        print("===== END GEMINI REQUEST =====\n")

        return {"response": chat_response}

    except Exception:
        print("❌ ERROR DURING GEMINI GENERATION")
        traceback.print_exc()
        raise

# -------------------------
# Supabase Setup
# -------------------------
from dotenv import load_dotenv

load_dotenv()