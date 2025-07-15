# PXAxios

> 一个基于 Axios 的二次封装网络请求库，支持自动 Token 注入、错误码拦截、FormData 递归处理、全局 Header 控制、大数精度解析等。

## ✨ 特性

- ✅ Axios 完全兼容，支持所有标准配置
- ✅ 自动注入 `token`，支持配置获取逻辑
- ✅ 支持 `FormData` 递归处理嵌套对象
- ✅ 响应支持 `json-bigint` 大数解析
- ✅ 支持全局 headers 设置与清除
- ✅ 支持错误码统一拦截
- ✅ 支持 `onResponse` 与 `onResponseError` 钩子函数

---

## 📦 安装

```bash
npm install px-axios
# 或者
yarn add px-axios
```

## 🚀 快速使用
### 创建实例
```javascript
import { PXAxios } from 'px-axios'

const api = new PXAxios({
  baseURL: 'https://api.example.com',
  getToken: () => sessionStorage.getItem('token'), // 可选：token 注入
  errorCodeArray: [4001, 4103], // 可选：响应 code 拦截
  onResponse: (res) => {
    console.log('成功响应：', res)
  },
  onResponseError: (err) => {
    console.error('响应错误：', err.message)
  }
})

// 发起请求
const res = await api.get('/user/info')
```
### 设置全局请求头
```typescript
// 设置公共请求头
api.setGlobalHeaders({
  'X-Client': 'WebApp',
  'Accept-Language': 'zh-CN'
});

// 按方法设置请求头
api.setGlobalHeaders({
  common: { 'Content-Type': 'application/json' },
  post: { 'X-Requested-With': 'XMLHttpRequest' }
});
```
### 核心方法
```typescript
// GET 请求
const user = await api.get<User>('/users/123', { id: 123 });

// POST 请求（自动转换为 FormData）
await api.post('/users', {
  name: 'John',
  avatar: new File([], 'avatar.png'),
  preferences: { theme: 'dark' }
});

// POST 请求（JSON 格式）
await api.post('/users', { name: 'John' }, false);

// 文件导出（返回 Blob）
const report = await api.exportPost<Blob>('/export', { format: 'pdf' });

// PUT 请求
await api.put('/users/123', { name: 'Updated' });

// DELETE 请求（支持 params 和 data）
await api.delete('/users/123', { soft: true }, { reason: 'inactive' });

// 自定义请求
await api.request({
  method: 'PATCH',
  url: '/users/123',
  data: { status: 'active' }
});

```

## 🧩参数说明
| 参数                | 类型                     | 默认值                               | 说明            |
| ----------------- | ---------------------- | --------------------------------- | ------------- |
| `baseURL`         | `string`               | `''`                              | 请求基础路径        |
| `timeout`         | `number`               | `60000`                           | 请求超时时间（ms）    |
| `headers`         | `object`               | `{}`                              | 默认请求头         |
| `getToken`        | `() => string \| null` | `sessionStorage.getItem('token')` | 获取 token 的函数  |
| `errorCodeArray`  | `(string \| number)[]` | `[]`                              | 后端返回的错误码数组    |
| `onResponse`      | `(res) => void`        | -                                 | 响应成功钩子        |
| `onResponseError` | `(err) => void`        | -                                 | 响应错误钩子（如网络失败） |

```typescript

interface MyAxiosOptions {
  /** 基础 API 地址 */
  baseURL?: string;
  
  /** 请求超时时间（毫秒） */
  timeout?: number;
  
  /** 默认请求头 */
  headers?: RawAxiosRequestHeaders | AxiosHeaders;
  
  /** 获取认证令牌的方法 */
  getToken?: () => string | null;
  
  /** 需要拦截的错误码数组 */
  errorCodeArray?: (string | number)[];
  
  /** 全局响应成功钩子 */
  onResponse?: (response: AxiosResponse) => void;
  
  /** 全局响应错误钩子 */
  onResponseError?: (error: any) => void;
}
```
## 🧾 FormData 自动转换
支持嵌套对象与数组：
```typescript
const data = {
  name: '张三',
  tags: ['vue', 'ts'],
  extra: {
    a: 1,
    b: 2
  }
}
await api.post('/upload', data, true) // 会自动转为 FormData 格式

const eg = {
    user: {
        name: "John",
        roles: ["admin", "editor"],
        avatar: File
    }
}
// 转换为
user.name=John
user.roles[0]=admin
user.roles[1]=editor
user.avatar=(binary)
```


## 🎯 全局 Header 控制
设置 headers（支持 common 或具体请求类型）
```typescript
api.setGlobalHeaders({
  Authorization: 'Bearer token',
  'X-Custom': 'yes'
})

api.setGlobalHeaders({
  common: { Authorization: 'xxx' },
  post: { 'Content-Type': 'application/json' }
})

```
清空所有 headers

```typescript
api.clearGlobalHeaders()
```

## 💡 使用 JSONBIG 保留大整数
自动解析后端返回的大整数为字符串，防止丢精度：
```typescript
response.data = {
  "userId": 9223372036854775807
}
```
默认使用 storeAsString: true，结果为：
```typescript
response.data.userId === "9223372036854775807" // 保留精度
```
## 📚 类型支持
所有方法都支持泛型推断：
```typescript
interface UserInfo {
  id: string
  name: string
}
const res = await api.get<UserInfo>('/user/info')
console.log(res.data.name) // 自动提示类型
```

## 🆓支持用户自定义方法的封装
可以更灵活的使用
```typescript
api.request({
  method: 'post',
  url: '/xxx',
  data: { id: 123 }
})
```

## 📎 完整示例

```typescript
import { PXAxios } from 'px-axios'

const api = new PXAxios({
  baseURL: 'https://api.example.com',
  getToken: () => localStorage.getItem('token'),
  errorCodeArray: [40005],
  onResponseError: (err) => {
    alert('请求失败：' + err.message)
  }
})

api.post('/user/update', { name: '张三' }).then(res => {
  console.log('更新成功', res.data)
})
```


