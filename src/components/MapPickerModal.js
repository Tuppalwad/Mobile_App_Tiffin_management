/**
 * Interactive Map Picker Modal
 * Uses Leaflet + OpenStreetMap inside WebView so users can tap/drag a pin
 * or use their current GPS location without requiring a Google Maps API key.
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import { X, Crosshair, MapPin, Check } from 'lucide-react-native';
import { COLORS, SIZES, FONTS } from '../constants/theme';
import { CustomAlert } from './CustomAlert';
import {
  requestLocationPermission,
  getCurrentPosition,
  reverseGeocode,
} from '../utils/locationUtils';

const DEFAULT_COORDS = { latitude: 19.076, longitude: 72.8777 };

const buildLeafletHtml = (lat, lng) => `
<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <style>
    html, body, #map { margin: 0; padding: 0; width: 100%; height: 100%; }
  </style>
</head>
<body>
  <div id="map"></div>
  <script>
    var map = L.map('map').setView([${lat}, ${lng}], 15);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '© OpenStreetMap'
    }).addTo(map);

    var marker = L.marker([${lat}, ${lng}], { draggable: true }).addTo(map);

    function notify(latlng) {
      window.ReactNativeWebView.postMessage(JSON.stringify({
        type: 'LOCATION_SELECTED',
        latitude: latlng.lat,
        longitude: latlng.lng
      }));
    }

    map.on('click', function(e) {
      marker.setLatLng(e.latlng);
      notify(e.latlng);
    });

    marker.on('dragend', function() {
      notify(marker.getLatLng());
    });

    window.setMapCenter = function(newLat, newLng) {
      var ll = L.latLng(newLat, newLng);
      marker.setLatLng(ll);
      map.setView(ll, 16);
    };
  </script>
</body>
</html>
`;

export const MapPickerModal = ({
  visible,
  initialLatitude,
  initialLongitude,
  onClose,
  onConfirm,
}) => {
  const insets = useSafeAreaInsets();
  const webViewRef = useRef(null);
  const [coords, setCoords] = useState(
    initialLatitude && initialLongitude
      ? { latitude: initialLatitude, longitude: initialLongitude }
      : null
  );
  const [address, setAddress] = useState('');
  const [locating, setLocating] = useState(false);
  const [resolvingAddress, setResolvingAddress] = useState(false);

  const resolveCoords = useCallback(async (lat, lng) => {
    setResolvingAddress(true);
    const resolved = await reverseGeocode(lat, lng);
    setAddress(resolved);
    setResolvingAddress(false);
  }, []);

  const handleUseCurrentLocation = useCallback(
    async (showAlertOnError = true) => {
      setLocating(true);
      try {
        const granted = await requestLocationPermission();
        if (!granted) {
          if (showAlertOnError) {
            CustomAlert.alert(
              'Permission Required',
              'Please grant location permission to use your current GPS location.'
            );
          }
          setCoords((prev) => prev || DEFAULT_COORDS);
          setLocating(false);
          return;
        }
        const pos = await getCurrentPosition();
        setCoords(pos);
        webViewRef.current?.injectJavaScript(
          `window.setMapCenter && window.setMapCenter(${pos.latitude}, ${pos.longitude}); true;`
        );
        await resolveCoords(pos.latitude, pos.longitude);
      } catch (err) {
        setCoords((prev) => prev || DEFAULT_COORDS);
        if (showAlertOnError) {
          CustomAlert.alert('Location Error', err.message || 'Could not detect current location.');
        }
      } finally {
        setLocating(false);
      }
    },
    [resolveCoords]
  );

  useEffect(() => {
    if (!visible) return;
    const init = async () => {
      if (initialLatitude && initialLongitude) {
        const initial = { latitude: initialLatitude, longitude: initialLongitude };
        setCoords(initial);
        resolveCoords(initial.latitude, initial.longitude);
      } else {
        setCoords(null);
        setAddress('');
        await handleUseCurrentLocation(true);
      }
    };
    init();
  }, [visible, initialLatitude, initialLongitude, resolveCoords, handleUseCurrentLocation]);

  const handleWebViewMessage = (event) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'LOCATION_SELECTED') {
        const next = { latitude: data.latitude, longitude: data.longitude };
        setCoords(next);
        resolveCoords(next.latitude, next.longitude);
      }
    } catch {
      // Ignore malformed messages
    }
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView
        edges={['top', 'bottom']}
        style={[
          styles.container,
          { paddingTop: Math.max(insets.top, 12), paddingBottom: insets.bottom },
        ]}
      >
        <View style={styles.header}>
          <Text style={styles.title}>Select Delivery Location</Text>
          <TouchableOpacity
            onPress={onClose}
            style={styles.closeBtn}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <X size={22} color={COLORS.text} />
          </TouchableOpacity>
        </View>

        <Text style={styles.hint}>
          Tap anywhere on the map or drag the pin to set your address
        </Text>

        <View style={styles.mapWrap}>
          {coords ? (
            <WebView
              ref={webViewRef}
              source={{ html: buildLeafletHtml(coords.latitude, coords.longitude) }}
              onMessage={handleWebViewMessage}
              onLoadEnd={() => {
                if (coords) {
                  webViewRef.current?.injectJavaScript(
                    `window.setMapCenter && window.setMapCenter(${coords.latitude}, ${coords.longitude}); true;`
                  );
                }
              }}
              javaScriptEnabled
              domStorageEnabled
              style={{ flex: 1 }}
            />
          ) : (
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10 }}>
              <ActivityIndicator size="large" color={COLORS.primary} />
              <Text style={{ fontSize: 13, color: COLORS.textSecondary }}>
                Getting your current location...
              </Text>
            </View>
          )}
          <TouchableOpacity
            style={styles.gpsFab}
            onPress={() => handleUseCurrentLocation(true)}
            disabled={locating}
          >
            {locating ? (
              <ActivityIndicator size="small" color={COLORS.primary} />
            ) : (
              <Crosshair size={20} color={COLORS.primary} />
            )}
            <Text style={styles.gpsFabText}>Current Location</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.footer}>
          <View style={styles.addressRow}>
            <MapPin size={18} color={COLORS.primary} style={{ marginTop: 2 }} />
            <View style={{ flex: 1 }}>
              <Text style={styles.addressLabel}>Selected Address</Text>
              {resolvingAddress ? (
                <Text style={styles.addressText}>Fetching address...</Text>
              ) : (
                <Text style={styles.addressText} numberOfLines={3}>
                  {address ||
                    (coords
                      ? `${coords.latitude.toFixed(5)}, ${coords.longitude.toFixed(5)}`
                      : 'Detecting location...')}
                </Text>
              )}
            </View>
          </View>

          <TouchableOpacity
            style={[styles.confirmBtn, !coords && { opacity: 0.6 }]}
            disabled={!coords}
            onPress={() =>
              coords &&
              onConfirm({
                latitude: coords.latitude,
                longitude: coords.longitude,
                address:
                  address || `${coords.latitude.toFixed(5)}, ${coords.longitude.toFixed(5)}`,
              })
            }
          >
            <Check size={18} color="#FFF" />
            <Text style={styles.confirmBtnText}>Confirm Delivery Location</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.surface,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  title: {
    ...FONTS.h3,
    color: COLORS.text,
  },
  closeBtn: {
    padding: 4,
  },
  hint: {
    fontSize: 12,
    color: COLORS.textSecondary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#FFF8F2',
  },
  mapWrap: {
    flex: 1,
    position: 'relative',
  },
  gpsFab: {
    position: 'absolute',
    right: 14,
    bottom: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFF',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: SIZES.radiusFull,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  gpsFabText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.primary,
  },
  footer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    backgroundColor: COLORS.surface,
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginBottom: 14,
  },
  addressLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textSecondary,
    textTransform: 'uppercase',
  },
  addressText: {
    fontSize: 13,
    color: COLORS.text,
    marginTop: 2,
    lineHeight: 18,
  },
  confirmBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: COLORS.primary,
    paddingVertical: 14,
    borderRadius: SIZES.radiusMd,
  },
  confirmBtnText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '700',
  },
});
