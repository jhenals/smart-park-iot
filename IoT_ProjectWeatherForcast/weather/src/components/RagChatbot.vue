<script setup>
import { ref, computed, nextTick, onBeforeUnmount } from "vue";
import api from "../utils/api.js";

const isOpen = ref(false);
const messages = ref([]);
const userInput = ref("");
const loading = ref(false);

// Language support
const currentLanguage = ref("en"); // 'en' or 'it'

// Translation dictionary
const translations = {
  en: {
    title: "Park AI Assistant",
    sensors: "Sensors",
    loading: "loading…",
    devices: "devices",
    fallback: "using fallback",
    clearChat: "Clear chat",
    you: "You",
    aiName: "Groq AI",
    thinking: "Groq AI is thinking...",
    whisperTranscript: "🎙️ Groq Whisper Transcript",
    holdToSpeak: "Hold to speak",
    releaseToSend: "Release to send",
    askPlaceholder: "Ask about park conditions...",
    sendMessage: "Send message",
    fallbackText: "Using fallback sensor data. Check backend if needed.",
    helpText: "Lightning-fast responses with Groq. Hold mic to record or type to chat.",
    recordingFormat: "Recording in",
    willTranscribe: "Groq Whisper will transcribe it.",
    micPermissionDenied: "Mic permission denied or recording failed.",
    serverError: "Offline: Could not reach the server or the model.",
    sensorError: "Could not load sensor data. Using fallback.",
    language: "Language",
    groqPowered: "Groq-powered"
  },
  it: {
    title: "Assistente AI del Parco",
    sensors: "Sensori",
    loading: "caricamento…",
    devices: "dispositivi",
    fallback: "uso dati di riserva",
    clearChat: "Cancella chat",
    you: "Tu",
    aiName: "Groq AI",
    thinking: "Groq AI sta pensando...",
    whisperTranscript: "🎙️ Trascrizione Groq Whisper",
    holdToSpeak: "Tieni premuto per parlare",
    releaseToSend: "Rilascia per inviare",
    askPlaceholder: "Chiedi informazioni sulle condizioni del parco...",
    sendMessage: "Invia messaggio",
    fallbackText: "Utilizzo dati sensori di riserva. Controlla il backend se necessario.",
    helpText: "Risposte velocissime con Groq. Tieni premuto il microfono per registrare o scrivi per chattare.",
    recordingFormat: "Registrazione in",
    willTranscribe: "Groq Whisper lo trascriverà.",
    micPermissionDenied: "Permesso microfono negato o registrazione fallita.",
    serverError: "Offline: Impossibile raggiungere il server o il modello.",
    sensorError: "Impossibile caricare i dati del sensore. Utilizzo dati di riserva.",
    language: "Lingua",
    groqPowered: "Alimentato da Groq"
  }
};

// Computed translation helper
const t = computed(() => translations[currentLanguage.value]);

const deviceContext = ref([]);
const contextLoading = ref(false);
const contextError = ref("");
const lastContextAt = ref(null);

// Audio
const isRecording = ref(false);
const recorderMime = ref("");
let mediaRecorder = null;
let mediaStream = null;
let audioChunks = [];

// DOM refs
const messagesEl = ref(null);

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:8000";

