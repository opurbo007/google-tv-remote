import React, { useCallback } from 'react';
import {
  Pressable,
  StyleSheet,
  View,
  ViewStyle,
  Text,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useTVStore, KeyCode } from '../store/tvStore';
import type { KeyCodeValue } from '../store/tvStore';

interface RemoteButtonProps {
  keyCode: KeyCodeValue;
  label?: string;
  icon?: React.ReactNode;
  size?: number;
  shape?: 'circle' | 'rounded' | 'pill';
  variant?: 'default' | 'primary' | 'ghost' | 'danger';
  style?: ViewStyle;
  longPress?: boolean;
}

const COLORS = {
  default: { bg: '#1C1C1C', border: '#2A2A2A', active: '#2E2E2E' },
  primary: { bg: '#1A3FFF', border: '#3357FF', active: '#002FCC' },
  ghost: { bg: 'transparent', border: '#2A2A2A', active: '#1A1A1A' },
  danger: { bg: '#3A0A0A', border: '#7A1A1A', active: '#500A0A' },
};

export function RemoteButton({
  keyCode,
  label,
  icon,
  size = 56,
  shape = 'circle',
  variant = 'default',
  style,
  longPress = false,
}: RemoteButtonProps) {
  const { sendKey, keyDown, keyUp, connectionStatus } = useTVStore();
  const isReady = connectionStatus === 'ready';

  const scale = useSharedValue(1);
  const brightness = useSharedValue(1);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: brightness.value,
  }));

  const colors = COLORS[variant];

  const borderRadius =
    shape === 'circle'
      ? size / 2
      : shape === 'pill'
      ? 999
      : 14;

  const onPressIn = useCallback(() => {
    scale.value = withSpring(0.88, { stiffness: 400, damping: 20 });
    brightness.value = withTiming(0.7, { duration: 60 });
    if (longPress) keyDown(keyCode);
  }, [keyCode, longPress]);

  const onPressOut = useCallback(() => {
    scale.value = withSpring(1, { stiffness: 300, damping: 18 });
    brightness.value = withTiming(1, { duration: 120 });
    if (longPress) keyUp(keyCode);
  }, [keyCode, longPress]);

  const onPress = useCallback(() => {
    if (!longPress) sendKey(keyCode);
  }, [keyCode, longPress]);

  return (
    <Animated.View style={[animStyle, style]}>
      <Pressable
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        onPress={onPress}
        disabled={!isReady}
        style={[
          styles.button,
          {
            width: size,
            height: size,
            borderRadius,
            backgroundColor: colors.bg,
            borderColor: colors.border,
            opacity: isReady ? 1 : 0.35,
          },
        ]}
      >
        {icon}
        {label && !icon && (
          <Text style={styles.label}>{label}</Text>
        )}
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 4,
    elevation: 4,
  },
  label: {
    color: '#E0E0E0',
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
});
