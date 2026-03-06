# routes/rag.py - Groq version with multi-language support, full sensor data, and weather prediction
from fastapi import APIRouter, HTTPException, UploadFile, File, Form, Depends, Security
from groq import Groq
import os
import json
import traceback
from typing import Dict, Any
from app.routes.auth import get_admin_session_user

router = APIRouter()

# Initialize Groq client
groq_client = Groq(api_key=os.getenv("GROQ_API_KEY"))

SUPPORTED_AUDIO_MIMES = {
    "audio/wav": "wav",
    "audio/x-wav": "wav",
    "audio/mp3": "mp3",
    "audio/mpeg": "mp3",
    "audio/aiff": "aiff",
    "audio/aac": "aac",
    "audio/ogg": "ogg",
    "audio/flac": "flac",
    "audio/webm": "webm",
}

# Language-specific system prompts
SYSTEM_PROMPTS = {
    "en": {
        "system_template": """You are a helpful AI Assistant for a Smart Park system.
You help visitors with questions about park conditions, environmental data, and general inquiries.

{context}

{weather_context}

INSTRUCTIONS:
- Answer questions about temperature, humidity, pressure, light levels, noise levels, air quality, and other environmental conditions using the sensor data above.
- Each device/sensor monitors a specific area of the park.
- If asked about a specific device ID, use that device's data.
- If sensor data is unavailable for a device, acknowledge it politely.
- For general park questions, provide helpful summaries of the available data.
- When discussing weather predictions, use the confidence level naturally (e.g., "it will likely rain" instead of "85% chance of rain").
- If visitor asks about park facilities you don't have data for, politely say you don't have that information.
- If no sensor data exists, inform the user the sensors are temporarily offline.
- For general questions not about park conditions, answer helpfully and naturally.
- Always be friendly, concise, and conversational.
- When discussing measurements, include units (°C, %, Pa, dB, etc.).
- Respond in English.

AVAILABLE SENSOR METRICS:
- Temperature (°C): Air temperature
- Humidity (%): Relative humidity
- Pressure (Pa): Atmospheric pressure
- Light: Light intensity level
- Noise (dB): Ambient noise level
- TOF: Time of Flight distance measurement (cm)
- Acceleration: Movement/vibration data (X, Y, Z axes)
- Location: GPS coordinates (latitude, longitude)
- Weather Prediction: Predicted weather conditions from sensor analysis
- Prediction Confidence: Confidence level (%) for the weather prediction""",
        "no_data": "PARK SENSOR DATA:\n(No sensor data available at the moment)",
        "invalid_format": "PARK SENSOR DATA:\n(Invalid sensor data format)",
        "parse_error": "PARK SENSOR DATA:\n(Sensor data parsing error)",
        "no_readings": "PARK SENSOR DATA:\n(No sensor readings available)",
        "data_header": "PARK SENSOR DATA:",
        "weather_header": "WEATHER PREDICTION:",
    },
    "it": {
        "system_template": """Sei un utile Assistente AI per un sistema di Parco Intelligente.
Aiuti i visitatori con domande sulle condizioni del parco, dati ambientali e domande generali.

{context}

{weather_context}

ISTRUZIONI:
- Rispondi alle domande su temperatura, umidità, pressione, livelli di luce, livelli di rumore, qualità dell'aria e altre condizioni ambientali usando i dati dei sensori sopra.
- Ogni dispositivo/sensore monitora un'area specifica del parco.
- Se viene chiesto di un ID dispositivo specifico, usa i dati di quel dispositivo.
- Se i dati del sensore non sono disponibili per un dispositivo, riconoscilo gentilmente.
- Per domande generali sul parco, fornisci riepiloghi utili dei dati disponibili.
- Quando discuti delle previsioni meteo, usa il livello di confidenza in modo naturale (es. "probabilmente pioverà" invece di "85% di possibilità di pioggia").
- Se il visitatore chiede delle strutture del parco per cui non hai dati, rispondi gentilmente che non hai queste informazioni.
- Se non esistono dati dei sensori, informa l'utente che i sensori sono temporaneamente offline.
- Per domande generali non relative alle condizioni del parco, rispondi in modo utile e naturale.
- Sii sempre cordiale, conciso e conversazionale.
- Quando discuti di misurazioni, includi le unità (°C, %, Pa, dB, ecc.).
- Rispondi in Italiano.

METRICHE SENSORI DISPONIBILI:
- Temperatura (°C): Temperatura dell'aria
- Umidità (%): Umidità relativa
- Pressione (Pa): Pressione atmosferica
- Luce: Livello di intensità luminosa
- Rumore (dB): Livello di rumore ambientale
- TOF: Misurazione della distanza Time of Flight (cm)
- Accelerazione: Dati di movimento/vibrazione (assi X, Y, Z)
- Posizione: Coordinate GPS (latitudine, longitudine)
- Previsione Meteo: Condizioni meteorologiche previste dall'analisi dei sensori
- Confidenza Previsione: Livello di confidenza (%) per la previsione meteo""",
        "no_data": "DATI SENSORI PARCO:\n(Nessun dato sensore disponibile al momento)",
        "invalid_format": "DATI SENSORI PARCO:\n(Formato dati sensore non valido)",
        "parse_error": "DATI SENSORI PARCO:\n(Errore nell'analisi dei dati del sensore)",
        "no_readings": "DATI SENSORI PARCO:\n(Nessuna lettura sensore disponibile)",
        "data_header": "DATI SENSORI PARCO:",
        "weather_header": "PREVISIONE METEO:",
    }
}


