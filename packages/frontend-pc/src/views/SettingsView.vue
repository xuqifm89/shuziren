<template>
  <main class="settings-view">
    <SystemSettings />
  </main>
</template>

<script setup>
import { SystemSettings } from '@shuziren/shared-components'
</script>

<style scoped>
.settings-view {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  overflow: hidden;
  padding: 0;
  min-width: 0;
}
</style>
