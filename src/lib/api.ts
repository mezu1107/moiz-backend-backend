import axios from "axios";

// Define type-safe config type
type AxiosRequestConfig = Parameters<typeof axios.request>[0];

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:5000/api",
  withCredentials: true,
});

// TEMP DEV TOKEN – only for local dev
const DEV_TOKEN = import.meta.env.VITE_DEV_TOKEN || null;

// Interceptor to attach token from localStorage or DEV_TOKEN
api.interceptors.request.use((config: AxiosRequestConfig) => {
  const token = localStorage.getItem("token") || DEV_TOKEN;
  if (token) {
    if (!config.headers) config.headers = {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

type Config = Partial<AxiosRequestConfig>;

export const apiClient = {
  get: <T>(url: string, config?: Config) =>
    api.get<T>(url, config).then((res) => res.data),
  post: <T>(url: string, data?: any, config?: Config) =>
    api.post<T>(url, data, config).then((res) => res.data),
  put: <T>(url: string, data?: any, config?: Config) =>
    api.put<T>(url, data, config).then((res) => res.data),
  patch: <T>(url: string, data?: any, config?: Config) =>
    api.patch<T>(url, data, config).then((res) => res.data),
  delete: <T>(url: string, config?: Config) =>
    api.delete<T>(url, config).then((res) => res.data),
};

export { api };
export default apiClient;
