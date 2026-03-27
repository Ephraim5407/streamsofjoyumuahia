import axios from "axios";
import type { AxiosInstance, AxiosResponse, AxiosError } from "axios";
import axiosRetry from "axios-retry";
import AsyncStorage from "../utils/AsyncStorage";
import { BASE_URl } from "./users";
import { eventBus } from "../utils/eventBus";

// Create axios instance
const apiClient: AxiosInstance = axios.create({
  baseURL: BASE_URl,
  timeout: 30000, // 30 seconds timeout
});

// Configure retry logic
axiosRetry(apiClient, {
  retries: 3,
  retryDelay: axiosRetry.exponentialDelay,
  retryCondition: (error) => {
    // Retry on network errors, 5xx errors, or timeout
    return (
      axiosRetry.isNetworkOrIdempotentRequestError(error) ||
      (error.response?.status && error.response.status >= 500) ||
      error.code === "ECONNABORTED"
    );
  },
});

// Request interceptor to add token
apiClient.interceptors.request.use(
  async (config) => {
    const token = await AsyncStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

// Response interceptor to handle errors and token expiration
apiClient.interceptors.response.use(
  (response: AxiosResponse) => response,
  async (error: AxiosError) => {
    let errorMessage = "An unexpected error occurred. Please try again.";

    if (error.response) {
      // Server responded with error status
      const { status, data } = error.response;
      const responseData = data as any;
      switch (status) {
        case 400:
          errorMessage =
            responseData?.message || "Bad request. Please check your input.";
          break;
        case 401:
          // Token expired or invalid
          await AsyncStorage.multiRemove([
            "token",
            "user",
            "activeUnitId",
            "pendingEmail",
            "pendingUserId",
            "API_BASE_URL",
          ]);
          eventBus.emit("tokenExpired");
          errorMessage = "Session expired. Please log in again.";
          break;
        case 403:
          errorMessage = "You do not have permission to perform this action.";
          break;
        case 404:
          errorMessage = "The requested resource was not found.";
          break;
        case 422:
          errorMessage =
            responseData?.message ||
            "Validation error. Please check your input.";
          break;
        case 429:
          errorMessage = "Too many requests. Please wait and try again.";
          break;
        case 500:
          errorMessage = "Server error. Please try again later.";
          break;
        default:
          errorMessage =
            responseData?.message ||
            `Error ${status}: ${responseData?.error || "Unknown error"}`;
      }
    } else if (error.request) {
      // Network error
      if (error.code === "ECONNABORTED") {
        errorMessage =
          "Request timed out. Please check your connection and try again.";
      } else {
        errorMessage = "Network error. Please check your internet connection.";
      }
    } else {
      // Other error
      errorMessage = error.message || "An unexpected error occurred.";
    }

    // Emit error event for user feedback
    eventBus.emit("apiError", { message: errorMessage, originalError: error });

    // Attach user-friendly message to error
    (error as any).userMessage = errorMessage;

    return Promise.reject(error);
  },
);

export default apiClient;