/** ---------- Helpers ---------- */
function nowTime() {
  return new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function uid() {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function pushMessage(role, content, extra = {}) {
  messages.value.push({
    id: uid(),
    role,
    content,
    timestamp: nowTime(),
    ...extra, // transcript, error, etc
  });
}

async function scrollToBottom() {
  await nextTick();
  if (messagesEl.value) {
    messagesEl.value.scrollTop = messagesEl.value.scrollHeight;
  }
}

const sensorReady = computed(() => 
  Array.isArray(deviceContext.value) && deviceContext.value.length > 0
);

const canSend = computed(() => 
  !loading.value && userInput.value.trim().length > 0 && sensorReady.value
);

/** ---------- Language switching ---------- */
function toggleLanguage() {
  currentLanguage.value = currentLanguage.value === "en" ? "it" : "en";
  
  // Add a system message about language change
  const langName = currentLanguage.value === "en" ? "English" : "Italiano";
  pushMessage("system", `Language changed to ${langName} / Lingua cambiata in ${langName}`);
  scrollToBottom();
}

/** ---------- Fetch sensors ---------- */
async function fetchDeviceContext() {
  contextLoading.value = true;
  contextError.value = "";

  try {
    console.log('Fetching sensor data from:', `${API_BASE}/api/weather/forecast/?minutes=60`);
    const data = await api.get(`/api/weather/forecast/?minutes=60`);
    console.log('Sensor data received:', data);

    deviceContext.value = data;
    lastContextAt.value = new Date();
    return data;
    
  } catch (e) {
    console.error("Sensor fetch error:", e);
    contextError.value = t.value.sensorError;
    
    // Fallback: provide dummy data with full structure so chat can still work
    const fallbackData = [
      { 
        device_id: 101,
        temperature: 24.4,
        humidity: 46,
        pressure: 96929.1875,
        light: 2,
        noise: 47,
        tof: 238,
        latitude: 39.35516,
        longitude: 16.223233,
        time: new Date().toISOString()
      },
    ];
    
    deviceContext.value = fallbackData;
    return fallbackData;
    
  } finally {
    contextLoading.value = false;
  }
}

/** ---------- Backend call (multipart/form-data) - Groq API ---------- */
async function callRag({ text, audioFileOrBlob }) {
  console.log('\n=== Calling Groq RAG API ===');
  console.log('Text:', text);
  console.log('Audio:', audioFileOrBlob ? `${audioFileOrBlob.size} bytes` : 'none');
  console.log('Language:', currentLanguage.value);

  // Ensure we have sensor context
  let currentData = deviceContext.value;
  
  // If no data yet, try to fetch it
  if (!Array.isArray(currentData) || currentData.length === 0) {
    console.log('No sensor data cached, fetching...');
    currentData = await fetchDeviceContext();
  }

  // Build FormData
  const formData = new FormData();
  
  // Add language preference
  formData.append("language", currentLanguage.value);
  
  // Add device_data (optional in backend)
  if (Array.isArray(currentData) && currentData.length > 0) {
    formData.append("device_data", JSON.stringify(currentData));
    console.log('Sending sensor data:', currentData.length, 'devices');
  } else {
    console.warn('No sensor data available - backend will use fallback');
  }

  // Add text query if provided
  if (text && text.trim().length) {
    formData.append("user_query", text.trim());
    console.log('Sending text query:', text.trim());
  }

  // Add audio if provided (Groq supports up to 25MB)
  if (audioFileOrBlob) {
    if (audioFileOrBlob instanceof Blob && !(audioFileOrBlob instanceof File)) {
      const ext = 
        recorderMime.value.includes("ogg") ? "ogg" :
        recorderMime.value.includes("wav") ? "wav" :
        recorderMime.value.includes("webm") ? "webm" : "wav";
      
      formData.append("audio_file", audioFileOrBlob, `recording.${ext}`);
      console.log(`Sending audio: recording.${ext}, ${audioFileOrBlob.size} bytes, MIME: ${recorderMime.value}`);
    } else {
      formData.append("audio_file", audioFileOrBlob);
      console.log('Sending audio file:', audioFileOrBlob.name);
    }
  }

  // Send request to Groq-powered backend
  console.log('Sending to:', `${API_BASE}/api/rag/chat`);
  
  const token = localStorage.getItem("accessToken");
  const res = await fetch(`${API_BASE}/api/rag/chat`, {
    method: "POST",
    body: formData,
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    // ✅ Do NOT set Content-Type - let browser handle multipart boundaries
  });

  console.log('Response status:', res.status);

  // Parse response
  let data;
  try {
    data = await res.json();
    console.log('Response data:', data);
  } catch (parseErr) {
    console.error('Failed to parse JSON:', parseErr);
    const textResponse = await res.text();
    console.error('Raw response:', textResponse);
    data = { answer: "Server returned a non-JSON response." };
  }

  if (!res.ok) {
    const detail = data?.detail ? JSON.stringify(data.detail) : "Unknown server error";
    throw new Error(`Groq RAG API error (${res.status}): ${detail}`);
  }

  // Response format from Groq backend: { transcript, answer }
  const transcript = data?.transcript ?? "";
  const answer = data?.answer ?? "";

  console.log('Transcript:', transcript || '(none)');
  console.log('Answer:', answer || '(empty)');

  return { transcript, answer };
}

/** ---------- Text send ---------- */
async function sendMessage() {
  const text = userInput.value.trim();
  if (!text) return;

  console.log('Sending text message:', text);

  pushMessage("user", text);
  userInput.value = "";
  loading.value = true;

  try {
    const { transcript, answer } = await callRag({ text });
    
    pushMessage("assistant", answer || "(empty response)", { 
      transcript: transcript || "" 
    });
    
  } catch (e) {
    console.error('Send message error:', e);
    
    pushMessage("assistant", t.value.serverError, {
      error: String(e?.message || e),
    });
    
  } finally {
    loading.value = false;
    await scrollToBottom();
  }
}

/** ---------- Recording (press & hold) ---------- */
function pickBestMimeType() {
  // Priority for Groq Whisper: WAV > OGG > WebM
  // Groq Whisper supports: flac, mp3, mp4, mpeg, mpga, m4a, ogg, wav, or webm
  const candidates = [
    "audio/wav",
    "audio/ogg;codecs=opus",
    "audio/webm;codecs=opus",
    "audio/webm"
  ];
  
  for (const candidate of candidates) {
    if (window.MediaRecorder && MediaRecorder.isTypeSupported(candidate)) {
      console.log('Selected MIME type:', candidate);
      return candidate;
    }
  }
  
  console.warn('No supported MIME type found, using default');
  return ""; // Let browser decide
}

async function startRecording() {
  if (isRecording.value || loading.value) return;

  console.log('Starting recording...');

  try {
    // Request microphone access
    mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    console.log('Microphone access granted');

    const mime = pickBestMimeType();
    recorderMime.value = mime || "audio/webm";

    // Create MediaRecorder
    mediaRecorder = mime
      ? new MediaRecorder(mediaStream, { mimeType: mime })
      : new MediaRecorder(mediaStream);

    audioChunks = [];
    
    mediaRecorder.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) {
        console.log('Audio chunk received:', e.data.size, 'bytes');
        audioChunks.push(e.data);
      }
    };

    mediaRecorder.onerror = (e) => {
      console.error('MediaRecorder error:', e);
    };

    mediaRecorder.start();
    isRecording.value = true;
    console.log('Recording started with MIME:', recorderMime.value);
    
  } catch (e) {
    console.error('Recording start failed:', e);
    
    pushMessage("assistant", t.value.micPermissionDenied, { 
      error: String(e?.message || e) 
    });
    
    isRecording.value = false;
    cleanupMedia();
    await scrollToBottom();
  }
}

