// Sidebar.vue - Updated with Navigation
<script setup>
import { defineEmits } from 'vue'

const emit = defineEmits(['navigate'])

const items = [
  { key: 'upload', title: 'Weather' },
  { key: 'chart', title: 'Sensor Analytics' },
  { key: 'grid', title: 'Grafana_Like' },
  { key: 'gear', title: 'Help' },
]
</script>

<template>
  <aside
    class="d-flex flex-column align-items-center border-end"
    style="width:72px; background: linear-gradient(180deg, #052a45 0%, #061f33 100%); border-color: rgba(255,255,255,.06) !important;"
  >
    <div class="py-3">
      <div class="rounded-3 d-flex align-items-center justify-content-center"
           style="width:44px;height:44px;background:rgba(255,255,255,.06);">
        <!-- simple logo -->
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
          <path d="M12 2 3 7v10l9 5 9-5V7l-9-5Z" stroke="white" opacity=".9"/>
          <path d="M12 2v20" stroke="white" opacity=".35"/>
          <path d="M3 7l9 5 9-5" stroke="white" opacity=".35"/>
        </svg>
      </div>
    </div>

    <div class="d-flex flex-column gap-2 align-items-center mt-2">
      <button
        v-for="it in items"
        :key="it.key"
        @click="emit('navigate', it.key)"
        class="btn btn-outline-light p-0 d-flex align-items-center justify-content-center rounded-3"
        style="width:44px;height:44px; border-color: rgba(255,255,255,.10);"
        :title="it.title"
      >
        <!-- Use minimal icons (SVG) -->
        <svg v-if="it.key==='upload'" width="22" height="22" viewBox="0 0 24 24" fill="none">
          <path d="M12 16V4m0 0 4 4M12 4 8 8" stroke="white" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
          <path d="M4 20h16" stroke="white" stroke-width="1.8" stroke-linecap="round"/>
        </svg>

        <svg v-else-if="it.key==='chart'" width="22" height="22" viewBox="0 0 24 24" fill="none">
          <path d="M4 19V5" stroke="white" stroke-width="1.8" stroke-linecap="round"/>
          <path d="M7 16l4-4 4 3 5-7" stroke="white" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>

        <svg v-else-if="it.key==='grid'" width="22" height="22" viewBox="0 0 24 24" fill="none">
          <path d="M4 4h7v7H4V4Zm9 0h7v7h-7V4ZM4 13h7v7H4v-7Zm9 0h7v7h-7v-7Z" stroke="white" stroke-width="1.6"/>
        </svg>

        <svg v-else width="22" height="22" viewBox="0 0 24 24" fill="none">
          <path d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z" stroke="white" stroke-width="1.6"/>
          <path d="M19.4 15a8.7 8.7 0 0 0 .1-6l2-1.2-2-3.4-2.2 1a9 9 0 0 0-5.2-3L11.6 0H8.4L8 2.2a9 9 0 0 0-5.2 3l-2.2-1-2 3.4 2 1.2a8.7 8.7 0 0 0 .1 6l-2 1.2 2 3.4 2.2-1a9 9 0 0 0 5.2 3l.4 2.2h3.2l.4-2.2a9 9 0 0 0 5.2-3l2.2 1 2-3.4-2-1.2Z"
                stroke="white" opacity=".35" stroke-width="1.2"/>
        </svg>
      </button>
    </div>

    <div class="mt-auto pb-3 d-flex flex-column gap-2 align-items-center">
      <button 
        @click="emit('navigate', 'help')"
        class="btn btn-outline-light rounded-3 p-0"
        style="width:34px;height:34px;border-color: rgba(255,255,255,.12);"
        title="Help"
      >
        ?
      </button>
      <button 
        @click="emit('navigate', 'docs')"
        class="btn btn-outline-light rounded-3 p-0"
        style="width:34px;height:34px;border-color: rgba(255,255,255,.12);"
        title="Docs"
      >
        ⟂
      </button>
    </div>
  </aside>
</template>