import { useEffect } from 'react';
import { View, Text, StyleSheet, Animated, Easing } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { getToken } from '../services/authService';
import { COLORS } from '../constants/theme';

export default function SplashScreen() {
    const pulseAnim = new Animated.Value(0.8);
    const fadeAnim = new Animated.Value(0);
    const slideAnim = new Animated.Value(40);

    useEffect(() => {
        // Pulse animation for icon
        Animated.loop(
            Animated.sequence([
                Animated.timing(pulseAnim, { toValue: 1.1, duration: 900, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
                Animated.timing(pulseAnim, { toValue: 0.8, duration: 900, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
            ])
        ).start();

        // Fade + slide for text
        Animated.parallel([
            Animated.timing(fadeAnim, { toValue: 1, duration: 800, delay: 300, useNativeDriver: true }),
            Animated.timing(slideAnim, { toValue: 0, duration: 800, delay: 300, easing: Easing.out(Easing.back(1.5)), useNativeDriver: true }),
        ]).start();

        // Navigate after 2.5s
        const timer = setTimeout(async () => {
            const token = await getToken();
            if (token) {
                router.replace('/(tabs)/home');
            } else {
                router.replace('/auth/login');
            }
        }, 2500);

        return () => clearTimeout(timer);
    }, []);

    return (
        <LinearGradient colors={['#0f0c29', '#302b63', '#24243e']} style={styles.container}>
            {/* Glow rings */}
            <View style={styles.glowRing1} />
            <View style={styles.glowRing2} />

            <Animated.View style={[styles.logoContainer, { transform: [{ scale: pulseAnim }] }]}>
                <LinearGradient
                    colors={['#00d2ff', '#7b2ff7']}
                    style={styles.logoGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                >
                    <Text style={styles.logoIcon}>🧠</Text>
                </LinearGradient>
            </Animated.View>

            <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
                <Text style={styles.appName}>Vision Agentic AI</Text>
                <Text style={styles.tagline}>Your Multi-Modal Medical Assistant</Text>

                <View style={styles.badgeRow}>
                    <View style={styles.badge}>
                        <Text style={styles.badgeText}>🔬 RAG-Powered</Text>
                    </View>
                    <View style={styles.badge}>
                        <Text style={styles.badgeText}>👁️ Bio-Vision</Text>
                    </View>
                    <View style={styles.badge}>
                        <Text style={styles.badgeText}>🛡️ Safe AI</Text>
                    </View>
                </View>
            </Animated.View>

            <View style={styles.footer}>
                <View style={styles.loadingBar}>
                    <Animated.View style={[styles.loadingFill, { width: '75%' }]} />
                </View>
                <Text style={styles.footerText}>Powered by MedGemma · FAISS · RAG Pipeline</Text>
            </View>
        </LinearGradient>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    glowRing1: {
        position: 'absolute', width: 400, height: 400, borderRadius: 200,
        borderWidth: 1, borderColor: 'rgba(0,210,255,0.15)',
    },
    glowRing2: {
        position: 'absolute', width: 280, height: 280, borderRadius: 140,
        borderWidth: 1, borderColor: 'rgba(123,47,247,0.2)',
    },
    logoContainer: { marginBottom: 32 },
    logoGradient: {
        width: 110, height: 110, borderRadius: 55,
        alignItems: 'center', justifyContent: 'center',
        shadowColor: '#00d2ff', shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.8, shadowRadius: 30, elevation: 20,
    },
    logoIcon: { fontSize: 52 },
    appName: {
        fontSize: 34, fontWeight: '800', color: '#fff',
        textAlign: 'center', letterSpacing: 0.5,
    },
    tagline: {
        fontSize: 14, color: 'rgba(255,255,255,0.6)',
        textAlign: 'center', marginTop: 6, marginBottom: 24,
    },
    badgeRow: { flexDirection: 'row', gap: 8, justifyContent: 'center' },
    badge: {
        backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 20,
        paddingHorizontal: 12, paddingVertical: 6,
        borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)',
    },
    badgeText: { color: '#fff', fontSize: 11, fontWeight: '600' },
    footer: { position: 'absolute', bottom: 48, alignItems: 'center', gap: 12 },
    loadingBar: {
        width: 180, height: 3, backgroundColor: 'rgba(255,255,255,0.1)',
        borderRadius: 2, overflow: 'hidden',
    },
    loadingFill: {
        height: '100%', borderRadius: 2,
        backgroundColor: '#00d2ff',
    },
    footerText: { color: 'rgba(255,255,255,0.35)', fontSize: 11 },
});