async function stopRecording() {
  if (!isRecording.value || !mediaRecorder) return;

  console.log('Stopping recording...');

  return new Promise((resolve) => {
    if (mediaRecorder.state === "recording") {
      mediaRecorder.onstop = async () => {
        console.log('Recording stopped, processing audio...');
        
        if (audioChunks.length === 0) {
          console.warn('No audio chunks recorded');
          isRecording.value = false;
          cleanupMedia();
          resolve();
          return;
        }

        const blob = new Blob(audioChunks, { type: recorderMime.value });
        console.log('Audio blob created:', blob.size, 'bytes, type:', blob.type);

        if (blob.size === 0) {
          console.warn('Empty audio blob');
          isRecording.value = false;
          cleanupMedia();
          resolve();
          return;
        }

        // Show recording indicator
        pushMessage("user", "🎙️ Voice message");
        loading.value = true;

        try {
          const { transcript, answer } = await callRag({ audioFileOrBlob: blob });
          
          pushMessage("assistant", answer || "(empty response)", { 
            transcript: transcript || "" 
          });
          
        } catch (e) {
          console.error('Audio processing error:', e);
          
          pushMessage("assistant", t.value.serverError, {
            error: String(e?.message || e),
          });
          
        } finally {
          loading.value = false;
          isRecording.value = false;
          cleanupMedia();
          await scrollToBottom();
          resolve();
        }
      };

      mediaRecorder.stop();
    } else {
      console.warn('MediaRecorder not in recording state');
      isRecording.value = false;
      cleanupMedia();
      resolve();
    }
  });
}

function cleanupMedia() {
  if (mediaStream) {
    mediaStream.getTracks().forEach((track) => track.stop());
    mediaStream = null;
  }
  mediaRecorder = null;
  audioChunks = [];
}

