// src/lib/googleMaps.ts
const API_KEY = import.meta.env.VITE_GOOGLE_PLACES_API_KEY;

export const isGooglePlacesEnabled = !!API_KEY && API_KEY !== 'your_actual_api_key_here';

export const loadGooglePlacesScript = (): Promise<void> => {
  if (!isGooglePlacesEnabled) return Promise.resolve();

  return new Promise((resolve, reject) => {
    if (window.google?.maps?.places) {
      resolve();
      return;
    }

    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${API_KEY}&libraries=places`;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load Google Places'));
    document.head.appendChild(script);
  });
};