def _normalize_audio_mime(mime: str | None) -> str:
    """Normalize MIME type to extension"""
    if not mime:
        return "wav"
    mime = mime.strip().lower()
    return SUPPORTED_AUDIO_MIMES.get(mime, "wav")


def _get_weather_from_data(device_data: str | None) -> tuple[str, float]:
    """
    Extract weather prediction from database sensor data
    Returns: (weather_prediction, confidence_percentage)
    """
    if not device_data:
        return "Unknown", 0.0

    try:
        data_list = json.loads(device_data)
        if not isinstance(data_list, list) or not data_list:
            return "Unknown", 0.0

        # Get weather prediction from first device that has it
        # (assuming all devices have the same weather prediction for the park)
        for device in data_list:
            if isinstance(device, dict):
                if 'weather_prediction' in device and 'prediction_confidence' in device:
                    prediction = device['weather_prediction']
                    confidence = float(device['prediction_confidence'])
                    return prediction, confidence

        # If no weather data found in any device
        return "Unknown", 0.0

    except Exception as e:
        print(f"Error extracting weather data: {e}")
        return "Unknown", 0.0


def _confidence_to_verbal(confidence: float, language: str = "en") -> str:
    """
    Convert confidence percentage to verbal expression
    """
    if language == "it":
        if confidence >= 90:
            return "quasi certamente"
        elif confidence >= 80:
            return "molto probabilmente"
        elif confidence >= 70:
            return "probabilmente"
        elif confidence >= 60:
            return "abbastanza probabilmente"
        elif confidence >= 50:
            return "forse"
        else:
            return "potrebbe essere"
    else:  # English
        if confidence >= 90:
            return "almost certainly"
        elif confidence >= 80:
            return "very likely"
        elif confidence >= 70:
            return "likely"
        elif confidence >= 60:
            return "probably"
        elif confidence >= 50:
            return "possibly"
        else:
            return "might be"


def _format_sensor_reading(device: Dict[str, Any], language: str = "en") -> str:
    """Format a single sensor device reading into a readable string"""

    # Labels based on language
    if language == "it":
        labels = {
            "device": "Dispositivo",
            "temp": "Temperatura",
            "humidity": "Umidità",
            "pressure": "Pressione",
            "light": "Luce",
            "noise": "Rumore",
            "tof": "Distanza TOF",
            "location": "Posizione",
            "time": "Ora",
            "weather": "Previsione Meteo",
            "confidence": "Confidenza"
        }
    else:
        labels = {
            "device": "Device",
            "temp": "Temperature",
            "humidity": "Humidity",
            "pressure": "Pressure",
            "light": "Light",
            "noise": "Noise",
            "tof": "TOF Distance",
            "location": "Location",
            "time": "Time",
            "weather": "Weather Prediction",
            "confidence": "Confidence"
        }

    parts = [f"{labels['device']} {device.get('device_id', 'Unknown')}:"]

    # Core environmental readings
    if 'temperature' in device:
        parts.append(f"  {labels['temp']}: {device['temperature']:.1f}°C")
    if 'humidity' in device:
        parts.append(f"  {labels['humidity']}: {device['humidity']}%")
    if 'pressure' in device:
        parts.append(f"  {labels['pressure']}: {device['pressure']:.1f} Pa")
    if 'light' in device:
        parts.append(f"  {labels['light']}: {device['light']}")
    if 'noise' in device:
        parts.append(f"  {labels['noise']}: {device['noise']} dB")
    if 'tof' in device:
        parts.append(f"  {labels['tof']}: {device['tof']} cm")

    # Weather prediction (if available)
    if 'weather_prediction' in device:
        parts.append(f"  {labels['weather']}: {device['weather_prediction']}")
    if 'prediction_confidence' in device:
        parts.append(
            f"  {labels['confidence']}: {device['prediction_confidence']}%")

    # Location data
    if 'latitude' in device and 'longitude' in device:
        parts.append(
            f"  {labels['location']}: ({device['latitude']:.5f}, {device['longitude']:.5f})")

    # Timestamp
    if 'time' in device:
        parts.append(f"  {labels['time']}: {device['time']}")

    return "\n".join(parts)


