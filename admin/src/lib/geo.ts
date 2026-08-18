/** City / country centroids for map pins when lat/lng are missing. */
export type GeoPoint = { lat: number; lng: number };

const CITY_COORDS: Record<string, GeoPoint> = {
  "united states|new york": { lat: 40.7128, lng: -74.006 },
  "united states|los angeles": { lat: 34.0522, lng: -118.2437 },
  "united states|miami": { lat: 25.7617, lng: -80.1918 },
  "united states|austin": { lat: 30.2672, lng: -97.7431 },
  "united states|chicago": { lat: 41.8781, lng: -87.6298 },
  "united arab emirates|dubai": { lat: 25.2048, lng: 55.2708 },
  "united arab emirates|abu dhabi": { lat: 24.4539, lng: 54.3773 },
  "pakistan|karachi": { lat: 24.8607, lng: 67.0011 },
  "pakistan|lahore": { lat: 31.5204, lng: 74.3587 },
  "pakistan|islamabad": { lat: 33.6844, lng: 73.0479 },
  "united kingdom|london": { lat: 51.5074, lng: -0.1278 },
  "united kingdom|manchester": { lat: 53.4808, lng: -2.2426 },
  "saudi arabia|riyadh": { lat: 24.7136, lng: 46.6753 },
  "saudi arabia|jeddah": { lat: 21.4858, lng: 39.1925 },
  "canada|toronto": { lat: 43.6532, lng: -79.3832 },
  "canada|vancouver": { lat: 49.2827, lng: -123.1207 },
  "india|mumbai": { lat: 19.076, lng: 72.8777 },
  "india|delhi": { lat: 28.6139, lng: 77.209 },
  "singapore|singapore": { lat: 1.3521, lng: 103.8198 },
};

export const COUNTRY_CITIES: Record<string, string[]> = {
  "United States": ["New York", "Los Angeles", "Miami", "Austin", "Chicago"],
  "United Arab Emirates": ["Dubai", "Abu Dhabi"],
  Pakistan: ["Karachi", "Lahore", "Islamabad"],
  "United Kingdom": ["London", "Manchester"],
  "Saudi Arabia": ["Riyadh", "Jeddah"],
  Canada: ["Toronto", "Vancouver"],
  India: ["Mumbai", "Delhi"],
  Singapore: ["Singapore"],
};

export function resolveCoords(
  country: string | null | undefined,
  city: string | null | undefined,
  lat?: number | null,
  lng?: number | null,
): GeoPoint | null {
  if (lat != null && lng != null && Number.isFinite(lat) && Number.isFinite(lng)) {
    return { lat, lng };
  }
  if (!country || !city) return null;
  const key = `${country.trim().toLowerCase()}|${city.trim().toLowerCase()}`;
  return CITY_COORDS[key] ?? null;
}

export function countriesList(): string[] {
  return Object.keys(COUNTRY_CITIES);
}

export function citiesForCountry(country: string): string[] {
  return COUNTRY_CITIES[country] ?? [];
}
