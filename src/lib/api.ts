// src/lib/api.ts
import axios from "axios";

type AxiosRequestConfig = Parameters<typeof axios.request>[0];

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:5000/api",
  withCredentials: true,
});

api.interceptors.request.use(
  (config: AxiosRequestConfig) => {
    const token = localStorage.getItem("authToken");
    if (token) {
      config.headers = config.headers || {};
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

type Config = Partial<AxiosRequestConfig>;

/**
 * Wrap each call in Promise.resolve() to ensure TypeScript sees it as a native Promise<T>
 */
export const apiClient = {
  get: <T = any>(url: string, config?: Config): Promise<T> =>
    Promise.resolve(api.get<T>(url, config).then((res) => res.data)),

  post: <T = any>(url: string, data?: any, config?: Config): Promise<T> =>
    Promise.resolve(api.post<T>(url, data, config).then((res) => res.data)),

  put: <T = any>(url: string, data?: any, config?: Config): Promise<T> =>
    Promise.resolve(api.put<T>(url, data, config).then((res) => res.data)),

  patch: <T = any>(url: string, data?: any, config?: Config): Promise<T> =>
    Promise.resolve(api.patch<T>(url, data, config).then((res) => res.data)),

  delete: <T = any>(url: string, config?: Config): Promise<T> =>
    Promise.resolve(api.delete<T>(url, config).then((res) => res.data)),
};

export { api };
export default apiClient;
