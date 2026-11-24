import React, { useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View, ActivityIndicator, StyleSheet, Platform } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { setupNotificationHandler } from '../src/utils/notifications';
import {
  useFonts,
  Nunito_600SemiBold,
  Nunito_700Bold,
  Nunito_800ExtraBold,
} from '@expo-google-fonts/nunito';
import { AuthProvider, useAuth } from '../src/context/auth';
import { SettingsProvider } from '../src/context/settings';
import { colors } from '../src/theme';
import { repository } from '../src/db/sqliteRepository';

setupNotificationHandler();

function NavigationGuard() {
  const { session, isGuest, isLoading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    (window as any).repository = repository;
    repository.init().catch(console.error);
  }, []);

  useEffect(() => {
    if (session?.user?.id) {
      repository.claimLocalData(session.user.id).catch(console.error);
    } else {
      repository.setOwnerId('local');
    }
  }, [session]);

  useEffect(() => {
    if (isLoading) return;

    const inAuthGroup = segments[0] === '(auth)';

    if (!session && !isGuest && !inAuthGroup) {
      router.replace('/(auth)/sign-in');
    } else if ((session || isGuest) && inAuthGroup) {
      router.replace('/(tabs)');
    }
  }, [session, isGuest, isLoading, segments]);

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="(auth)" options={{ headerShown: false }} />
      <Stack.Screen
        name="workout/[id]"
        options={{
          headerShown: false,
          presentation: 'fullScreenModal',
          animation: 'slide_from_bottom',
        }}
      />
      <Stack.Screen
        name="workout/detail/[id]"
        options={{
          headerShown: false,
          animation: 'slide_from_right',
        }}
      />
      <Stack.Screen
        name="template/[id]"
        options={{
          headerShown: false,
          animation: 'slide_from_right',
        }}
      />
      <Stack.Screen
        name="settings"
        options={{
          headerShown: false,
          animation: 'slide_from_right',
        }}
      />
    </Stack>
  );
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Nunito_600SemiBold,
    Nunito_700Bold,
    Nunito_800ExtraBold,
  });

  useEffect(() => {
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      document.body.style.backgroundColor = '#020203';
      document.body.style.margin = '0';
    }
  }, []);

  if (!fontsLoaded && Platform.OS !== 'web') {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={styles.root}>
      <AuthProvider>
        <SettingsProvider>
          <StatusBar style="light" />
          <NavigationGuard />
        </SettingsProvider>
      </AuthProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
    ...(Platform.OS === 'web'
      ? {
          maxWidth: 440,
          width: '100%',
          alignSelf: 'center',
          minHeight: '100vh',
          boxShadow: '0 0 50px rgba(0, 0, 0, 0.85)',
          borderLeftWidth: 1,
          borderRightWidth: 1,
          borderColor: 'rgba(255, 255, 255, 0.08)',
        }
      : {}),
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
