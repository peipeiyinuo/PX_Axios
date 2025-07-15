// src/MyAxios.ts
import axios, {
    AxiosInstance,
    AxiosResponse,
    InternalAxiosRequestConfig,
    RawAxiosRequestHeaders,
    AxiosRequestConfig,
    AxiosHeaders,
} from 'axios'
import JSONBIG from 'json-bigint'

type HeaderValue = string | number | boolean | null
type Method = 'common' | 'get' | 'post' | 'put' | 'delete' | 'patch' | 'head' | 'options'

type FlexibleHeaders =
    | RawAxiosRequestHeaders // 原始扁平结构
    | Partial<Record<Method, RawAxiosRequestHeaders>> // 分方法设置结构

export interface MyAxiosOptions {
    baseURL?: string
    timeout?: number
    headers?: RawAxiosRequestHeaders | AxiosHeaders;
    getToken?: () => string | null,
    errorCodeArray?: (string|number)[]
    onResponse?: (response: AxiosResponse) => void,
    onResponseError?: (error: any) => void
}

export class PXAxios {
    private instance: AxiosInstance
    private options: MyAxiosOptions
    private jsonBig:any = JSONBIG({ storeAsString: true });

    constructor(options: MyAxiosOptions = {}) {
        this.options = options
        const {
            baseURL = '',
            timeout = 60000,
            getToken = () => sessionStorage.getItem('token')
        } = options

        // 设置 json-bigint 响应解析
        axios.defaults.transformResponse = [
            (data)=>{
                try {
                    return this.jsonBig.parse(data)
                } catch (e) {
                    return data
                }
            }
        ]

        this.instance = axios.create({ baseURL, timeout, headers: options.headers })

        // 请求拦截器
        this.instance.interceptors.request.use((config: InternalAxiosRequestConfig) => {
            const token = getToken()
            if (token && config.headers) {
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
            this.options.onResponse?.(response);

            // 跳过 blob 响应类型的错误检查
            if (response.config.responseType === 'blob') {
                return response;
            }

            const { errorCodeArray = [] } = this.options
            const { data } = response;

            if (data && typeof data === 'object' && 'code' in data) {
                const code = Number(data.code);
                if (Array.isArray(errorCodeArray) && errorCodeArray.includes(code)) {
                    const message = data.message || '请求失败';
                    return Promise.reject(new Error(message));
                }
            }
            return response
        }, error => {
            this.options.onResponseError?.(error);
            return Promise.reject(error)
        })
    }

    public getInstance(): AxiosInstance {
        return this.instance
    }

    private createFormData(data: Record<string, any>): FormData {
        const formData = new FormData();

        const appendFormData = (key: string, value: any) => {
            if (value instanceof File || value instanceof Blob) {
                formData.append(key, value);
            } else if (Array.isArray(value)) {
                value.forEach((item, index) => {
                    appendFormData(`${key}[${index}]`, item);
                });
            } else if (typeof value === 'object' && value !== null) {
                Object.entries(value).forEach(([subKey, subValue]) => {
                    appendFormData(`${key}.${subKey}`, subValue);
                });
            } else {
                formData.append(key, String(value));
            }
        };

        Object.entries(data).forEach(([key, value]) => {
            if (value !== undefined && value !== null) {
                appendFormData(key, value);
            }
        });

        return formData;
    }

    // 请求方法封装
    public async get<T>(url: string, params?: any): Promise<AxiosResponse<T>> {
        return await this.instance.get<T>(url, { params })
    }

    public async post<T>(url: string, data?: any, needForm = true): Promise<AxiosResponse<T>> {
        const submitData = needForm && data ? this.createFormData(data) : (data || {});
        return this.instance.post<T>(url, submitData);
    }

    public async exportPost<T>(url: string, data?: any, needForm = true): Promise<AxiosResponse<T>> {
        const submitData = needForm && data ? this.createFormData(data) : (data || {});
        return this.instance.post<T>(url, submitData, {
            responseType: 'blob'
        });
    }

    public async put<T>(url: string, data?: any): Promise<AxiosResponse<T>> {
        return await this.instance.put<T>(url, data)
    }

    public async delete<T>(url: string, params?: any, data?: any): Promise<AxiosResponse<T>> {
        return await this.instance.delete<T>(url, { params, data })
    }

    public async request<T>(config: AxiosRequestConfig): Promise<AxiosResponse<T>> {
        return await this.instance.request<T>(config);
    }

    /**
     * 支持两种方式设置默认 headers：
     * 1. 扁平结构（作用于 common）
     * 2. 按 method 分类设置 headers
     */
    public setGlobalHeaders(headers: FlexibleHeaders): void {
        const defaultHeaders = this.instance.defaults.headers

        const methodKeys: Method[] = ['common', 'get', 'post', 'put', 'delete', 'patch', 'head', 'options']

        const isMethodBased = (obj: any): obj is Partial<Record<Method, RawAxiosRequestHeaders>> => {
            return Object.keys(obj).some(k => methodKeys.includes(k as Method))
        }

        if (isMethodBased(headers)) {
            methodKeys.forEach(method => {
                const methodHeaders = headers[method]
                if (methodHeaders) {
                    Object.entries(methodHeaders).forEach(([key, value]) => {
                        if (value === null) {
                            delete defaultHeaders[method]?.[key]
                        } else {
                            defaultHeaders[method] = defaultHeaders[method] || {}
                            defaultHeaders[method]![key] = value as string
                        }
                    })
                }
            })
        } else {
            Object.entries(headers).forEach(([key, value]) => {
                if (value === null) {
                    delete defaultHeaders.common[key]
                } else {
                    defaultHeaders.common[key] = value as string
                }
            })
        }
    }

    /**
     * 清空所有全局默认请求头，包括：common/get/post/put/delete/patch/head/options
     */
    public clearGlobalHeaders(): void {
        const defaultHeaders = this.instance.defaults.headers
        const methodKeys = ['common', 'get', 'post', 'put', 'delete', 'patch', 'head', 'options']

        methodKeys.forEach(method => {
            if (defaultHeaders[method]) {
                Object.keys(defaultHeaders[method]).forEach(key => {
                    delete defaultHeaders[method][key]
                })
            }
        })
    }
}