function onMicDown(e) {
  e.preventDefault();
  startRecording();
}

function onMicUp(e) {
  e.preventDefault();
  if (isRecording.value) {
    stopRecording();
  }
}

/** ---------- Chat controls ---------- */
function toggleChat() {
  isOpen.value = !isOpen.value;
  if (isOpen.value && deviceContext.value.length === 0) {
    fetchDeviceContext();
  }
}

function clearChat() {
  messages.value = [];
}

/** ---------- Cleanup on unmount ---------- */
onBeforeUnmount(() => {
  cleanupMedia();
});
</script>

<template>
  <div class="rag-wrapper">
    <!-- Floating action button -->
    <button 
      class="chat-fab btn btn-primary rounded-circle shadow-lg d-flex align-items-center justify-content-center"
      @click="toggleChat"
      aria-label="Open chat"
    >
      <i class="bi bi-robot fs-1"></i>
    </button>

    <!-- Chat window -->
    <div v-if="isOpen" class="chat-container card shadow-lg border-0">
      <!-- Header -->
      <div class="card-header bg-primary text-white d-flex justify-content-between align-items-center py-3">
        <div class="d-flex flex-column flex-grow-1">
          <h6 class="mb-0">
            <i class="bi bi-robot me-2"></i> {{ t.title }}
          </h6>
          <small class="opacity-75">
            ⚡ {{ t.groqPowered }} • 
            {{ t.sensors }}:
            <span v-if="contextLoading" class="ms-1">{{ t.loading }}</span>
            <span v-else-if="sensorReady" class="ms-1 text-success">✓ {{ deviceContext.length }} {{ t.devices }}</span>
            <span v-else class="ms-1 text-warning">⚠ {{ t.fallback }}</span>
            <span v-if="lastContextAt" class="ms-2">
              • {{ lastContextAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) }}
            </span>
          </small>
        </div>

        <div class="d-flex gap-2 align-items-center">
          <!-- Language toggle -->
          <button 
            class="btn btn-sm btn-light language-btn" 
            @click="toggleLanguage" 
            :title="t.language"
          >
            <span class="flag-icon">{{ currentLanguage === 'en' ? '🇬🇧' : '🇮🇹' }}</span>
          </button>
          
          <button 
            class="btn btn-sm btn-light" 
            @click="clearChat" 
            :title="t.clearChat"
          >
            <i class="bi bi-trash"></i>
          </button>
          <button 
            class="btn-close btn-close-white" 
            @click="isOpen = false" 
            aria-label="Close"
          ></button>
        </div>
      </div>

      <!-- Messages -->
      <div ref="messagesEl" class="card-body chat-messages p-3 bg-light">
        <div
          v-for="m in messages"
          :key="m.id"
          :class="[
            'd-flex mb-3',
            m.role === 'user' ? 'justify-content-end' : 
            m.role === 'system' ? 'justify-content-center' : 'justify-content-start'
          ]"
        >
          <div
            :class="[
              'p-3 rounded-4 shadow-sm',
              m.role === 'user' ? 'bg-primary text-white max-w-75' : 
              m.role === 'system' ? 'bg-info text-white system-message' :
              'bg-white text-dark border max-w-75'
            ]"
          >
            <!-- Message header (skip for system messages) -->
            <div v-if="m.role !== 'system'" class="small opacity-75 mb-1 d-flex justify-content-between gap-3">
              <span>{{ m.role === 'user' ? t.you : t.aiName }}</span>
              <span>{{ m.timestamp }}</span>
            </div>

            <!-- Message content -->
            <div class="message-content">{{ m.content }}</div>

            <!-- Transcript (from Groq Whisper) -->
            <details v-if="m.transcript" class="mt-2">
              <summary class="small user-select-none cursor-pointer">
                {{ t.whisperTranscript }}
              </summary>
              <pre class="transcript-box mt-2 mb-0">{{ m.transcript }}</pre>
            </details>

            <!-- Error (if any) -->
            <div v-if="m.error" class="mt-2 small text-danger">
              <i class="bi bi-exclamation-triangle-fill me-1"></i>
              {{ m.error }}
            </div>
          </div>
        </div>

        <!-- Loading indicator -->
        <div v-if="loading" class="text-muted small fst-italic">
          <span class="spinner-grow spinner-grow-sm me-2"></span> 
          {{ t.thinking }}
        </div>

        <!-- Context error -->
        <div v-if="contextError" class="alert alert-warning small mt-2 py-2" role="alert">
          <i class="bi bi-exclamation-circle me-1"></i>
          {{ contextError }}
        </div>

        <!-- Recording format info -->
        <div v-if="recorderMime && recorderMime.includes('webm')" class="alert alert-info small mt-2 py-2">
          <i class="bi bi-info-circle me-1"></i>
          {{ t.recordingFormat }} <code>{{ recorderMime }}</code>. {{ t.willTranscribe }}
        </div>
      </div>

      <!-- Input footer -->
      <div class="card-footer bg-white border-top-0 p-3">
        <div class="input-group">
          <!-- Mic button: press and hold -->
          <button
            class="btn btn-outline-secondary"
            :class="{ 'btn-danger text-white': isRecording }"
            @pointerdown="onMicDown"
            @pointerup="onMicUp"
            @pointercancel="onMicUp"
            @pointerleave="onMicUp"
            :disabled="loading"
            :title="isRecording ? t.releaseToSend : t.holdToSpeak"
          >
            <i 
              class="bi" 
              :class="isRecording ? 'bi-mic-fill' : 'bi-mic'"
            ></i>
          </button>

          <!-- Text input -->
          <input
            v-model="userInput"
            @keyup.enter="sendMessage"
            class="form-control border-start-0"
            :placeholder="t.askPlaceholder"
            :disabled="loading"
          />

          <!-- Send button -->
          <button 
            class="btn btn-primary px-3" 
            @click="sendMessage" 
            :disabled="!canSend"
            :title="t.sendMessage"
          >
            <i class="bi bi-send-fill"></i>
          </button>
        </div>

        <!-- Help text -->
        <div class="small text-muted mt-2">
          <i class="bi bi-lightning-charge-fill me-1 text-warning"></i>
          <span v-if="!sensorReady && !contextLoading">
            {{ t.fallbackText }}
          </span>
          <span v-else>
            {{ t.helpText }}
          </span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.rag-wrapper {
  font-family: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
}

