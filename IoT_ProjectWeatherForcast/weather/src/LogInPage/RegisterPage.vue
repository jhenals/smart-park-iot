<script setup>
import { ref } from 'vue'

const emit = defineEmits(['go-login'])

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8000'

const username = ref('')
const password = ref('')
const confirmPassword = ref('')
const loading = ref(false)
const error = ref('')
const success = ref(false)
const showPassword = ref(false)

function validateForm() {
  if (!username.value.trim()) {
    error.value = 'Username is required.'
    return false
  }
  if (username.value.trim().length < 3) {
    error.value = 'Username must be at least 3 characters.'
    return false
  }
  if (!password.value) {
    error.value = 'Password is required.'
    return false
  }
  if (password.value.length < 6) {
    error.value = 'Password must be at least 6 characters.'
    return false
  }
  if (password.value !== confirmPassword.value) {
    error.value = 'Passwords do not match.'
    return false
  }
  return true
}

// Password strength helper
function getPasswordStrength(pw) {
  if (!pw) return { level: 0, label: '', color: '' }
  let score = 0
  if (pw.length >= 8) score++
  if (/[A-Z]/.test(pw)) score++
  if (/[0-9]/.test(pw)) score++
  if (/[^A-Za-z0-9]/.test(pw)) score++
  const levels = [
    { level: 0, label: '', color: '' },
    { level: 1, label: 'Weak', color: '#ff6b6b' },
    { level: 2, label: 'Fair', color: '#ffa94d' },
    { level: 3, label: 'Good', color: '#69db7c' },
    { level: 4, label: 'Strong', color: '#51cf66' },
  ]
  return levels[score] || levels[0]
}

const passwordStrength = computed => getPasswordStrength(password.value)

import { computed } from 'vue'
const strength = computed(() => getPasswordStrength(password.value))

