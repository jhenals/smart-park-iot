<script setup>
import SidebarNav from './SidebarNav.vue'
import TopHeader from './TopHeader.vue'

defineProps({
  breadcrumbs: { type: Array, default: () => [] },
  title: { type: String, default: '' },
  tabs: { type: Array, default: () => [] },        // [{ key, label }]
  activeTab: { type: String, default: '' },
})

const emit = defineEmits(['update:activeTab'])
</script>

<template>
  <!-- data-bs-theme="dark" makes Bootstrap components fit dark UI -->
  <div
    class="d-flex vh-100"
    data-bs-theme="dark"
    style="background: radial-gradient(1200px 600px at 30% 0%, #0b0f1f 0%, #07070e 55%);"
  >
    <!-- <SidebarNav /> -->

    <div class="text-primary flex-grow-1 d-flex flex-column" style="min-width:0;">
      <TopHeader
        :breadcrumbs="breadcrumbs"
        :title="title"
        :tabs="tabs"
        :active-tab="activeTab"
        @update:activeTab="emit('update:activeTab', $event)"
      >
        <template #toolbar>
          <slot name="toolbar" />
        </template>
      </TopHeader>

      <main class="flex-grow-1 overflow-auto p-4" style="min-width:0;">
        <slot />
      </main>
    </div>
  </div>
</template>