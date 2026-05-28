import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { DPad } from '../components/DPad';
import { RemoteButton } from '../components/RemoteButton';
import { ConnectionBadge } from '../components/ConnectionBadge';
import { useTVStore, KeyCode } from '../store/tvStore';

export default function RemoteScreen() {
  const router = useRouter();
  const { connectionStatus, pairedTVs, connectToTV, disconnectFromTV, activeTV } = useTVStore();
  const isReady = connectionStatus === 'ready';

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      {/* ── Header ── */}
      <View style={styles.header}>
        <ConnectionBadge />
        <Pressable
          onPress={() => router.push('/discover')}
          style={styles.headerIcon}
        >
          <Ionicons name="add-circle-outline" size={26} color="#555" />
        </Pressable>
        {activeTV && (
          <Pressable onPress={disconnectFromTV} style={styles.headerIcon}>
            <Ionicons name="log-out-outline" size={24} color="#555" />
          </Pressable>
        )}
      </View>

      {/* ── Not connected state ── */}
      {!isReady && connectionStatus !== 'connecting' && connectionStatus !== 'connected' && (
        <Animated.View entering={FadeInDown} style={styles.notConnected}>
          <Ionicons name="tv-outline" size={52} color="#222" />
          <Text style={styles.noConnTitle}>No TV connected</Text>
          <Text style={styles.noConnSub}>
            {pairedTVs.length > 0
              ? 'Tap a paired TV below to connect'
              : 'Discover a TV to get started'}
          </Text>

          {pairedTVs.length > 0 && (
            <View style={styles.pairedList}>
              {pairedTVs.map((tv) => (
                <Pressable
                  key={tv.host}
                  style={styles.pairedItem}
                  onPress={() => connectToTV(tv)}
                >
                  <Ionicons name="tv" size={18} color="#1A3FFF" />
                  <Text style={styles.pairedItemText}>{tv.name}</Text>
                  <Text style={styles.pairedItemHost}>{tv.host}</Text>
                </Pressable>
              ))}
            </View>
          )}

          <Pressable
            style={styles.discoverBtn}
            onPress={() => router.push('/discover')}
          >
            <Ionicons name="search-outline" size={18} color="#FFF" />
            <Text style={styles.discoverBtnText}>
              {pairedTVs.length > 0 ? 'Add another TV' : 'Find TV'}
            </Text>
          </Pressable>
        </Animated.View>
      )}

      {/* ── Connecting indicator ── */}
      {(connectionStatus === 'connecting' || connectionStatus === 'connected') && (
        <View style={styles.notConnected}>
          <Text style={styles.noConnTitle}>Connecting…</Text>
        </View>
      )}

      {/* ── Remote UI ── */}
      {isReady && (
        <ScrollView
          contentContainerStyle={styles.remote}
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          {/* Row 1: Power · Input · Settings */}
          <Animated.View entering={FadeInDown.delay(50)} style={styles.row}>
            <RemoteButton
              keyCode={KeyCode.POWER}
              icon={<Ionicons name="power" size={20} color="#FF3B30" />}
              variant="danger"
              size={52}
            />
            <RemoteButton
              keyCode={KeyCode.TV_INPUT}
              icon={<Ionicons name="swap-horizontal-outline" size={20} color="#A0A0A0" />}
              size={52}
            />
            <RemoteButton
              keyCode={KeyCode.SETTINGS}
              icon={<Ionicons name="settings-outline" size={20} color="#A0A0A0" />}
              size={52}
            />
          </Animated.View>

          {/* Row 2: Volume · Mute · Home · Back */}
          <Animated.View entering={FadeInDown.delay(100)} style={styles.row}>
            <View style={styles.volGroup}>
              <RemoteButton
                keyCode={KeyCode.VOLUME_UP}
                icon={<Ionicons name="volume-high-outline" size={20} color="#E0E0E0" />}
                longPress
                size={52}
                shape="rounded"
              />
              <View style={styles.volDivider} />
              <RemoteButton
                keyCode={KeyCode.VOLUME_DOWN}
                icon={<Ionicons name="volume-low-outline" size={20} color="#E0E0E0" />}
                longPress
                size={52}
                shape="rounded"
              />
            </View>
            <RemoteButton
              keyCode={KeyCode.MUTE}
              icon={<Ionicons name="volume-mute-outline" size={20} color="#A0A0A0" />}
              size={52}
            />
            <RemoteButton
              keyCode={KeyCode.HOME}
              icon={<Ionicons name="home-outline" size={20} color="#E0E0E0" />}
              size={52}
              variant="primary"
            />
            <RemoteButton
              keyCode={KeyCode.BACK}
              icon={<Ionicons name="arrow-back-outline" size={20} color="#A0A0A0" />}
              size={52}
            />
          </Animated.View>

          {/* D-Pad */}
          <Animated.View entering={FadeInDown.delay(150)} style={styles.dpadContainer}>
            <DPad />
          </Animated.View>

          {/* Row 3: Rewind · Play/Pause · Forward */}
          <Animated.View entering={FadeInDown.delay(200)} style={styles.row}>
            <RemoteButton
              keyCode={KeyCode.MEDIA_PREVIOUS}
              icon={<Ionicons name="play-skip-back-outline" size={22} color="#A0A0A0" />}
              size={56}
            />
            <RemoteButton
              keyCode={KeyCode.MEDIA_PLAY_PAUSE}
              icon={<Ionicons name="play-pause-outline" size={24} color="#E0E0E0" />}
              size={64}
              variant="primary"
            />
            <RemoteButton
              keyCode={KeyCode.MEDIA_NEXT}
              icon={<Ionicons name="play-skip-forward-outline" size={22} color="#A0A0A0" />}
              size={56}
            />
          </Animated.View>

          {/* Row 4: Search · Assist */}
          <Animated.View entering={FadeInDown.delay(250)} style={[styles.row, { gap: 16 }]}>
            <RemoteButton
              keyCode={KeyCode.SEARCH}
              icon={<Ionicons name="search-outline" size={20} color="#A0A0A0" />}
              size={56}
              shape="pill"
              style={{ flex: 1 }}
            />
            <RemoteButton
              keyCode={KeyCode.ASSIST}
              icon={<Ionicons name="mic-outline" size={20} color="#A0A0A0" />}
              size={56}
              shape="pill"
              style={{ flex: 1 }}
            />
          </Animated.View>

          {/* Row 5: Number pad */}
          <Animated.View entering={FadeInDown.delay(300)} style={styles.numPad}>
            {[
              [KeyCode.NUM_1, '1'],
              [KeyCode.NUM_2, '2'],
              [KeyCode.NUM_3, '3'],
              [KeyCode.NUM_4, '4'],
              [KeyCode.NUM_5, '5'],
              [KeyCode.NUM_6, '6'],
              [KeyCode.NUM_7, '7'],
              [KeyCode.NUM_8, '8'],
              [KeyCode.NUM_9, '9'],
              [0, ''],
              [KeyCode.NUM_0, '0'],
              [0, ''],
            ].map(([keyCode, label], idx) =>
              keyCode ? (
                <RemoteButton
                  key={idx}
                  keyCode={keyCode as any}
                  label={String(label)}
                  size={52}
                  shape="rounded"
                  style={styles.numKey}
                />
              ) : (
                <View key={idx} style={styles.numKey} />
              )
            )}
          </Animated.View>
        </ScrollView>
      )}
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
  headerIcon: { padding: 6 },

  notConnected: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    gap: 12,
  },
  noConnTitle: { color: '#333', fontSize: 18, fontWeight: '700' },
  noConnSub: { color: '#2E2E2E', fontSize: 14, textAlign: 'center' },

  pairedList: { width: '100%', gap: 8, marginTop: 8 },
  pairedItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#141414',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#222',
  },
  pairedItemText: { flex: 1, color: '#E0E0E0', fontSize: 14, fontWeight: '600' },
  pairedItemHost: { color: '#444', fontSize: 12 },

  discoverBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#1A3FFF',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 8,
  },
  discoverBtnText: { color: '#FFF', fontWeight: '700', fontSize: 15 },

  remote: {
    alignItems: 'center',
    paddingVertical: 16,
    paddingBottom: 40,
    gap: 20,
  },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    width: '100%',
    paddingHorizontal: 24,
  },

  volGroup: {
    flexDirection: 'column',
    backgroundColor: '#161616',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#2A2A2A',
    overflow: 'hidden',
  },
  volDivider: { height: 1, backgroundColor: '#2A2A2A' },

  dpadContainer: {
    marginVertical: 4,
  },

  numPad: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 10,
    paddingHorizontal: 24,
    width: '100%',
  },
  numKey: { width: 72 },
});