def _build_sensor_context(device_data: str | None, language: str = "en") -> str:
    """Build sensor context from device data, return placeholder if missing"""
    lang_strings = SYSTEM_PROMPTS.get(language, SYSTEM_PROMPTS["en"])

    if not device_data:
        return lang_strings["no_data"]

    try:
        data_list = json.loads(device_data)
        if not isinstance(data_list, list):
            return lang_strings["invalid_format"]
    except Exception as e:
        print(f"Warning: Could not parse device_data: {e}")
        return lang_strings["parse_error"]

    if not data_list:
        return lang_strings["no_readings"]

    # Format each device reading
    readings = [_format_sensor_reading(device, language)
                for device in data_list if isinstance(device, dict)]

    if not readings:
        return lang_strings["no_readings"]

    return lang_strings["data_header"] + "\n\n" + "\n\n".join(readings)


def _build_weather_context(weather_prediction: str, prediction_confidence: float, language: str = "en") -> str:
    """Build weather prediction context with verbal confidence"""
    lang_strings = SYSTEM_PROMPTS.get(language, SYSTEM_PROMPTS["en"])

    if weather_prediction == "Unknown" or prediction_confidence == 0.0:
        return ""

    verbal_confidence = _confidence_to_verbal(prediction_confidence, language)

    if language == "it":
        weather_text = f"{lang_strings['weather_header']}\nLe condizioni {verbal_confidence} saranno: {weather_prediction}"
    else:
        weather_text = f"{lang_strings['weather_header']}\nConditions will {verbal_confidence} be: {weather_prediction}"

    return weather_text


