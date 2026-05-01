import axios, { AxiosHeaders } from 'axios';
import type { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import { message } from 'antd';

// 统一后端返回格式
export type ResponseData<T = unknown> = {
  code: number;
  message: string;
  data: T;
};

function getPersistedToken(): string | null {
  const raw = localStorage.getItem('enterprise-auth-storage');
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as { state?: { token?: string } };
    return parsed?.state?.token ?? null;
  } catch {
    return null;
  }
}

// 创建 axios 实例
const instance: AxiosInstance = axios.create({
  baseURL: '/api',
  timeout: 10000,
});

// 请求拦截：自动注入 token
instance.interceptors.request.use(
  (config) => {
    const token = getPersistedToken();
    if (token) {
      const headers = AxiosHeaders.from(config.headers);
      headers.set('Authorization', `Bearer ${token}`);
      config.headers = headers;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

/**
 * 响应拦截：统一把 AxiosResponse -> ResponseData
 * 注意：Axios v1 的类型定义里 response.use 不是泛型，且默认期望返回 AxiosResponse。
 * 把返回值变成 ResponseData，让业务层只处理 data。
 */
const onResponse = (response: AxiosResponse<ResponseData>) => {
  const data = response.data;

  // 统一业务错误处理（纯前端 / mock 友好）
  if (typeof data.code === 'number' && data.code !== 200) {
    message.error(data.message || '请求失败');
    return Promise.reject(data);
  }

  return data;
};

const onResponseError = (error: unknown) => {
  // 网络错误 / 非 2xx 状态
  const err = error as { message?: string };
  message.error(err?.message || '网络异常');
  return Promise.reject(error);
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
instance.interceptors.response.use(onResponse as any, onResponseError as any);

// 统一请求方法
export function request<T = unknown>(
  config: AxiosRequestConfig
): Promise<ResponseData<T>> {
  return instance.request<ResponseData<T>, ResponseData<T>>(config);
}
