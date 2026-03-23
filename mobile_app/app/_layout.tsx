import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StyleSheet } from 'react-native';
import { AuthProvider } from '../context/AuthContext';

export default function RootLayout() {
    return (
        <GestureHandlerRootView style={styles.root}>
            <AuthProvider>
                <StatusBar style="light" backgroundColor="#0f0c29" />
                <Stack
                    screenOptions={{
                        headerShown: false,
                        contentStyle: { backgroundColor: '#0f0c29' },
                        animation: 'fade_from_bottom',
                    }}
                >
                    <Stack.Screen name="index" />
                    <Stack.Screen name="auth/login" />
                    <Stack.Screen name="auth/register" />
                    <Stack.Screen name="(tabs)" options={{ animation: 'fade' }} />
                    <Stack.Screen
                        name="interview/[sessionId]"
                        options={{ animation: 'slide_from_right', gestureEnabled: false }}
                    />
                    <Stack.Screen
                        name="results/[sessionId]"
                        options={{ animation: 'slide_from_bottom' }}
                    />
                </Stack>
            </AuthProvider>
        </GestureHandlerRootView>
    );
}

const styles = StyleSheet.create({
    root: { flex: 1 },
});
