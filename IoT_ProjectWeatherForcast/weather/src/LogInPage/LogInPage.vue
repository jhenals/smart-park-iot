<script setup>
import { ref } from 'vue'

const emit = defineEmits(['login-success', 'go-register'])

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8000'

const username = ref('')
const password = ref('')
const loading = ref(false)
const error = ref('')
const showPassword = ref(false)

async function handleLogin() {
  // Validate inputs
  if (!username.value || !password.value) {
    error.value = 'Please enter both username and password.'
    return
  }

  loading.value = true
  error.value = ''

  try {
    // FastAPI's OAuth2 login expects form data, not JSON
    const formData = new URLSearchParams()
    formData.append('username', username.value.trim())
    formData.append('password', password.value)

    const res = await fetch(`${API_BASE}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: formData.toString()
    })

    const data = await res.json()

    if (!res.ok) {
      error.value = data.detail || 'Invalid username or password.'
      return
    }

    // Store token in localStorage so it persists on page refresh
    localStorage.setItem('access_token', data.access_token)
    localStorage.setItem('username', username.value.trim())

    emit('login-success', { token: data.access_token, username: username.value.trim() })

  } catch (e) {
    console.error('Login error:', e)
    error.value = 'Could not connect to the server. Is the backend running?'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="login-wrapper d-flex align-items-center justify-content-center">

    <!-- Animated background blobs -->
    <div class="bg-blob blob-1"></div>
    <div class="bg-blob blob-2"></div>

    <div class="login-card">
      <!-- Header -->
      <div class="text-center mb-4">
        <div class="logo-icon mx-auto mb-3">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
            <path d="M12 2 3 7v10l9 5 9-5V7l-9-5Z" stroke="white" stroke-width="1.5"/>
            <path d="M12 2v20M3 7l9 5 9-5" stroke="white" stroke-width="1" opacity=".4"/>
          </svg>
        </div>
        <h1 class="card-title">IOT Smart Park</h1>
        <p class="card-subtitle">Park Administration System</p>
      </div>

      <!-- Error alert -->
      <div v-if="error" class="alert-error mb-3">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" class="me-2" style="flex-shrink:0">
          <circle cx="12" cy="12" r="10" stroke="#ff6b6b" stroke-width="1.5"/>
          <path d="M12 8v4M12 16h.01" stroke="#ff6b6b" stroke-width="1.5" stroke-linecap="round"/>
        </svg>
        {{ error }}
      </div>

      <!-- Form -->
      <div class="mb-3">
        <label class="form-label">Username</label>
        <div class="input-wrapper">
          <svg class="input-icon" width="16" height="16" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="8" r="4" stroke="currentColor" stroke-width="1.5"/>
            <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
          </svg>
          <input
            v-model="username"
            type="text"
            class="form-input"
            placeholder="Enter your username"
            @keyup.enter="handleLogin"
            autocomplete="username"
          />
        </div>
      </div>

      <div class="mb-4">
        <label class="form-label">Password</label>
        <div class="input-wrapper">
          <svg class="input-icon" width="16" height="16" viewBox="0 0 24 24" fill="none">
            <rect x="3" y="11" width="18" height="11" rx="2" stroke="currentColor" stroke-width="1.5"/>
            <path d="M7 11V7a5 5 0 0 1 10 0v4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
          </svg>
          <input
            v-model="password"
            :type="showPassword ? 'text' : 'password'"
            class="form-input"
            placeholder="Enter your password"
            @keyup.enter="handleLogin"
            autocomplete="current-password"
          />
          <button class="toggle-password" @click="showPassword = !showPassword" type="button">
            <svg v-if="!showPassword" width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8Z" stroke="currentColor" stroke-width="1.5"/>
              <circle cx="12" cy="12" r="3" stroke="currentColor" stroke-width="1.5"/>
            </svg>
            <svg v-else width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19M1 1l22 22" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
            </svg>
          </button>
        </div>
      </div>

      <button
        class="btn-login w-100 mb-3"
        @click="handleLogin"
        :disabled="loading"
      >
        <span v-if="loading" class="spinner me-2"></span>
        <span>{{ loading ? 'Signing in...' : 'Sign In' }}</span>
      </button>

      <p class="text-center register-link">
        Don't have an account?
        <button class="link-btn" @click="emit('go-register')">Create one</button>
      </p>
    </div>
  </div>
</template>

<style scoped>
.login-wrapper {
  min-height: 100vh;
  background: linear-gradient(135deg, #020d18 0%, #052a45 50%, #061f33 100%);
  position: relative;
  overflow: hidden;
  font-family: 'Segoe UI', system-ui, sans-serif;
}

.bg-blob {
  position: absolute;
  border-radius: 50%;
  filter: blur(80px);
  opacity: 0.12;
  pointer-events: none;
}

.blob-1 {
  width: 500px; height: 500px;
  background: radial-gradient(circle, #1a6fa8, transparent);
  top: -150px; left: -150px;
  animation: drift 12s ease-in-out infinite alternate;
}

.blob-2 {
  width: 400px; height: 400px;
  background: radial-gradient(circle, #0a4a6e, transparent);
  bottom: -100px; right: -100px;
  animation: drift 16s ease-in-out infinite alternate-reverse;
}

@keyframes drift {
  from { transform: translate(0, 0) scale(1); }
  to   { transform: translate(40px, 40px) scale(1.1); }
}

.login-card {
  background: rgba(255, 255, 255, 0.04);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 20px;
  padding: 2.5rem;
  width: 100%;
  max-width: 420px;
  box-shadow: 0 32px 64px rgba(0, 0, 0, 0.5);
  position: relative;
  z-index: 1;
  animation: slideUp 0.5s ease;
}

@keyframes slideUp {
  from { opacity: 0; transform: translateY(24px); }
  to   { opacity: 1; transform: translateY(0); }
}

.logo-icon {
  width: 60px; height: 60px;
  background: linear-gradient(135deg, #1a6fa8, #0a4a6e);
  border-radius: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 8px 24px rgba(26, 111, 168, 0.4);
}

.card-title {
  font-size: 1.6rem;
  font-weight: 700;
  color: #fff;
  letter-spacing: -0.3px;
  margin: 0;
}

.card-subtitle {
  color: rgba(255,255,255,0.45);
  font-size: 0.85rem;
  margin: 0.25rem 0 0;
  letter-spacing: 0.5px;
  text-transform: uppercase;
}

.alert-error {
  background: rgba(255, 107, 107, 0.1);
  border: 1px solid rgba(255, 107, 107, 0.3);
  border-radius: 10px;
  padding: 0.75rem 1rem;
  color: #ff9999;
  font-size: 0.875rem;
  display: flex;
  align-items: center;
}

.form-label {
  color: rgba(255,255,255,0.6);
  font-size: 0.8rem;
  font-weight: 500;
  letter-spacing: 0.5px;
  text-transform: uppercase;
  margin-bottom: 0.5rem;
  display: block;
}

.input-wrapper {
  position: relative;
  display: flex;
  align-items: center;
}

.input-icon {
  position: absolute;
  left: 14px;
  color: rgba(255,255,255,0.35);
  pointer-events: none;
}

.form-input {
  width: 100%;
  background: rgba(255,255,255,0.06);
  border: 1px solid rgba(255,255,255,0.1);
  border-radius: 10px;
  padding: 0.75rem 2.8rem;
  color: #fff;
  font-size: 0.925rem;
  outline: none;
  transition: border-color 0.2s, background 0.2s;
}

.form-input:focus {
  border-color: rgba(26, 111, 168, 0.7);
  background: rgba(255,255,255,0.09);
}

.form-input::placeholder { color: rgba(255,255,255,0.25); }

.toggle-password {
  position: absolute;
  right: 12px;
  background: none;
  border: none;
  color: rgba(255,255,255,0.35);
  cursor: pointer;
  padding: 4px;
  line-height: 0;
  transition: color 0.2s;
}
.toggle-password:hover { color: rgba(255,255,255,0.7); }

.btn-login {
  background: linear-gradient(135deg, #1a6fa8, #0d5280);
  border: none;
  border-radius: 10px;
  padding: 0.85rem;
  color: #fff;
  font-size: 0.95rem;
  font-weight: 600;
  cursor: pointer;
  transition: opacity 0.2s, transform 0.15s;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 16px rgba(26, 111, 168, 0.4);
  letter-spacing: 0.3px;
}

.btn-login:hover:not(:disabled) {
  opacity: 0.9;
  transform: translateY(-1px);
}

.btn-login:disabled { opacity: 0.6; cursor: not-allowed; }

.spinner {
  width: 16px; height: 16px;
  border: 2px solid rgba(255,255,255,0.3);
  border-top-color: #fff;
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
  display: inline-block;
}

@keyframes spin { to { transform: rotate(360deg); } }

.register-link {
  color: rgba(255,255,255,0.4);
  font-size: 0.875rem;
  margin: 0;
}

.link-btn {
  background: none;
  border: none;
  color: #5ab4e8;
  cursor: pointer;
  padding: 0;
  font-size: inherit;
  text-decoration: underline;
  text-underline-offset: 2px;
}

.link-btn:hover { color: #7dc9f5; }
</style>