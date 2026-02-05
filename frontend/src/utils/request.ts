import axios, { type AxiosError } from 'axios'
import type { InternalAxiosRequestConfig, AxiosResponse } from 'axios'
import { ElMessage } from 'element-plus'
import router from '@/router'

type ErrorPayload = {
  error?: { message?: string }
  message?: string
}

const service = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3001',
  timeout: 10000
})

service.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = localStorage.getItem('admin_token')
    if (token) {
      // Admin API requires header token; query/body tokens are rejected server-side.
      config.headers['X-Admin-Token'] = token
    }
    return config
  },
  (error: unknown) => {
    return Promise.reject(error)
  }
)

service.interceptors.response.use(
  (response: AxiosResponse) => {
    return response
  },
  (error: unknown) => {
    const axiosError = error as AxiosError<ErrorPayload>
    const status = axiosError.response?.status

    const errorMessage =
      axiosError.response?.data?.error?.message ||
      axiosError.response?.data?.message ||
      axiosError.message ||
      '网络请求失败'

    if (status === 401) {
      // Token invalid/expired: clear and force re-login so the admin flow is consistent.
      localStorage.removeItem('admin_token')
      ElMessage.error('登录已过期，请重新登录')

      if (router.currentRoute.value.path !== '/login') {
        const redirect = router.currentRoute.value.fullPath
        router.push({ path: '/login', query: { redirect } })
      }
    } else {
      ElMessage.error(errorMessage)
    }

    return Promise.reject(error)
  }
)

export default service
