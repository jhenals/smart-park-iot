<script setup>
defineProps({
  breadcrumbs: { type: Array, default: () => [] },
  title: { type: String, default: '' },
     // [{ key, label }]
  activeTab: { type: String, default: '' },
})

const emit = defineEmits(['update:activeTab'])
</script>

<template>
  <header class="border-bottom" style="border-color: rgba(255,255,255,.08) !important; background: linear-gradient(180deg, rgba(0,0,0,.35), rgba(0,0,0,0));">
    <div class="px-4 pt-3 pb-2 d-flex justify-content-between align-items-center">
      <nav aria-label="breadcrumb" class="mb-0">
        <ol class="breadcrumb mb-0 small" style="--bs-breadcrumb-divider: '›';">
          <li v-for="(c,i) in breadcrumbs" :key="i" class="breadcrumb-item text-secondary">
            <span class="text-secondary">{{ c }}</span>
          </li>
        </ol>
      </nav>
    </div>

    <div class="px-4 pb-2">
      <h1 class="m-0 fw-bold" style="font-size:42px; letter-spacing:-0.5px;">
        {{ title }}
      </h1>
    </div>

    <div class="px-4 pt-2">
      <ul class="nav nav-tabs border-0">
        <li v-for="t in tabs" :key="t.key" class="nav-item">
          <button
            class="nav-link bg-transparent border-0 fw-bold small"
            :class="{ active: t.key === activeTab }"
            style="letter-spacing:.6px;"
            @click="emit('update:activeTab', t.key)"
          >
            {{ t.label }}
          </button>
        </li>
      </ul>
    </div>

    <div class="px-4 pb-3 pt-3">
      <slot name="toolbar" />
    </div>
  </header>
</template>