.chat-fab {
  position: fixed;
  bottom: 30px;
  right: 30px;
  width: 70px;
  height: 70px;
  z-index: 9999;
  transition: transform 0.2s ease;
  border: none;
}

.chat-fab:hover {
  transform: scale(1.05);
}

.chat-container {
  position: fixed;
  bottom: 110px;
  right: 30px;
  width: 380px;
  height: 550px;
  z-index: 9999;
  border-radius: 20px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.chat-messages {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
}

.max-w-75 {
  max-width: 80%;
}

.message-content {
  word-wrap: break-word;
  white-space: pre-wrap;
}

.system-message {
  font-size: 0.85rem;
  max-width: 90%;
}

.language-btn {
  min-width: 48px;
  padding: 0.25rem 0.5rem;
}

.flag-icon {
  font-size: 1.2rem;
  line-height: 1;
}

.chat-messages::-webkit-scrollbar {
  width: 6px;
}

.chat-messages::-webkit-scrollbar-thumb {
  background: #dee2e6;
  border-radius: 10px;
}

.chat-messages::-webkit-scrollbar-track {
  background: transparent;
}

.transcript-box {
  background: #0f172a;
  color: #e2e8f0;
  padding: 10px;
  border-radius: 8px;
  font-size: 0.85em;
  overflow: auto;
  white-space: pre-wrap;
  word-break: break-word;
  max-height: 200px;
  border-left: 3px solid #3b82f6;
}

.cursor-pointer {
  cursor: pointer;
}

details summary {
  list-style: none;
}

details summary::-webkit-details-marker {
  display: none;
}

details[open] summary {
  margin-bottom: 0.5rem;
}

/* Mobile responsive */
@media (max-width: 576px) {
  .chat-container {
    right: 15px;
    left: 15px;
    width: auto;
    bottom: 90px;
  }
  
  .chat-fab {
    right: 15px;
    bottom: 15px;
    width: 60px;
    height: 60px;
  }
}

/* Animation for recording */
@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.6; }
}

.btn-danger.text-white i {
  animation: pulse 1s ease-in-out infinite;
}

/* Groq branding accent */
.text-warning {
  color: #f59e0b !important;
}
</style>