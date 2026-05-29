import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useTVStore, KeyCode } from '../store/tvStore';

/**
 * App launcher works by sending a key sequence to open the TV's app list,
 * then navigating to the app. Most Google TVs also support direct deep-links
 * via the SEARCH key + voice, which this screen triggers for each app.
 *
 * For fully automatic app launching, the Android TV Remote protocol v2 doesn't
 * expose an "open app" command directly — that requires ADB or the Google Home
 * API. This screen provides the next-best approach: app-specific search keys
 * and navigation shortcuts.
 */

interface AppShortcut {
  id: string;
  name: string;
  color: string;
  icon: keyof typeof Ionicons.glyphMap;
  // keyCode to press (usually SEARCH, then user types app name)
  action: 'search' | 'key';
  keyCode?: number;
}

const APPS: AppShortcut[] = [
  { id: 'youtube',  name: 'YouTube',        color: '#FF0000', icon: 'logo-youtube',    action: 'search' },
  { id: 'netflix',  name: 'Netflix',         color: '#E50914', icon: 'film-outline',    action: 'search' },
  { id: 'prime',    name: 'Prime Video',     color: '#00A8E0', icon: 'tv-outline',      action: 'search' },
  { id: 'disney',   name: 'Disney+',         color: '#0F3FA6', icon: 'star-outline',    action: 'search' },
  { id: 'spotify',  name: 'Spotify',         color: '#1DB954', icon: 'musical-notes-outline', action: 'search' },
  { id: 'hotstar',  name: 'Hotstar',         color: '#1F80E0', icon: 'play-circle-outline', action: 'search' },
  { id: 'settings', name: 'Settings',        color: '#8E8E93', icon: 'settings-outline', action: 'key', keyCode: KeyCode.SETTINGS },
  { id: 'home',     name: 'Home',            color: '#34C759', icon: 'home-outline',    action: 'key', keyCode: KeyCode.HOME },
  { id: 'input',    name: 'Change Input',    color: '#FF9500', icon: 'swap-horizontal-outline', action: 'key', keyCode: KeyCode.TV_INPUT },
  { id: 'search',   name: 'Search',          color: '#5856D6', icon: 'search-outline', action: 'key', keyCode: KeyCode.SEARCH },
];

export default function AppsScreen() {
  const router = useRouter();
  const { sendKey, connectionStatus } = useTVStore();
  const isReady = connectionStatus === 'ready';

  function handleApp(app: AppShortcut) {
    if (!isReady) return;

    if (app.action === 'key' && app.keyCode) {
      sendKey(app.keyCode as any);
      return;
    }

    // For streaming apps: press SEARCH, then user can type on keyboard
    sendKey(KeyCode.SEARCH);
    // Navigate to keyboard so user can type the app name
    setTimeout(() => router.push('/keyboard'), 300);
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color="#A0A0A0" />
        </Pressable>
        <Text style={styles.title}>Apps & Shortcuts</Text>
      </View>

      {!isReady && (
        <View style={styles.notReadyBanner}>
          <Ionicons name="warning-outline" size={16} color="#F5A623" />
          <Text style={styles.notReadyText}>Connect to a TV first</Text>
        </View>
      )}

      <FlatList
        data={APPS}
        keyExtractor={(item) => item.id}
        numColumns={3}
        contentContainerStyle={styles.grid}
        columnWrapperStyle={styles.row}
        renderItem={({ item, index }) => (
          <Animated.View
            entering={FadeInDown.delay(index * 50)}
            style={styles.appWrapper}
          >
            <Pressable
              style={({ pressed }) => [
                styles.appCard,
                pressed && styles.appCardPressed,
                !isReady && styles.appCardDisabled,
              ]}
              onPress={() => handleApp(item)}
              disabled={!isReady}
            >
              <View style={[styles.appIcon, { backgroundColor: item.color + '22', borderColor: item.color + '44' }]}>
                <Ionicons name={item.icon} size={28} color={item.color} />
              </View>
              <Text style={styles.appName} numberOfLines={2}>{item.name}</Text>
            </Pressable>
          </Animated.View>
        )}
      />

      {/* Info note */}
      <View style={styles.infoBox}>
        <Ionicons name="information-circle-outline" size={16} color="#444" />
        <Text style={styles.infoText}>
          Streaming apps open Search — use the Keyboard to type the app name.
          Direct app launch requires ADB.
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#0A0A0A' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  backBtn: { padding: 4 },
  title: { color: '#F0F0F0', fontSize: 20, fontWeight: '700' },

  notReadyBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 16,
    marginBottom: 12,
    backgroundColor: '#1A1200',
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#3A2800',
  },
  notReadyText: { color: '#F5A623', fontSize: 13 },

  grid: { padding: 16, gap: 12 },
  row: { gap: 12, justifyContent: 'flex-start' },

  appWrapper: { flex: 1, maxWidth: '33%' },
  appCard: {
    backgroundColor: '#141414',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#222',
    padding: 14,
    alignItems: 'center',
    gap: 10,
    minHeight: 100,
    justifyContent: 'center',
  },
  appCardPressed: { backgroundColor: '#1E1E1E', transform: [{ scale: 0.95 }] },
  appCardDisabled: { opacity: 0.3 },

  appIcon: {
    width: 52,
    height: 52,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  appName: {
    color: '#C0C0C0',
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 16,
  },

  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    margin: 16,
    padding: 12,
    backgroundColor: '#111',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#1E1E1E',
  },
  infoText: { flex: 1, color: '#444', fontSize: 12, lineHeight: 18 },
});