@router.post("/chat", dependencies=[Security(get_admin_session_user)])
async def process_rag_request(
    user_query: str = Form(None),
    device_data: str = Form(None),
    audio_file: UploadFile = File(None),
    language: str = Form("en"),  # Language selection: 'en' or 'it'
):
    """
    RAG Chat Endpoint - Firebase Admin Only

    Requires valid Firebase admin token in Authorization header:
    Authorization: Bearer <firebase_admin_token>
    """
    try:
        # Validate language parameter
        if language not in ["en", "it"]:
            language = "en"  # Default to English if invalid

        # Debug logging
        print(f"\n=== Groq RAG Request ===")
        print(f"language: {language}")
        print(f"user_query: {user_query}")
        print(
            f"device_data: {device_data[:200] if device_data else 'None'}...")
        print(f"audio_file: {audio_file.filename if audio_file else 'None'}")
        print(
            f"audio_type: {audio_file.content_type if audio_file else 'None'}")

        # Extract weather prediction from database sensor data
        weather_prediction, prediction_confidence = _get_weather_from_data(
            device_data)
        print(
            f"Weather prediction: {weather_prediction} (confidence: {prediction_confidence:.1f}%)")

        # Build context with full sensor data
        context_str = _build_sensor_context(device_data, language)
        weather_context_str = _build_weather_context(
            weather_prediction, prediction_confidence, language)

        # Validate: need at least audio OR text query
        if not user_query and not audio_file:
            error_msg = (
                "Please provide either a text query or an audio recording."
                if language == "en"
                else "Si prega di fornire una query di testo o una registrazione audio."
            )
            raise HTTPException(status_code=400, detail=error_msg)

        transcript = ""

        # Process audio if provided - use Groq Whisper for transcription
        if audio_file:
            audio_bytes = await audio_file.read()
            if not audio_bytes:
                error_msg = (
                    "Audio file is empty."
                    if language == "en"
                    else "Il file audio è vuoto."
                )
                raise HTTPException(status_code=400, detail=error_msg)

            # Size check (Groq supports up to 25MB for Whisper)
            if len(audio_bytes) > 25 * 1024 * 1024:
                error_msg = (
                    "Audio file too large (max 25MB). Please record a shorter message."
                    if language == "en"
                    else "File audio troppo grande (max 25MB). Si prega di registrare un messaggio più breve."
                )
                raise HTTPException(status_code=413, detail=error_msg)

            print(f"Audio size: {len(audio_bytes)} bytes")

            try:
                # Use Groq Whisper for transcription
                import tempfile

                ext = _normalize_audio_mime(audio_file.content_type)
                with tempfile.NamedTemporaryFile(suffix=f".{ext}", delete=False) as temp_audio:
                    temp_audio.write(audio_bytes)
                    temp_audio_path = temp_audio.name

                print(
                    f"Transcribing audio with Groq Whisper (language: {language})...")

                # Transcribe using Groq Whisper with language setting
                with open(temp_audio_path, "rb") as audio_file_handle:
                    transcription = groq_client.audio.transcriptions.create(
                        file=(f"recording.{ext}", audio_file_handle.read()),
                        model="whisper-large-v3-turbo",
                        language=language,
                        response_format="json",
                    )

                transcript = transcription.text.strip()
                print(f"Transcript: {transcript}")

                # Clean up temp file
                import os as os_module
                try:
                    os_module.unlink(temp_audio_path)
                except:
                    pass

                # If transcription is empty, note it
                if not transcript:
                    transcript = (
                        "Unable to transcribe audio"
                        if language == "en"
                        else "Impossibile trascrivere l'audio"
                    )
                    print("Warning: Empty transcription")

            except Exception as whisper_error:
                print(f"Whisper transcription error: {whisper_error}")
                transcript = (
                    "Unable to transcribe audio"
                    if language == "en"
                    else "Impossibile trascrivere l'audio"
                )

        # Determine the actual query text
        unable_to_transcribe = (
            "Unable to transcribe audio" if language == "en"
            else "Impossibile trascrivere l'audio"
        )
        query_text = transcript if transcript and transcript != unable_to_transcribe else user_query

        if not query_text:
            error_response = (
                "I couldn't understand the audio. Could you please try again or type your question?"
                if language == "en"
                else "Non ho capito l'audio. Potresti riprovare o scrivere la tua domanda?"
            )
            return {
                "transcript": transcript,
                "answer": error_response,
                "weather_prediction": weather_prediction,
                "prediction_confidence": prediction_confidence
            }

        # Get language-specific system prompt
        lang_prompts = SYSTEM_PROMPTS.get(language, SYSTEM_PROMPTS["en"])
        system_message = lang_prompts["system_template"].format(
            context=context_str,
            weather_context=weather_context_str
        )

        # Call Groq Chat Completion
        print(
            f"Calling Groq chat completion with query: {query_text[:100]}...")

        chat_completion = groq_client.chat.completions.create(
            messages=[
                {
                    "role": "system",
                    "content": system_message
                },
                {
                    "role": "user",
                    "content": query_text
                }
            ],
            model="llama-3.3-70b-versatile",  # Fast and capable model
            temperature=0.3,
            max_tokens=500,
        )

        answer = chat_completion.choices[0].message.content.strip()
        print(f"Groq response received: {answer[:200]}...")

        # Return structured response with weather prediction
        return {
            "transcript": transcript,
            "answer": answer,
            "weather_prediction": weather_prediction,
            "prediction_confidence": prediction_confidence
        }

    except HTTPException:
        raise
    except Exception as e:
        print(f"\n=== ERROR ===")
        print(f"Error type: {type(e).__name__}")
        print(f"Error message: {str(e)}")
        traceback.print_exc()

        error_detail = (
            f"Server error: {str(e)}"
            if language == "en"
            else f"Errore del server: {str(e)}"
        )
        raise HTTPException(status_code=500, detail=error_detail)
