// src/MyAxios.ts
import axios, { AxiosInstance, AxiosResponse, InternalAxiosRequestConfig } from 'axios'
import JSONBIG from 'json-bigint'

export interface MyAxiosOptions {
    baseURL?: string
    timeout?: number
    getToken?: () => string | null,
    errorCodeArray?: string|number[]
}

export class PXAxios {
    private instance: AxiosInstance
    private options: MyAxiosOptions

    constructor(options: MyAxiosOptions = {}) {
        this.options = options
        const {
            baseURL = '',
            timeout = 60000,
            getToken = () => sessionStorage.getItem('token')
        } = options

        // 设置 json-bigint 响应解析
        axios.defaults.transformResponse = [
            function (data) {
                const jsonBig = JSONBIG({ storeAsString: true })
                try {
                    return jsonBig.parse(data)
                } catch (e) {
                    return data
                }
            }
        ]

        this.instance = axios.create({ baseURL, timeout })

        // 请求拦截器
        this.instance.interceptors.request.use((config: InternalAxiosRequestConfig) => {
            const token = getToken()
            if (token) {
                config.headers['Authorization'] = token
            }

            const { method } = config
            if (method === 'get') {
                config.params = config.params || {}
            } else if (!(config.data instanceof FormData)) {
                config.data = config.data || {}
            }

            return config
        }, error => Promise.reject(error))

        // 响应拦截器
        this.instance.interceptors.response.use((response: AxiosResponse): any => {
            const { errorCodeArray } = this.options
            const { code, message }:any = response.data
            if (errorCodeArray.length > 0){
                if (Array.isArray(errorCodeArray) && errorCodeArray.includes(Number(code))) {
                    return Promise.reject(message || '请求失败')
                }
            }
            return response
        }, error => Promise.reject(error))
    }

    public getInstance(): AxiosInstance {
        return this.instance
    }

    // 工具函数：将对象转 FormData
    private createFormData(data: Record<string, string>): FormData {
        const formData = new FormData()
        for (const key in data) {
            formData.append(key, data[key])
        }
        return formData
    }

    // 请求方法封装
    public async get<T>(url: string, params?: any): Promise<AxiosResponse<T>> {
        return await this.instance.get<T>(url, { params })
    }

    public async post<T>(url: string, data?: any, needForm = true): Promise<AxiosResponse<T>> {
        const submitData = needForm ? this.createFormData(data) : data
        return await this.instance.post<T>(url, submitData)
    }

    public async exportPost<T>(url: string, data?: any, needForm = true): Promise<AxiosResponse<T>> {
        const submitData = needForm ? this.createFormData(data) : data
        return await this.instance.post<T>(url, submitData, { responseType: 'blob' })
    }

    public async put<T>(url: string, data?: any): Promise<AxiosResponse<T>> {
        return await this.instance.put<T>(url, data)
    }

    public async delete<T>(url: string, params?: any): Promise<AxiosResponse<T>> {
        return await this.instance.delete<T>(url, { params })
    }
}
