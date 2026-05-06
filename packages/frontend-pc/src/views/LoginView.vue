<template>
  <LoginRegister @login-success="handleLoginSuccess" />
</template>

<script setup>
import { useRouter } from 'vue-router'
import { LoginRegister } from '@shuziren/shared-components'

const router = useRouter()

const handleLoginSuccess = () => {
  router.push('/')
}
</script>
