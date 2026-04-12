import axios from "axios";
import type { AxiosResponse } from "axios";
import AsyncStorage from "../utils/AsyncStorage";
// Resolve API base URL robustly with caching and sensible fallbacks
const normalizeUrl = (url: string) => (url ? url.trim().replace(/\/+$/, "") : "");

const VITE_API_BASE = normalizeUrl(import.meta.env.VITE_API_BASE_URL || "");
const DEFAULT_REMOTE = "https://streamsofjoyumuahia-api-n6na.onrender.com";
/** Local API when running `pnpm dev` / Vite without overriding env */
const DEV_DEFAULT_LOCAL = "http://localhost:4000";

// Production build: require explicit VITE_API_BASE_URL or fall back to hosted API.
// Vite dev: default to local backend so the PWA hits your machine, not Render.
export let BASE_URl =
  VITE_API_BASE ||
  (import.meta.env.DEV ? DEV_DEFAULT_LOCAL : DEFAULT_REMOTE);

async function getCandidates(): Promise<string[]> {
  const saved = await AsyncStorage.getItem("API_BASE_URL");
  const list: string[] = [];
  if (saved) list.push(normalizeUrl(saved));
  if (VITE_API_BASE) list.push(VITE_API_BASE);

  if (import.meta.env.DEV) {
    list.push("http://localhost:4000");
    list.push("http://127.0.0.1:4000");
  }

  list.push(DEFAULT_REMOTE);

  return Array.from(new Set(list.map(normalizeUrl).filter(Boolean)));
}

// Resolve a list of candidate base URLs (custom override, default, emulator/local fallbacks)

type AccessCodeProps = {
  email: string;
};
type otpProps = {
  phone: string;
};
type votpProps = {
  phone: string;
  otp: string;
};

export interface SendMailOtpResponseBody {
  ok: boolean;
  message?: string;
  role?: string | null;
  user?: any;
  userId?: string;
  code?: string;
  // Backend status codes from /api/send-mail-otp
  status?: "sent" | "sentDev" | "verified" | "error" | "throttled";
  // When status==='verified'
  approved?: boolean;
  registrationCompleted?: boolean;
  existing?: boolean;
  // When status==='sent' or 'sentDev'
  expiresInSeconds?: number;
  cooldownRemaining?: number;
  devOtp?: string;
}

export const validateAccess = async (
  props: AccessCodeProps,
): Promise<AxiosResponse<SendMailOtpResponseBody>> => {
  const { email } = props;
  const cleaned = email.trim();
  let lastErr: any = null;
  const bases = await getCandidates();
  for (const base of bases) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000);
    try {
      const response = await axios.post(
        base + "/api/send-mail-otp",
        { email: cleaned },
        { signal: controller.signal, timeout: 13000 },
      );
      // Cache the working base for subsequent calls
      try {
        await AsyncStorage.setItem("API_BASE_URL", base);
        BASE_URl = base;
      } catch {}
      clearTimeout(timeout);
      return response;
    } catch (error: any) {
      clearTimeout(timeout);
      lastErr = error;
      // If this was a timeout/abort or a network error, try next base; for HTTP errors, rethrow
      const isAbort =
        error?.code === "ERR_CANCELED" ||
        /aborted|canceled/i.test(error?.message || "");
      const isNetwork =
        error?.message === "Network Error" || error?.code === "ERR_NETWORK";
      const hasHttpStatus = !!error?.response?.status;
      if (hasHttpStatus && error?.response?.status < 500) {
        // 4xx from server is meaningful; no point trying other bases
        throw error;
      }
      if (
        !isAbort &&
        !isNetwork &&
        hasHttpStatus &&
        error?.response?.status >= 500
      ) {
        // Server is up but errored; surface the first 5xx
        throw error;
      }
      // Otherwise, continue to next candidate
    }
  }
  // If we exhausted candidates, normalize the error message
  if (lastErr?.code === "ERR_CANCELED") {
    throw new Error(
      "Request timed out. Please ensure the API server is reachable.",
    );
  }
  if (lastErr?.message === "Network Error" || lastErr?.code === "ERR_NETWORK") {
    throw new Error(
      "Cannot reach the API server. Check your internet and API_BASE_URL.",
    );
  }
  throw lastErr || new Error("Request failed.");
};

export const sendOtp = async (props: otpProps) => {
  const trimmedCode = props?.phone;
  console.log(trimmedCode);
  try {
    let response;
    // prefer cached working base
    const bases = await getCandidates();
    let firstErr: any = null;
    for (const base of bases) {
      try {
        response = await axios.post(
          base + "/api/send-otp",
          { phone: trimmedCode },
          { timeout: 12000 },
        );
        await AsyncStorage.setItem("API_BASE_URL", base);
        BASE_URl = base;
        break;
      } catch (e) {
        if (!firstErr) firstErr = e;
      }
    }
    if (!response) throw firstErr || new Error("Failed to reach API");

    console.log(response.data);
    return response;
  } catch (error) {
    // It's good practice to catch errors here and re-throw them or handle them
    console.log("API call failed:", error);
    return;
    // Re-throw the error so the calling function can handle it
  }
};
export const verifyOtp = async (props: votpProps) => {
  const trimmedCode = props?.phone;
  const otp = props?.otp;

  console.log(trimmedCode);
  try {
    let response;
    const bases = await getCandidates();
    let firstErr: any = null;
    for (const base of bases) {
      try {
        response = await axios.post(
          base + "/api/verify-otp",
          { phone: trimmedCode, otp },
          { timeout: 12000 },
        );
        await AsyncStorage.setItem("API_BASE_URL", base);
        BASE_URl = base;
        break;
      } catch (e) {
        if (!firstErr) firstErr = e;
      }
    }
    if (!response) throw firstErr || new Error("Failed to reach API");

    console.log(response.data);
    return response;
  } catch (error) {
    // It's good practice to catch errors here and re-throw them or handle them
    console.log("API call failed:", error);
    return;
    // Re-throw the error so the calling function can handle it
  }
};
