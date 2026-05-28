import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Pressable,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import Animated, {
  FadeIn,
  FadeInDown,
  ZoomIn,
} from 'react-native-reanimated';
import { pair } from '../lib/pairing';
import type { PairingEvent } from '../lib/pairing';
import { useTVStore } from '../store/tvStore';

type Stage =
  | 'connecting'
  | 'negotiating'
  | 'code'
  | 'verifying'
  | 'success'
  | 'error';

export default function PairScreen() {
  const { host, name, port } = useLocalSearchParams<{
    host: string;
    name: string;
    port: string;
  }>();
  const router = useRouter();
  const { clientCert, addPairedTV, connectToTV } = useTVStore();

  const [stage, setStage] = useState<Stage>('connecting');
  const [code, setCode] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState('');

  const startPairing = useCallback(async () => {
    if (!clientCert) {
      setStage('error');
      setErrorMsg('Client certificate not ready. Please restart the app.');
      return;
    }

    setStage('connecting');
    setCode('');
    setErrorMsg('');

    try {
      await pair(host, clientCert, (event: PairingEvent) => {
        switch (event.type) {
          case 'connecting':
            setStage('connecting');
            break;
          case 'connected':
            setStage('negotiating');
            break;
          case 'secret':
            setCode(event.code);
            setStage('code');
            break;
          case 'success':
            setStage('success');
            addPairedTV({ name: name ?? 'Google TV', host, port: parseInt(port ?? '6467') });
            setTimeout(() => {
              connectToTV({ name: name ?? 'Google TV', host, port: parseInt(port ?? '6467') });
              router.replace('/');
            }, 1500);
            break;
          case 'error':
            setStage('error');
            setErrorMsg(event.message);
            break;
          case 'closed':
            if (stage !== 'success') {
              setStage('error');
              setErrorMsg('Connection closed unexpectedly');
            }
            break;
        }
      });
    } catch (err) {
      setStage('error');
      setErrorMsg(String(err));
    }
  }, [clientCert, host, name, port]);

  useEffect(() => {
    startPairing();
  }, []);

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color="#A0A0A0" />
        </Pressable>
        <Text style={styles.title}>Pairing</Text>
      </View>

      <View style={styles.content}>
        {/* TV name */}
        <Animated.View entering={FadeIn} style={styles.tvNameRow}>
          <Ionicons name="tv-outline" size={20} color="#1A3FFF" />
          <Text style={styles.tvName}>{name ?? host}</Text>
        </Animated.View>

        {/* Stage: Connecting */}
        {(stage === 'connecting' || stage === 'negotiating') && (
          <Animated.View entering={FadeInDown} style={styles.center}>
            <ActivityIndicator size="large" color="#1A3FFF" />
            <Text style={styles.stageText}>
              {stage === 'connecting' ? 'Connecting to TV…' : 'Negotiating pairing…'}
            </Text>
          </Animated.View>
        )}

        {/* Stage: Code */}
        {stage === 'code' && (
          <Animated.View entering={FadeInDown} style={styles.codeSection}>
            <Text style={styles.codeInstruction}>
              A code will appear on your TV screen.{'\n'}
              Confirm it matches the code below, then press{' '}
              <Text style={styles.bold}>OK</Text> on your TV remote.
            </Text>

            <Animated.View entering={ZoomIn.delay(200)} style={styles.codeBox}>
              {code.split('').map((char, i) => (
                <View key={i} style={styles.codeChar}>
                  <Text style={styles.codeCharText}>{char}</Text>
                </View>
              ))}
            </Animated.View>

            <View style={styles.waitingRow}>
              <ActivityIndicator size="small" color="#F5A623" />
              <Text style={styles.waitingText}>Waiting for TV confirmation…</Text>
            </View>
          </Animated.View>
        )}

        {/* Stage: Success */}
        {stage === 'success' && (
          <Animated.View entering={ZoomIn} style={styles.center}>
            <View style={styles.successIcon}>
              <Ionicons name="checkmark" size={40} color="#4CD964" />
            </View>
            <Text style={styles.successText}>Paired successfully!</Text>
            <Text style={styles.successSub}>Launching remote…</Text>
          </Animated.View>
        )}

        {/* Stage: Error */}
        {stage === 'error' && (
          <Animated.View entering={FadeInDown} style={styles.center}>
            <View style={styles.errorIcon}>
              <Ionicons name="close" size={36} color="#FF3B30" />
            </View>
            <Text style={styles.errorTitle}>Pairing failed</Text>
            <Text style={styles.errorMsg}>{errorMsg}</Text>

            <Pressable style={styles.retryBtn} onPress={startPairing}>
              <Ionicons name="refresh" size={16} color="#FFF" />
              <Text style={styles.retryText}>Try again</Text>
            </Pressable>
          </Animated.View>
        )}
      </View>

      {/* Tips */}
      {(stage === 'connecting' || stage === 'negotiating' || stage === 'code') && (
        <Animated.View entering={FadeIn.delay(600)} style={styles.tips}>
          <Text style={styles.tipsTitle}>Tips</Text>
          <Text style={styles.tip}>• Your phone and TV must be on the same Wi-Fi</Text>
          <Text style={styles.tip}>• Make sure your Google TV is turned on</Text>
          <Text style={styles.tip}>• Go to Settings → Device Preferences → About on your TV</Text>
        </Animated.View>
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
  },
  backBtn: { padding: 4, marginRight: 8 },
  title: { color: '#F0F0F0', fontSize: 20, fontWeight: '700' },
  content: { flex: 1, paddingHorizontal: 24 },

  tvNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1A1A1A',
    marginBottom: 40,
  },
  tvName: { color: '#A0A0A0', fontSize: 15 },

  center: { alignItems: 'center', gap: 16, marginTop: 20 },

  stageText: { color: '#666', fontSize: 15, marginTop: 8 },

  codeSection: { alignItems: 'center', gap: 24 },
  codeInstruction: {
    color: '#777',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 22,
  },
  bold: { color: '#E0E0E0', fontWeight: '700' },

  codeBox: {
    flexDirection: 'row',
    gap: 10,
  },
  codeChar: {
    width: 44,
    height: 56,
    backgroundColor: '#141414',
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#1A3FFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#1A3FFF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  codeCharText: {
    color: '#1A3FFF',
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: 1,
  },

  waitingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  waitingText: { color: '#F5A623', fontSize: 13 },

  successIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#0D2E0D',
    borderWidth: 2,
    borderColor: '#4CD964',
    alignItems: 'center',
    justifyContent: 'center',
  },
  successText: { color: '#4CD964', fontSize: 20, fontWeight: '700' },
  successSub: { color: '#555', fontSize: 13 },

  errorIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#2E0D0D',
    borderWidth: 2,
    borderColor: '#FF3B30',
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorTitle: { color: '#FF3B30', fontSize: 18, fontWeight: '700' },
  errorMsg: {
    color: '#555',
    fontSize: 13,
    textAlign: 'center',
    paddingHorizontal: 20,
    lineHeight: 20,
  },
  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#1A3FFF',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 8,
  },
  retryText: { color: '#FFF', fontWeight: '700', fontSize: 15 },

  tips: {
    margin: 20,
    padding: 16,
    backgroundColor: '#111',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#1E1E1E',
    gap: 6,
  },
  tipsTitle: { color: '#444', fontSize: 11, fontWeight: '700', letterSpacing: 1, marginBottom: 4 },
  tip: { color: '#444', fontSize: 12, lineHeight: 18 },
});
