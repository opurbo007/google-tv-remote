import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
} from 'react-native-reanimated';
import { useTVStore } from '../store/tvStore';
import type { ConnectionStatus } from '../store/tvStore';

const STATUS_CONFIG: Record<
  ConnectionStatus,
  { label: string; color: string; pulse: boolean }
> = {
  idle:         { label: 'Not connected',  color: '#444',   pulse: false },
  connecting:   { label: 'Connecting…',    color: '#F5A623', pulse: true  },
  connected:    { label: 'Handshaking…',   color: '#F5A623', pulse: true  },
  ready:        { label: 'Connected',      color: '#4CD964', pulse: false },
  disconnected: { label: 'Disconnected',   color: '#FF3B30', pulse: false },
  error:        { label: 'Error',          color: '#FF3B30', pulse: false },
};

export function ConnectionBadge() {
  const { connectionStatus, activeTV, errorMessage } = useTVStore();
  const cfg = STATUS_CONFIG[connectionStatus];

  const opacity = useSharedValue(1);

  useEffect(() => {
    if (cfg.pulse) {
      opacity.value = withRepeat(
        withSequence(
          withTiming(0.3, { duration: 500 }),
          withTiming(1, { duration: 500 }),
        ),
        -1,
        false,
      );
    } else {
      opacity.value = withTiming(1, { duration: 200 });
    }
  }, [connectionStatus]);

  const dotStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.dot, { backgroundColor: cfg.color }, dotStyle]} />
      <View>
        <Text style={styles.label}>{cfg.label}</Text>
        {activeTV && connectionStatus === 'ready' && (
          <Text style={styles.tvName}>{activeTV.name}</Text>
        )}
        {connectionStatus === 'error' && errorMessage && (
          <Text style={styles.error} numberOfLines={1}>{errorMessage}</Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: '#141414',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  label: {
    color: '#A0A0A0',
    fontSize: 12,
    fontWeight: '500',
    letterSpacing: 0.2,
  },
  tvName: {
    color: '#E0E0E0',
    fontSize: 11,
    marginTop: 1,
  },
  error: {
    color: '#FF3B30',
    fontSize: 10,
    marginTop: 1,
    maxWidth: 160,
  },
});
