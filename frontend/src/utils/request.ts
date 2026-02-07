import axios, { type AxiosError } from 'axios'
import type { InternalAxiosRequestConfig, AxiosResponse } from 'axios'
import { ElMessage } from 'element-plus'
import router from '@/router'
import { t } from '@/i18n'

type ErrorPayload = {
  error?: { message?: string }
  message?: string
}

/**
 * Axios请求服务实例
 * 
 * 配置说明：
 * - baseURL: 根据环境变量动态设置API基础路径
 *   - 开发环境: 使用Vite代理 (/api)
 *   - 生产环境: 使用Nginx代理路径
 * - timeout: 请求超时时间设置为10秒
 */
const service = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  timeout: 10000
})

/**
 * 请求拦截器 - 自动添加认证Token
 * 
 * 功能：
 * - 检查本地存储中是否存在admin_token
 * - 如果存在，自动添加到请求头的 X-Admin-Token 字段
 * - 确保所有需要认证的API请求都携带正确的Token
 */
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
      axiosError.response?.data?.error?.message || t('errors.networkFailed')

    if (status === 401) {
      // Token invalid/expired: clear and force re-login so the admin flow is consistent.
      localStorage.removeItem('admin_token')
      ElMessage.error(t('auth.sessionExpired'))

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
