import axios, { type AxiosError } from 'axios'
import type { InternalAxiosRequestConfig, AxiosResponse } from 'axios'
import { ElMessage, ElMessageBox } from 'element-plus'
import router from '@/router'
import { t } from '@/i18n'

type ErrorPayload = {
  code?: string
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
  async (error: unknown) => {
    const axiosError = error as AxiosError<ErrorPayload>
    const status = axiosError.response?.status
    const data = axiosError.response?.data

    // Handle 2FA requirement
    if (status === 403 && data?.code === 'REQUIRE_2FA') {
      try {
        const { value: otpCode } = await ElMessageBox.prompt(
          data.message || '检测到异常/新环境登录，需要双因素认证。',
          '安全验证',
          {
            confirmButtonText: '验证',
            cancelButtonText: '取消',
            inputPattern: /^\d{6}$/,
            inputErrorMessage: '格式不正确，请输入6位数字',
            inputPlaceholder: '请输入 Authenticator App 上的 6 位数字',
          }
        )

        if (axiosError.config) {
          axiosError.config.headers['X-Admin-OTP'] = otpCode
          return service(axiosError.config)
        }
      } catch (e) {
        if (e !== 'cancel') {
          ElMessage.error('验证失败或输入取消')
        }
        return Promise.reject(error)
      }
    }

    const errorMessage =
      data?.error?.message || data?.message || t('errors.networkFailed')

    if (status === 401) {
      // Token invalid/expired: clear and force re-login so the admin flow is consistent.
      localStorage.removeItem('admin_token')
      ElMessage.error(t('auth.sessionExpired'))

      // Avoid redirect loop if already on login page
      if (router.currentRoute.value.path !== '/login') {
        const query = { redirect: router.currentRoute.value.fullPath }
        router.push({ path: '/login', query })
      }
    } else {
      ElMessage.error(errorMessage)
    }

    return Promise.reject(error)
  }
)

export default service
