import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useTVStore } from '../src/store/tvStore';
import { getOrCreateClientCert } from '../src/lib/certificates';

export default function RootLayout() {
  const { setClientCert, loadPairedTVs } = useTVStore();

  useEffect(() => {
    async function init() {
      try {
        // Load or generate client certificate
        const cert = await getOrCreateClientCert();
        setClientCert(cert);
        // Load previously paired TVs from storage
        await loadPairedTVs();
      } catch (err) {
        console.error('[App] Init failed:', err);
      }
    }
    init();
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StatusBar style="light" backgroundColor="#0A0A0A" />
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: '#0A0A0A' },
            animation: 'slide_from_right',
          }}
        />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
