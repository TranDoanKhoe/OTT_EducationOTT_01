// @ts-nocheck
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import 'react-native-reanimated';

import { useColorScheme } from '@/hooks/use-color-scheme';

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <SafeAreaProvider>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <Stack>
          <Stack.Screen name="index" options={{ headerShown: false }} />
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="login" options={{ headerShown: false }} />
          <Stack.Screen name="register" options={{ headerShown: false }} />
          <Stack.Screen name="forgot-password" options={{ headerShown: false }} />
          <Stack.Screen name="chat/[id]" options={{ headerShown: false }} />
          <Stack.Screen name="chat/info" options={{ headerShown: false }} />
          <Stack.Screen name="friends/search" options={{ headerShown: false }} />
          <Stack.Screen name="friends/requests" options={{ headerShown: false }} />
          <Stack.Screen name="friends/contacts-import" options={{ headerShown: false }} />
          <Stack.Screen name="group/create" options={{ headerShown: false }} />
          <Stack.Screen name="group/settings" options={{ headerShown: false }} />
          <Stack.Screen name="group/invites" options={{ headerShown: false }} />
          <Stack.Screen name="group/notes" options={{ headerShown: false }} />
          <Stack.Screen name="group/polls" options={{ headerShown: false }} />
          <Stack.Screen name="class/[id]" options={{ headerShown: false }} />
          <Stack.Screen name="settings/notifications" options={{ headerShown: false }} />
          <Stack.Screen name="call/incoming" options={{ headerShown: false, gestureEnabled: false }} />
          <Stack.Screen name="call/active" options={{ headerShown: false, gestureEnabled: false }} />
          <Stack.Screen name="call/group-active" options={{ headerShown: false, gestureEnabled: false }} />
        </Stack>
        <StatusBar style="auto" />
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
