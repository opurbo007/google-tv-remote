import React, { useCallback } from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useTVStore, KeyCode } from '../store/tvStore';

const SIZE = 220;
const CENTER_SIZE = 72;
const ARROW_ZONE = (SIZE - CENTER_SIZE) / 2; // ~74

export function DPad() {
  const { sendKey, connectionStatus } = useTVStore();
  const isReady = connectionStatus === 'ready';

  const upScale = useSharedValue(1);
  const downScale = useSharedValue(1);
  const leftScale = useSharedValue(1);
  const rightScale = useSharedValue(1);
  const centerScale = useSharedValue(1);

  function makePress(keyCode: number, shared: Animated.SharedValue<number>) {
    return {
      onPressIn: () => {
        shared.value = withSpring(0.85, { stiffness: 400 });
      },
      onPressOut: () => {
        shared.value = withSpring(1, { stiffness: 300 });
      },
      onPress: () => {
        if (isReady) sendKey(keyCode as any);
      },
    };
  }

  const upAnim = useAnimatedStyle(() => ({ transform: [{ scale: upScale.value }] }));
  const downAnim = useAnimatedStyle(() => ({ transform: [{ scale: downScale.value }] }));
  const leftAnim = useAnimatedStyle(() => ({ transform: [{ scale: leftScale.value }] }));
  const rightAnim = useAnimatedStyle(() => ({ transform: [{ scale: rightScale.value }] }));
  const centerAnim = useAnimatedStyle(() => ({ transform: [{ scale: centerScale.value }] }));

  const opacity = isReady ? 1 : 0.35;

  return (
    <View style={[styles.container, { opacity }]}>
      {/* Outer ring */}
      <View style={styles.ring} />

      {/* UP */}
      <Animated.View style={[styles.arrowUp, upAnim]}>
        <Pressable style={styles.arrowHit} {...makePress(KeyCode.DPAD_UP, upScale)}>
          <Ionicons name="chevron-up" size={22} color="#E0E0E0" />
        </Pressable>
      </Animated.View>

      {/* DOWN */}
      <Animated.View style={[styles.arrowDown, downAnim]}>
        <Pressable style={styles.arrowHit} {...makePress(KeyCode.DPAD_DOWN, downScale)}>
          <Ionicons name="chevron-down" size={22} color="#E0E0E0" />
        </Pressable>
      </Animated.View>

      {/* LEFT */}
      <Animated.View style={[styles.arrowLeft, leftAnim]}>
        <Pressable style={styles.arrowHit} {...makePress(KeyCode.DPAD_LEFT, leftScale)}>
          <Ionicons name="chevron-back" size={22} color="#E0E0E0" />
        </Pressable>
      </Animated.View>

      {/* RIGHT */}
      <Animated.View style={[styles.arrowRight, rightAnim]}>
        <Pressable style={styles.arrowHit} {...makePress(KeyCode.DPAD_RIGHT, rightScale)}>
          <Ionicons name="chevron-forward" size={22} color="#E0E0E0" />
        </Pressable>
      </Animated.View>

      {/* CENTER (OK / Select) */}
      <Animated.View style={[styles.center, centerAnim]}>
        <Pressable style={styles.centerHit} {...makePress(KeyCode.DPAD_CENTER, centerScale)}>
          {/* Subtle OK label */}
          <View style={styles.centerInner} />
        </Pressable>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: SIZE,
    height: SIZE,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  ring: {
    position: 'absolute',
    width: SIZE,
    height: SIZE,
    borderRadius: SIZE / 2,
    backgroundColor: '#161616',
    borderWidth: 1.5,
    borderColor: '#2C2C2C',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.6,
    shadowRadius: 12,
    elevation: 8,
  },
  arrowUp: {
    position: 'absolute',
    top: 16,
    alignSelf: 'center',
  },
  arrowDown: {
    position: 'absolute',
    bottom: 16,
    alignSelf: 'center',
  },
  arrowLeft: {
    position: 'absolute',
    left: 16,
    alignSelf: 'center',
    top: '50%',
    marginTop: -22,
  },
  arrowRight: {
    position: 'absolute',
    right: 16,
    alignSelf: 'center',
    top: '50%',
    marginTop: -22,
  },
  arrowHit: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  center: {
    position: 'absolute',
    width: CENTER_SIZE,
    height: CENTER_SIZE,
    borderRadius: CENTER_SIZE / 2,
  },
  centerHit: {
    width: CENTER_SIZE,
    height: CENTER_SIZE,
    borderRadius: CENTER_SIZE / 2,
    backgroundColor: '#212121',
    borderWidth: 1.5,
    borderColor: '#333',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 4,
    elevation: 4,
  },
  centerInner: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#2E2E2E',
    borderWidth: 1,
    borderColor: '#404040',
  },
});
