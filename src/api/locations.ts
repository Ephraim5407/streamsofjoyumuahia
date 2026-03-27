import axios from "axios";
import { BASE_URl } from "./users";

export type Country = { label: string; value: string; flag?: string };
export type Option = { label: string; value: string };

// Simple in-memory cache for location data
const locationCache = new Map<string, { data: any; timestamp: number }>();
const CACHE_DURATION = 1000 * 60 * 30; // 30 minutes

function getCachedData(key: string) {
  const cached = locationCache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.data;
  }
  return null;
}

function setCachedData(key: string, data: any) {
  locationCache.set(key, { data, timestamp: Date.now() });
}

// Fetch countries from backend with caching
export async function fetchCountries(): Promise<Country[]> {
  const cacheKey = "countries";
  const cached = getCachedData(cacheKey);
  if (cached) return cached;

  try {
    const res = await axios.get(`${BASE_URl}/api/locations/countries`);
    if (res.data?.ok) {
      const countries: Country[] = res.data.countries || [];
      // Pin Nigeria to position 0. Backend labels include an emoji prefix
      // e.g. "🇳🇬 Nigeria", so we match with includes() rather than ===.
      const nigeriaIdx = countries.findIndex((c) =>
        c.label.toLowerCase().includes("nigeria"),
      );
      if (nigeriaIdx > 0) {
        const [nigeria] = countries.splice(nigeriaIdx, 1);
        countries.unshift(nigeria);
      }
      setCachedData(cacheKey, countries);
      return countries;
    }
    return [];
  } catch (error) {
    console.error("Error fetching countries:", error);
    return [];
  }
}

// Search locations using backend API
export async function searchPlaces(
  query: string,
  countryCode?: string,
): Promise<{ cities: Option[]; states: Option[] }> {
  // This function is kept for backward compatibility but now uses backend
  // In the registration form, we use fetchLocationSuggestions instead
  return { cities: [], states: [] };
}

// Fetch location suggestions from backend with caching
export const fetchLocationSuggestions = async (
  type: "state" | "lga" | "city" | "locality_postalcode",
  query: string,
  country?: string,
  state?: string,
  town?: string,
): Promise<Option[]> => {
  // Allow empty query to fetch all options for dropdowns

  // Create cache key based on all parameters
  const cacheKey = `suggestions_${type}_${query}_${country || ""}_${state || ""}_${town || ""}`;
  const cached = getCachedData(cacheKey);
  if (cached) return cached;

  try {
    const params = new URLSearchParams({
      type,
      query,
      ...(country && { country }),
      ...(state && { state }),
      ...(town && { town }),
    });

    const res = await axios.get(
      `${BASE_URl}/api/locations/search?${params.toString()}`,
    );
    if (res.data?.ok) {
      const suggestions = res.data.suggestions || [];
      setCachedData(cacheKey, suggestions);
      return suggestions;
    }
    return [];
  } catch (error) {
    console.error("Error fetching location suggestions:", error);
    return [];
  }
};
