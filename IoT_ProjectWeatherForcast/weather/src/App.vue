<!-- Updated App.vue - Direct Dashboard Access -->
<script setup>
import { ref, onMounted } from 'vue'
import { initializeAuth, requireAuth, getUserSession, logout as authLogout } from './utils/auth-handler'

// Pages
import SensorDashboardPage from './pages/SensorDashboardPage.vue'
import GroupMembersPage from './pages/GroupMembersPage.vue'
import WeatherPage from './pages/WeatherPage.vue'
import HelpPage from './pages/HelpPage.vue'
import DocsPage from './pages/DocsPage.vue'
import ChartPage from './components/SideNavEffect/ChartPage.vue'
import GearPage from './components/SideNavEffect/GearPage.vue'
import GridPage from './components/SideNavEffect/GridPage.vue'
import UploadPage from './components/SideNavEffect/UploadPage.vue'

// Layout
import Sidebar from './components/layout/SidebarNav.vue'

// ── Navigation state ──────────────────────────────────────────────
const currentPage = ref('dashboard')
const userEmail = ref('')

// ── Authentication initialization ─────────────────────────────────
onMounted(async () => {
  // Initialize auth - checks session cookie
  const authStatus = await initializeAuth()

  if (!authStatus) {
    // Not authenticated - redirect to login
    requireAuth()
  } else {
    // Get user info
    const session = getUserSession()
    userEmail.value = session?.email || 'User'
    console.log('✅ Dashboard loaded for:', userEmail.value)
  }
})

function navigateTo(page) {
  currentPage.value = page
}

function logout() {
  // Use the auth-handler logout (clears all tokens and redirects)
  authLogout()
}
</script>

<template>
  <!-- ── MAIN APP ───────────── -->
  <div class="d-flex">
    <!-- Sidebar -->
    <Sidebar @navigate="navigateTo" />

    <!-- Main Content Area -->
    <div class="flex-grow-1">
      <!-- Top Navigation -->
      <nav class="navbar navbar-dark bg-dark border-bottom">
        <div class="container-fluid">
          <span class="navbar-brand mb-1 h4">
            <i class="bi bi-cloud-sun-fill me-2"></i>
            IOT-Smart Park
          </span>

          <div class="d-flex gap-2 align-items-center">
            <button
              @click="navigateTo('dashboard')"
              :class="['btn btn-sm', currentPage === 'dashboard' ? 'btn-primary' : 'btn-outline-light']"
            >
              <i class="bi bi-speedometer2 me-1"></i>Dashboard
            </button>
            <button
              @click="navigateTo('weather')"
              :class="['btn btn-sm', currentPage === 'weather' ? 'btn-primary' : 'btn-outline-light']"
            >
              <i class="bi bi-cloud-sun me-1"></i>Weather
            </button>
            <button
              @click="navigateTo('help')"
              :class="['btn btn-sm', currentPage === 'help' ? 'btn-primary' : 'btn-outline-light']"
            >
              <i class="bi bi-question-circle me-1"></i>Help
            </button>
            <button
              @click="navigateTo('docs')"
              :class="['btn btn-sm', currentPage === 'docs' ? 'btn-primary' : 'btn-outline-light']"
            >
              <i class="bi bi-book me-1"></i>Docs
            </button>
            <button
              @click="navigateTo('members')"
              :class="['btn btn-sm', currentPage === 'members' ? 'btn-primary' : 'btn-outline-light']"
            >
              <i class="bi bi-people-fill me-1"></i>Team
            </button>

            <!-- Divider -->
            <div style="width:1px;height:24px;background:rgba(255,255,255,0.15);margin:0 4px;"></div>

            <!-- Logout button -->
            <button class="btn btn-sm btn-outline-danger" @click="logout">
              <i class="bi bi-box-arrow-right me-1"></i>Logout
            </button>
          </div>
        </div>
      </nav>

      <!-- Page Content -->
      <SensorDashboardPage v-if="currentPage === 'dashboard'" />
      <WeatherPage         v-if="currentPage === 'weather'" />
      <GroupMembersPage    v-if="currentPage === 'members'" />
      <HelpPage            v-if="currentPage === 'help'" />
      <DocsPage            v-if="currentPage === 'docs'" />
      <ChartPage           v-if="currentPage === 'chart'" />
      <GearPage            v-if="currentPage === 'gear'" />
      <GridPage            v-if="currentPage === 'grid'" />
      <UploadPage          v-if="currentPage === 'upload'" />
    </div>
  </div>
</template>

<style>
body {
  margin: 0;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen',
    'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif;
}
</style>