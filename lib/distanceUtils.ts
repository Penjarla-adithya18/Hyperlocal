/**
 * Utility functions for calculating distances between locations
 * Uses Indian city coordinates database for geocoding (no API required)
 */

/**
 * Database of major Indian cities with coordinates
 */
const INDIAN_CITIES: Record<string, { lat: number; lng: number }> = {
  // Metro Cities
  'mumbai': { lat: 19.0760, lng: 72.8777 },
  'delhi': { lat: 28.7041, lng: 77.1025 },
  'bangalore': { lat: 12.9716, lng: 77.5946 },
  'bengaluru': { lat: 12.9716, lng: 77.5946 },
  'hyderabad': { lat: 17.3850, lng: 78.4867 },
  'chennai': { lat: 13.0827, lng: 80.2707 },
  'kolkata': { lat: 22.5726, lng: 88.3639 },
  'pune': { lat: 18.5204, lng: 73.8567 },
  'ahmedabad': { lat: 23.0225, lng: 72.5714 },
  
  // Tier 2 Cities
  'surat': { lat: 21.1702, lng: 72.8311 },
  'jaipur': { lat: 26.9124, lng: 75.7873 },
  'lucknow': { lat: 26.8467, lng: 80.9462 },
  'kanpur': { lat: 26.4499, lng: 80.3319 },
  'nagpur': { lat: 21.1458, lng: 79.0882 },
  'visakhapatnam': { lat: 17.6868, lng: 83.2185 },
  'vizag': { lat: 17.6868, lng: 83.2185 },
  'indore': { lat: 22.7196, lng: 75.8577 },
  'thane': { lat: 19.2183, lng: 72.9781 },
  'bhopal': { lat: 23.2599, lng: 77.4126 },
  'vadodara': { lat: 22.3072, lng: 73.1812 },
  'coimbatore': { lat: 11.0168, lng: 76.9558 },
  'ludhiana': { lat: 30.9010, lng: 75.8573 },
  'agra': { lat: 27.1767, lng: 78.0081 },
  'kochi': { lat: 9.9312, lng: 76.2673 },
  'cochin': { lat: 9.9312, lng: 76.2673 },
  'patna': { lat: 25.5941, lng: 85.1376 },
  'kota': { lat: 25.2138, lng: 75.8648 },
  'mysore': { lat: 12.2958, lng: 76.6394 },
  'chandigarh': { lat: 30.7333, lng: 76.7794 },
  'gurgaon': { lat: 28.4595, lng: 77.0266 },
  'gurugram': { lat: 28.4595, lng: 77.0266 },
  'noida': { lat: 28.5355, lng: 77.3910 },
  'ghaziabad': { lat: 28.6692, lng: 77.4538 },
  'faridabad': { lat: 28.4089, lng: 77.3178 },
  
  // Other cities
  'ranchi': { lat: 23.3441, lng: 85.3096 },
  'rajkot': { lat: 22.3039, lng: 70.8022 },
  'dehradun': { lat: 30.3165, lng: 78.0322 },
  'jodhpur': { lat: 26.2389, lng: 73.0243 },
  'raipur': { lat: 21.2514, lng: 81.6296 },
  'varanasi': { lat: 25.3176, lng: 82.9739 },
  'amritsar': { lat: 31.6340, lng: 74.8723 },
  'jabalpur': { lat: 23.1815, lng: 79.9864 },
  'gwalior': { lat: 26.2183, lng: 78.1828 },
  'vijayawada': { lat: 16.5062, lng: 80.6480 },
  'madurai': { lat: 9.9252, lng: 78.1198 },
  'nashik': { lat: 19.9975, lng: 73.7898 },
  'meerut': { lat: 28.9845, lng: 77.7064 },
  'aurangabad': { lat: 19.8762, lng: 75.3433 },
  'thiruvananthapuram': { lat: 8.5241, lng: 76.9366 },
  'trivandrum': { lat: 8.5241, lng: 76.9366 },
  'jammu': { lat: 32.7266, lng: 74.8570 },
  'shimla': { lat: 31.1048, lng: 77.1734 },
  'srinagar': { lat: 34.0837, lng: 74.7973 },
  'gangtok': { lat: 27.3389, lng: 88.6065 },
  'mangalore': { lat: 12.9141, lng: 74.8560 },
  'tirupati': { lat: 13.6288, lng: 79.4192 },
  'pondicherry': { lat: 11.9416, lng: 79.8083 },
  'puducherry': { lat: 11.9416, lng: 79.8083 },
  'vellore': { lat: 12.9165, lng: 79.1325 },
  'bhubaneswar': { lat: 20.2961, lng: 85.8245 },
  'cuttack': { lat: 20.4625, lng: 85.8830 },
  'siliguri': { lat: 26.7271, lng: 88.3953 },
  'guwahati': { lat: 26.1445, lng: 91.7362 },
  'imphal': { lat: 24.8170, lng: 93.9368 },
  'shillong': { lat: 25.5788, lng: 91.8933 },
};

/**
 * Calculate straight-line distance between two coordinates using Haversine formula
 * Returns distance in kilometers
 */
export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Radius of the Earth in km
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) *
      Math.cos(deg2rad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c; // Distance in km
  return Math.round(distance * 10) / 10; // Round to 1 decimal
}

function deg2rad(deg: number): number {
  return deg * (Math.PI / 180);
}

/**
 * Extract city name from location string
 * Handles formats like "Mumbai, Maharashtra" or "Bangalore"
 */
function extractCityName(location: string): string {
  const normalized = location.toLowerCase().trim();
  // Try to match against known cities
  const parts = normalized.split(',');
  
  // Check each part for a city match
  for (const part of parts) {
    const cleaned = part.trim();
    if (INDIAN_CITIES[cleaned]) {
      return cleaned;
    }
  }
  
  // Check if any city name is contained in the location string
  for (const city of Object.keys(INDIAN_CITIES)) {
    if (normalized.includes(city)) {
      return city;
    }
  }
  
  return '';
}

/**
 * Get coordinates from location string using city database
 * No API required - uses built-in coordinates
 */
export function geocodeLocation(location: string): { lat: number; lng: number } | null {
  if (!location) return null;
  
  const city = extractCityName(location);
  if (!city) return null;
  
  return INDIAN_CITIES[city] || null;
}

/**
 * Calculate distance between two location strings
 * Returns null if coordinates not found for either location
 */
export function getDistanceBetweenLocations(
  location1: string,
  location2: string
): number | null {
  const coords1 = geocodeLocation(location1);
  const coords2 = geocodeLocation(location2);

  if (!coords1 || !coords2) return null;

  return calculateDistance(coords1.lat, coords1.lng, coords2.lat, coords2.lng);
}

/**
 * Format distance for display
 */
export function formatDistance(distanceKm: number | null): string {
  if (distanceKm === null) return '';
  if (distanceKm < 1) return `${Math.round(distanceKm * 1000)}m`;
  if (distanceKm < 10) return `${distanceKm.toFixed(1)}km`;
  return `${Math.round(distanceKm)}km`;
}
