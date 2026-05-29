import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  TextInput,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useTVStore, KeyCode } from '../store/tvStore';
import { charToKeyCode } from '../lib/proto';

const ROWS_LOWER = [
  ['q','w','e','r','t','y','u','i','o','p'],
  ['a','s','d','f','g','h','j','k','l'],
  ['SHIFT','z','x','c','v','b','n','m','⌫'],
  ['123','@','SPACE','.','⏎'],
];

const ROWS_UPPER = [
  ['Q','W','E','R','T','Y','U','I','O','P'],
  ['A','S','D','F','G','H','J','K','L'],
  ['SHIFT','Z','X','C','V','B','N','M','⌫'],
  ['123','@','SPACE','.','⏎'],
];

const ROWS_SYMBOLS = [
  ['1','2','3','4','5','6','7','8','9','0'],
  ['!','@','#','$','%','^','&','*','(',')'],
  ['-','_','=','+','[',']','{','}','⌫'],
  ['ABC','/',';',"'",'SPACE',',','⏎'],
];

type Mode = 'lower' | 'upper' | 'symbols';

export default function KeyboardScreen() {
  const router = useRouter();
  const { sendKey, connectionStatus } = useTVStore();
  const isReady = connectionStatus === 'ready';

  const [mode, setMode] = useState<Mode>('lower');
  const [typed, setTyped] = useState('');

  const rows =
    mode === 'lower' ? ROWS_LOWER :
    mode === 'upper' ? ROWS_UPPER :
    ROWS_SYMBOLS;

  const handleKey = useCallback((key: string) => {
    if (!isReady) return;

    switch (key) {
      case 'SHIFT':
        setMode((m) => m === 'lower' ? 'upper' : 'lower');
        return;
      case '123':
        setMode('symbols');
        return;
      case 'ABC':
        setMode('lower');
        return;
      case 'SPACE':
        sendKey(KeyCode.SPACE);
        setTyped((t) => t + ' ');
        return;
      case '⌫':
        sendKey(KeyCode.BACKSPACE);
        setTyped((t) => t.slice(0, -1));
        return;
      case '⏎':
        sendKey(KeyCode.ENTER);
        return;
      default: {
        const kc = charToKeyCode(key);
        if (kc) {
          sendKey(kc);
          setTyped((t) => t + key);
          // Auto switch back to lower after uppercase letter
          if (mode === 'upper') setMode('lower');
        }
      }
    }
  }, [isReady, mode, sendKey]);

  const isWide = (key: string) =>
    key === 'SHIFT' || key === 'SPACE' || key === '123' || key === 'ABC' || key === '⏎';

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color="#A0A0A0" />
        </Pressable>
        <Text style={styles.title}>Keyboard</Text>
        {!isReady && (
          <Text style={styles.notReady}>Not connected</Text>
        )}
      </View>

      {/* Typed text preview */}
      <Animated.View entering={FadeInDown} style={styles.preview}>
        <Text style={styles.previewLabel}>Typing on TV</Text>
        <View style={styles.previewBox}>
          <Text style={styles.previewText} numberOfLines={2}>
            {typed || ' '}
          </Text>
          <View style={styles.cursor} />
        </View>
        {typed.length > 0 && (
          <Pressable
            onPress={() => {
              // Send backspace for each character
              for (let i = 0; i < typed.length; i++) sendKey(KeyCode.BACKSPACE);
              setTyped('');
            }}
            style={styles.clearBtn}
          >
            <Text style={styles.clearText}>Clear all</Text>
          </Pressable>
        )}
      </Animated.View>

      {/* Quick actions */}
      <View style={styles.quickRow}>
        <Pressable
          style={styles.quickBtn}
          onPress={() => { sendKey(KeyCode.DPAD_LEFT); }}
        >
          <Ionicons name="arrow-back" size={16} color="#A0A0A0" />
          <Text style={styles.quickText}>Cursor ←</Text>
        </Pressable>
        <Pressable
          style={styles.quickBtn}
          onPress={() => { sendKey(KeyCode.DPAD_RIGHT); }}
        >
          <Text style={styles.quickText}>Cursor →</Text>
          <Ionicons name="arrow-forward" size={16} color="#A0A0A0" />
        </Pressable>
        <Pressable
          style={styles.quickBtn}
          onPress={() => { sendKey(KeyCode.DEL_FORWARD); }}
        >
          <Ionicons name="close" size={16} color="#A0A0A0" />
          <Text style={styles.quickText}>Del →</Text>
        </Pressable>
      </View>

      {/* Keyboard */}
      <View style={styles.keyboard}>
        {rows.map((row, ri) => (
          <Animated.View
            key={ri}
            entering={FadeInDown.delay(ri * 40)}
            style={styles.row}
          >
            {row.map((key) => (
              <Pressable
                key={key}
                onPress={() => handleKey(key)}
                disabled={!isReady}
                style={({ pressed }) => [
                  styles.key,
                  isWide(key) && styles.keyWide,
                  key === 'SPACE' && styles.keySpace,
                  key === 'SHIFT' && mode === 'upper' && styles.keyActive,
                  pressed && styles.keyPressed,
                  !isReady && styles.keyDisabled,
                ]}
              >
                {key === 'SHIFT' ? (
                  <Ionicons
                    name={mode === 'upper' ? 'arrow-up' : 'arrow-up-outline'}
                    size={16}
                    color={mode === 'upper' ? '#fff' : '#A0A0A0'}
                  />
                ) : key === '⌫' ? (
                  <Ionicons name="backspace-outline" size={18} color="#A0A0A0" />
                ) : key === '⏎' ? (
                  <Ionicons name="return-down-back-outline" size={18} color="#4CD964" />
                ) : (
                  <Text style={[
                    styles.keyText,
                    key === '⏎' && { color: '#4CD964' },
                  ]}>
                    {key === 'SPACE' ? '     ' : key}
                  </Text>
                )}
              </Pressable>
            ))}
          </Animated.View>
        ))}
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
  title: { flex: 1, color: '#F0F0F0', fontSize: 20, fontWeight: '700' },
  notReady: { color: '#FF3B30', fontSize: 12 },

  preview: {
    marginHorizontal: 16,
    marginBottom: 12,
    gap: 6,
  },
  previewLabel: { color: '#444', fontSize: 11, letterSpacing: 0.5 },
  previewBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#141414',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#2A2A2A',
    minHeight: 44,
  },
  previewText: {
    flex: 1,
    color: '#E0E0E0',
    fontSize: 16,
    letterSpacing: 0.3,
  },
  cursor: {
    width: 2,
    height: 20,
    backgroundColor: '#1A3FFF',
    borderRadius: 1,
  },
  clearBtn: { alignSelf: 'flex-end' },
  clearText: { color: '#FF3B30', fontSize: 12 },

  quickRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 8,
    marginBottom: 12,
  },
  quickBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    backgroundColor: '#141414',
    borderRadius: 8,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#222',
  },
  quickText: { color: '#666', fontSize: 12 },

  keyboard: {
    paddingHorizontal: 6,
    gap: 6,
    paddingBottom: 16,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 5,
  },
  key: {
    minWidth: 32,
    height: 44,
    backgroundColor: '#1C1C1C',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
    borderWidth: 1,
    borderColor: '#2C2C2C',
    flex: 1,
    maxWidth: 40,
  },
  keyWide: {
    maxWidth: 60,
    flex: 1.5,
  },
  keySpace: {
    maxWidth: 160,
    flex: 5,
  },
  keyActive: {
    backgroundColor: '#1A3FFF',
    borderColor: '#3357FF',
  },
  keyPressed: {
    backgroundColor: '#2E2E2E',
  },
  keyDisabled: {
    opacity: 0.3,
  },
  keyText: {
    color: '#E0E0E0',
    fontSize: 15,
    fontWeight: '500',
  },
});
