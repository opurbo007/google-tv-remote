import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  TextInput,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import Animated, {
  FadeInDown,
  FadeOutUp,
} from 'react-native-reanimated';
import { scanForTVs } from '../lib/discovery';
import { useTVStore } from '../store/tvStore';
import type { DiscoveredTV } from '../lib/discovery';

export default function DiscoverScreen() {
  const router = useRouter();
  const { addPairedTV, pairedTVs } = useTVStore();

  const [scanning, setScanning] = useState(false);
  const [tvs, setTVs] = useState<DiscoveredTV[]>([]);
  const [manualIP, setManualIP] = useState('');
  const [showManual, setShowManual] = useState(false);

  const scan = useCallback(async () => {
    setScanning(true);
    setTVs([]);
    try {
      const found = await scanForTVs(6000);
      setTVs(found);
      if (found.length === 0) setShowManual(true);
    } catch (err) {
      Alert.alert('Scan failed', String(err));
    } finally {
      setScanning(false);
    }
  }, []);

  useEffect(() => {
    scan();
  }, []);

  function selectTV(tv: DiscoveredTV) {
    router.push({
      pathname: '/pair',
      params: { host: tv.host, name: tv.name, port: String(tv.port) },
    });
  }

  function selectManual() {
    if (!manualIP.trim()) return;
    router.push({
      pathname: '/pair',
      params: { host: manualIP.trim(), name: 'Google TV', port: '6467' },
    });
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color="#A0A0A0" />
        </Pressable>
        <Text style={styles.title}>Find your TV</Text>
        <Pressable onPress={scan} disabled={scanning} style={styles.scanBtn}>
          {scanning
            ? <ActivityIndicator size="small" color="#1A3FFF" />
            : <Ionicons name="refresh" size={20} color="#1A3FFF" />
          }
        </Pressable>
      </View>

      <Text style={styles.subtitle}>
        Make sure your phone and TV are on the same Wi-Fi network.
      </Text>

      {/* Scanning animation */}
      {scanning && (
        <Animated.View entering={FadeInDown} exiting={FadeOutUp} style={styles.scanningRow}>
          <ActivityIndicator color="#1A3FFF" />
          <Text style={styles.scanningText}>Scanning local network…</Text>
        </Animated.View>
      )}

      {/* Found TVs */}
      <FlatList
        data={tvs}
        keyExtractor={(item) => item.host}
        contentContainerStyle={styles.list}
        renderItem={({ item, index }) => (
          <Animated.View entering={FadeInDown.delay(index * 80)}>
            <Pressable style={styles.tvCard} onPress={() => selectTV(item)}>
              <View style={styles.tvIcon}>
                <Ionicons name="tv-outline" size={28} color="#1A3FFF" />
              </View>
              <View style={styles.tvInfo}>
                <Text style={styles.tvName}>{item.name}</Text>
                <Text style={styles.tvHost}>{item.host}</Text>
              </View>
              <View style={styles.alreadyPaired}>
                {pairedTVs.some((t) => t.host === item.host) && (
                  <View style={styles.pairedBadge}>
                    <Text style={styles.pairedText}>Paired</Text>
                  </View>
                )}
                <Ionicons name="chevron-forward" size={18} color="#444" />
              </View>
            </Pressable>
          </Animated.View>
        )}
        ListEmptyComponent={
          !scanning ? (
            <View style={styles.empty}>
              <Ionicons name="wifi-outline" size={48} color="#333" />
              <Text style={styles.emptyText}>No TVs found</Text>
              <Text style={styles.emptySubtext}>
                Make sure your Google TV is on and on the same network.
              </Text>
            </View>
          ) : null
        }
      />

      {/* Manual IP entry */}
      <View style={styles.manualSection}>
        <Pressable
          onPress={() => setShowManual(!showManual)}
          style={styles.manualToggle}
        >
          <Ionicons
            name={showManual ? 'chevron-up' : 'chevron-down'}
            size={16}
            color="#555"
          />
          <Text style={styles.manualToggleText}>Enter IP manually</Text>
        </Pressable>

        {showManual && (
          <Animated.View entering={FadeInDown} style={styles.manualRow}>
            <TextInput
              style={styles.ipInput}
              value={manualIP}
              onChangeText={setManualIP}
              placeholder="192.168.1.xxx"
              placeholderTextColor="#444"
              keyboardType="decimal-pad"
              returnKeyType="done"
              onSubmitEditing={selectManual}
            />
            <Pressable
              onPress={selectManual}
              style={[styles.connectBtn, !manualIP.trim() && styles.connectBtnDisabled]}
              disabled={!manualIP.trim()}
            >
              <Text style={styles.connectBtnText}>Connect</Text>
            </Pressable>
          </Animated.View>
        )}
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
  },
  backBtn: { padding: 4, marginRight: 8 },
  title: { flex: 1, color: '#F0F0F0', fontSize: 20, fontWeight: '700' },
  scanBtn: { padding: 8 },
  subtitle: {
    color: '#555',
    fontSize: 13,
    paddingHorizontal: 20,
    marginBottom: 16,
    lineHeight: 18,
  },
  scanningRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  scanningText: { color: '#666', fontSize: 13 },
  list: { paddingHorizontal: 16, paddingBottom: 16, gap: 10 },
  tvCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#141414',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#222',
    gap: 14,
  },
  tvIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#0D1A4A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tvInfo: { flex: 1 },
  tvName: { color: '#E0E0E0', fontSize: 15, fontWeight: '600' },
  tvHost: { color: '#555', fontSize: 12, marginTop: 3 },
  alreadyPaired: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  pairedBadge: {
    backgroundColor: '#0D2E0D',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: '#1A5A1A',
  },
  pairedText: { color: '#4CD964', fontSize: 11, fontWeight: '600' },
  empty: { alignItems: 'center', paddingVertical: 60, gap: 12 },
  emptyText: { color: '#444', fontSize: 16, fontWeight: '600' },
  emptySubtext: { color: '#333', fontSize: 13, textAlign: 'center', paddingHorizontal: 40 },
  manualSection: {
    paddingHorizontal: 16,
    paddingBottom: 24,
    borderTopWidth: 1,
    borderTopColor: '#1A1A1A',
    paddingTop: 16,
  },
  manualToggle: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 4 },
  manualToggleText: { color: '#555', fontSize: 13 },
  manualRow: { flexDirection: 'row', gap: 10, marginTop: 12 },
  ipInput: {
    flex: 1,
    backgroundColor: '#141414',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: '#E0E0E0',
    fontSize: 15,
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },
  connectBtn: {
    backgroundColor: '#1A3FFF',
    borderRadius: 10,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  connectBtnDisabled: { opacity: 0.4 },
  connectBtnText: { color: '#FFF', fontWeight: '700', fontSize: 14 },
});
