/**
 * Location & Maps Utilities
 * Handles GPS permission requests, current position lookup,
 * reverse geocoding, and opening turn-by-turn directions in native Maps.
 */

import { Platform, PermissionsAndroid, Linking } from 'react-native';
import Geolocation from '@react-native-community/geolocation';

export const requestLocationPermission = async () => {
  if (Platform.OS === 'android') {
    const granted = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
      {
        title: 'Location Permission',
        message:
          'Allow access to your location to find nearby tiffin kitchens and select your delivery address.',
        buttonPositive: 'Allow',
        buttonNegative: 'Deny',
      }
    );
    return granted === PermissionsAndroid.RESULTS.GRANTED;
  }

  return new Promise((resolve) => {
    try {
      Geolocation.requestAuthorization(
        () => resolve(true),
        () => resolve(false)
      );
    } catch {
      resolve(true);
    }
  });
};

export const getCurrentPosition = () =>
  new Promise((resolve, reject) => {
    const onSuccess = (position) => {
      resolve({
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      });
    };

    // Try high-accuracy GPS first, then fall back to Wi-Fi/network location if GPS times out
    Geolocation.getCurrentPosition(
      onSuccess,
      () => {
        Geolocation.getCurrentPosition(
          onSuccess,
          (fallbackError) => {
            reject(new Error(fallbackError?.message || 'Unable to get current location'));
          },
          { enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 }
        );
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 15000 }
    );
  });

export const reverseGeocode = async (latitude, longitude) => {
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${encodeURIComponent(
      latitude
    )}&lon=${encodeURIComponent(longitude)}&addressdetails=1`;
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'HomemadeTiffinApp/1.0',
        Accept: 'application/json',
      },
    });
    if (!response.ok) throw new Error('Reverse geocode failed');
    const json = await response.json();
    if (json?.display_name) {
      return json.display_name;
    }
  } catch {
    // Fallback to coordinates if reverse geocoding is unavailable
  }
  return `${Number(latitude).toFixed(5)}, ${Number(longitude).toFixed(5)}`;
};

export const openDirectionsInMaps = async ({ latitude, longitude, address }) => {
  const hasCoords =
    latitude !== null &&
    latitude !== undefined &&
    longitude !== null &&
    longitude !== undefined &&
    !Number.isNaN(Number(latitude)) &&
    !Number.isNaN(Number(longitude));

  const dest = hasCoords
    ? `${Number(latitude)},${Number(longitude)}`
    : encodeURIComponent(address || '');

  if (!dest) return;

  const nativeUrl = Platform.select({
    ios: hasCoords
      ? `maps://?daddr=${dest}&dirflg=d`
      : `maps://?daddr=${dest}`,
    android: hasCoords
      ? `google.navigation:q=${dest}`
      : `geo:0,0?q=${dest}`,
  });

  const webUrl = `https://www.google.com/maps/dir/?api=1&destination=${dest}`;

  try {
    const canOpen = nativeUrl ? await Linking.canOpenURL(nativeUrl) : false;
    await Linking.openURL(canOpen ? nativeUrl : webUrl);
  } catch {
    await Linking.openURL(webUrl);
  }
};
