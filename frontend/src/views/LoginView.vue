<script setup lang="ts">
import { ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { validateAdminToken } from '@/api/auth'

const token = ref('')
const router = useRouter()
const route = useRoute()
const error = ref('')
const loading = ref(false)

const handleLogin = async () => {
  if (!token.value) {
    error.value = '请输入管理员 Token'
    return
  }
  
  loading.value = true
  error.value = ''
  
  try {
    await validateAdminToken(token.value)
    // Persist admin token for subsequent API calls and route guard checks.
    localStorage.setItem('admin_token', token.value)
    const redirect = route.query.redirect
    router.push(typeof redirect === 'string' ? redirect : '/')
  } catch (err) {
    const axiosError = err as { response?: { data?: { error?: { message?: string }; message?: string } }; message?: string }
    error.value =
      axiosError.response?.data?.error?.message ||
      axiosError.response?.data?.message ||
      axiosError.message ||
      '网络错误或Token无效'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="login-container">
    <div class="login-box">
      <h1>Admin Login</h1>
      <p class="subtitle">Enter your access token to continue</p>
      
      <div class="form-group">
        <input 
          v-model="token" 
          type="password" 
          placeholder="Access Token"
          @keyup.enter="handleLogin"
          class="token-input"
        />
        <p v-if="error" class="error-msg">{{ error }}</p>
      </div>
      
      <button @click="handleLogin" class="login-btn" :disabled="loading">
        {{ loading ? 'Logging in...' : 'Login' }}
      </button>
    </div>
  </div>
</template>

<style scoped>
.login-container {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  background-color: #f5f5f7;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
}

.login-box {
  background: white;
  padding: 3rem;
  border-radius: 20px;
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.05);
  width: 100%;
  max-width: 400px;
  text-align: center;
}

h1 {
  font-size: 24px;
  font-weight: 600;
  color: #1d1d1f;
  margin-bottom: 8px;
}

.subtitle {
  color: #86868b;
  font-size: 14px;
  margin-bottom: 32px;
}

.form-group {
  margin-bottom: 24px;
  text-align: left;
}

.token-input {
  width: 100%;
  padding: 12px 16px;
  border: 1px solid #d2d2d7;
  border-radius: 12px;
  font-size: 16px;
  transition: all 0.2s;
  background-color: #fff;
}

.token-input:focus {
  outline: none;
  border-color: #0071e3;
  box-shadow: 0 0 0 4px rgba(0, 113, 227, 0.1);
}

.error-msg {
  color: #ff3b30;
  font-size: 12px;
  margin-top: 8px;
  margin-left: 4px;
}

.login-btn {
  width: 100%;
  padding: 12px;
  background-color: #0071e3;
  color: white;
  border: none;
  border-radius: 12px;
  font-size: 16px;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.2s;
}

.login-btn:hover {
  background-color: #0077ed;
}

.login-btn:active {
  transform: scale(0.98);
}
</style>
