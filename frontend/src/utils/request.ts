import axios from 'axios'
import type { InternalAxiosRequestConfig, AxiosResponse } from 'axios'

const service = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3001',
  timeout: 10000
})

// Request interceptor
service.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    // Check for token in URL first (first access)
    const urlParams = new URLSearchParams(window.location.search)
    const tokenFromUrl = urlParams.get('token')

    if (tokenFromUrl) {
      localStorage.setItem('admin_token', tokenFromUrl)
    }

    const token = localStorage.getItem('admin_token')
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`
    }
    return config
  },
  (error: any) => {
    return Promise.reject(error)
  }
)

// Response interceptor
service.interceptors.response.use(
  (response: AxiosResponse) => {
    return response
  },
  (error: any) => {
    console.error('Request Error:', error)
    if (error.response && error.response.status === 401) {
      console.warn('Unauthorized access. Redirecting to login.')
      localStorage.removeItem('admin_token')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

export default service