async function handleRegister() {
  error.value = ''
  if (!validateForm()) return

  loading.value = true

  try {
    // Send credentials in JSON body (secure) instead of URL query parameters
    const res = await fetch(`${API_BASE}/api/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        username: username.value.trim(),
        password: password.value
      })
    })

    const data = await res.json()

    if (!res.ok) {
      error.value = data.detail || 'Registration failed. Please try again.'
      return
    }

    success.value = true

  } catch (e) {
    error.value = 'Could not connect to the server. Is the backend running?'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="register-wrapper d-flex align-items-center justify-content-center">

    <div class="bg-blob blob-1"></div>
    <div class="bg-blob blob-2"></div>

    <div class="register-card">

      <!-- Success state -->
      <div v-if="success" class="text-center success-state">
        <div class="success-icon mx-auto mb-3">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
            <path d="M20 6 9 17l-5-5" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </div>
        <h2 class="card-title mb-2">Account Created!</h2>
        <p class="card-subtitle mb-4" style="text-transform:none;letter-spacing:0;font-size:0.95rem;">
          Your park admin account is ready. You can now sign in.
        </p>
        <button class="btn-login w-100" @click="emit('go-login')">
          Go to Login
        </button>
      </div>

      <!-- Form state -->
      <template v-else>
        <div class="text-center mb-4">
          <div class="logo-icon mx-auto mb-3">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
              <path d="M12 2 3 7v10l9 5 9-5V7l-9-5Z" stroke="white" stroke-width="1.5"/>
              <path d="M12 2v20M3 7l9 5 9-5" stroke="white" stroke-width="1" opacity=".4"/>
            </svg>
          </div>
          <h1 class="card-title">Create Account</h1>
          <p class="card-subtitle">Register as a Park Administrator</p>
        </div>

        <!-- Error alert -->
        <div v-if="error" class="alert-error mb-3">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" class="me-2" style="flex-shrink:0">
            <circle cx="12" cy="12" r="10" stroke="#ff6b6b" stroke-width="1.5"/>
            <path d="M12 8v4M12 16h.01" stroke="#ff6b6b" stroke-width="1.5" stroke-linecap="round"/>
          </svg>
          {{ error }}
        </div>

        <!-- Username -->
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
              placeholder="Choose a username"
              autocomplete="username"
            />
          </div>
          <p class="hint">Minimum 3 characters</p>
        </div>

        <!-- Password -->
        <div class="mb-2">
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
              placeholder="Create a password"
              autocomplete="new-password"
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

        <!-- Password strength bar -->
        <div v-if="password" class="strength-bar-wrapper mb-3">
          <div class="strength-bar">
            <div
              class="strength-fill"
              :style="{ width: (strength.level / 4 * 100) + '%', background: strength.color }"
            ></div>
          </div>
          <span class="strength-label" :style="{ color: strength.color }">{{ strength.label }}</span>
        </div>

        <!-- Confirm Password -->
        <div class="mb-4">
          <label class="form-label">Confirm Password</label>
          <div class="input-wrapper">
            <svg class="input-icon" width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="M20 7H4a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2Z" stroke="currentColor" stroke-width="1.5"/>
              <path d="M16 7V5a4 4 0 0 0-8 0v2" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
            </svg>
            <input
              v-model="confirmPassword"
              type="password"
              class="form-input"
              :class="{ 'input-match': confirmPassword && confirmPassword === password, 'input-mismatch': confirmPassword && confirmPassword !== password }"
              placeholder="Repeat your password"
              autocomplete="new-password"
              @keyup.enter="handleRegister"
            />
          </div>
        </div>

        <button
          class="btn-login w-100 mb-3"
          @click="handleRegister"
          :disabled="loading"
        >
          <span v-if="loading" class="spinner me-2"></span>
          <span>{{ loading ? 'Creating account...' : 'Create Account' }}</span>
        </button>

        <p class="text-center register-link">
          Already have an account?
          <button class="link-btn" @click="emit('go-login')">Sign in</button>
        </p>
      </template>
    </div>
  </div>
</template>

<style scoped>
.register-wrapper {
  min-height: 100vh;
  background: linear-gradient(135deg, #020d18 0%, #052a45 50%, #061f33 100%);
  position: relative;
  overflow: hidden;
  font-family: 'Segoe UI', system-ui, sans-serif;
}

.bg-blob { position: absolute; border-radius: 50%; filter: blur(80px); opacity: 0.12; pointer-events: none; }
.blob-1 { width: 500px; height: 500px; background: radial-gradient(circle, #1a6fa8, transparent); top: -150px; left: -150px; animation: drift 12s ease-in-out infinite alternate; }
.blob-2 { width: 400px; height: 400px; background: radial-gradient(circle, #0a4a6e, transparent); bottom: -100px; right: -100px; animation: drift 16s ease-in-out infinite alternate-reverse; }

@keyframes drift {
  from { transform: translate(0, 0) scale(1); }
  to   { transform: translate(40px, 40px) scale(1.1); }
}

.register-card {
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
  display: flex; align-items: center; justify-content: center;
  box-shadow: 0 8px 24px rgba(26, 111, 168, 0.4);
}

.success-icon {
  width: 70px; height: 70px;
  background: linear-gradient(135deg, #2f9e44, #1e7a34);
  border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  box-shadow: 0 8px 24px rgba(47, 158, 68, 0.4);
  animation: popIn 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
}

@keyframes popIn {
  from { transform: scale(0); opacity: 0; }
  to   { transform: scale(1); opacity: 1; }
}

.card-title { font-size: 1.6rem; font-weight: 700; color: #fff; letter-spacing: -0.3px; margin: 0; }
.card-subtitle { color: rgba(255,255,255,0.45); font-size: 0.85rem; margin: 0.25rem 0 0; letter-spacing: 0.5px; text-transform: uppercase; }

.alert-error {
  background: rgba(255,107,107,0.1); border: 1px solid rgba(255,107,107,0.3);
  border-radius: 10px; padding: 0.75rem 1rem; color: #ff9999; font-size: 0.875rem;
  display: flex; align-items: center;
}

.form-label { color: rgba(255,255,255,0.6); font-size: 0.8rem; font-weight: 500; letter-spacing: 0.5px; text-transform: uppercase; margin-bottom: 0.5rem; display: block; }

.hint { color: rgba(255,255,255,0.25); font-size: 0.75rem; margin: 0.3rem 0 0; }

.input-wrapper { position: relative; display: flex; align-items: center; }
.input-icon { position: absolute; left: 14px; color: rgba(255,255,255,0.35); pointer-events: none; }

.form-input {
  width: 100%; background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.1);
  border-radius: 10px; padding: 0.75rem 2.8rem; color: #fff; font-size: 0.925rem;
  outline: none; transition: border-color 0.2s, background 0.2s;
}
.form-input:focus { border-color: rgba(26,111,168,0.7); background: rgba(255,255,255,0.09); }
.form-input::placeholder { color: rgba(255,255,255,0.25); }
.input-match { border-color: rgba(81, 207, 102, 0.5) !important; }
.input-mismatch { border-color: rgba(255, 107, 107, 0.5) !important; }

.toggle-password {
  position: absolute; right: 12px; background: none; border: none;
  color: rgba(255,255,255,0.35); cursor: pointer; padding: 4px; line-height: 0;
  transition: color 0.2s;
}
.toggle-password:hover { color: rgba(255,255,255,0.7); }

.strength-bar-wrapper { display: flex; align-items: center; gap: 10px; }
.strength-bar { flex: 1; height: 4px; background: rgba(255,255,255,0.1); border-radius: 2px; overflow: hidden; }
.strength-fill { height: 100%; border-radius: 2px; transition: width 0.3s ease, background 0.3s ease; }
.strength-label { font-size: 0.75rem; font-weight: 600; min-width: 44px; }

.btn-login {
  background: linear-gradient(135deg, #1a6fa8, #0d5280); border: none; border-radius: 10px;
  padding: 0.85rem; color: #fff; font-size: 0.95rem; font-weight: 600; cursor: pointer;
  transition: opacity 0.2s, transform 0.15s; display: flex; align-items: center; justify-content: center;
  box-shadow: 0 4px 16px rgba(26,111,168,0.4); letter-spacing: 0.3px;
}
.btn-login:hover:not(:disabled) { opacity: 0.9; transform: translateY(-1px); }
.btn-login:disabled { opacity: 0.6; cursor: not-allowed; }

.spinner {
  width: 16px; height: 16px; border: 2px solid rgba(255,255,255,0.3);
  border-top-color: #fff; border-radius: 50%; animation: spin 0.7s linear infinite; display: inline-block;
}
@keyframes spin { to { transform: rotate(360deg); } }

.register-link { color: rgba(255,255,255,0.4); font-size: 0.875rem; margin: 0; }
.link-btn { background: none; border: none; color: #5ab4e8; cursor: pointer; padding: 0; font-size: inherit; text-decoration: underline; text-underline-offset: 2px; }
.link-btn:hover { color: #7dc9f5; }
</style>