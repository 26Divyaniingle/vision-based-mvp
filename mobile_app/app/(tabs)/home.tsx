import { useState, useEffect } from 'react';
import {
    View, Text, ScrollView, TouchableOpacity,
    StyleSheet, Animated, Easing,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { COLORS, SPACING, RADIUS } from '../../constants/theme';

const STATS = [
    { label: 'Sessions', value: '12', icon: '📋', color: '#00d2ff' },
    { label: 'Conditions', value: '3', icon: '🔬', color: '#7b2ff7' },
    { label: 'Reports', value: '8', icon: '📄', color: '#f9d423' },
    { label: 'Safety Rate', value: '100%', icon: '🛡️', color: '#00e676' },
];

const FEATURES = [
    { title: 'Bio-Vision Analysis', desc: 'Real-time emotion & pain detection via camera', icon: '👁️', from: '#00d2ff', to: '#7b2ff7' },
    { title: 'Voice Interview', desc: 'Speak naturally to describe your symptoms', icon: '🎙️', from: '#f9d423', to: '#f83600' },
    { title: 'RAG Diagnosis', desc: '380MB+ verified medical knowledge base', icon: '🔬', from: '#00e676', to: '#00d2ff' },
    { title: 'Dual Care Plan', desc: 'Allopathic + Ayurvedic treatment suggestions', icon: '🌿', from: '#7b2ff7', to: '#f9d423' },
];

export default function HomeScreen() {
    const pulseAnim = new Animated.Value(1);
    const fadeAnim = new Animated.Value(0);

    useEffect(() => {
        Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }).start();
        Animated.loop(
            Animated.sequence([
                Animated.timing(pulseAnim, { toValue: 1.05, duration: 1200, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
                Animated.timing(pulseAnim, { toValue: 1, duration: 1200, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
            ])
        ).start();
    }, []);

    return (
        <LinearGradient colors={['#0f0c29', '#302b63', '#24243e']} style={styles.gradient}>
            <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

                {/* Header */}
                <Animated.View style={[styles.headerRow, { opacity: fadeAnim }]}>
                    <View>
                        <Text style={styles.greeting}>Good morning! 👋</Text>
                        <Text style={styles.headerTitle}>Your Health Dashboard</Text>
                    </View>
                    <LinearGradient colors={['#00d2ff', '#7b2ff7']} style={styles.avatarCircle}>
                        <Text style={styles.avatarEmoji}>🧬</Text>
                    </LinearGradient>
                </Animated.View>

                {/* CTA Card */}
                <Animated.View style={{ opacity: fadeAnim, transform: [{ scale: pulseAnim }] }}>
                    <TouchableOpacity
                        activeOpacity={0.9}
                        onPress={() => router.push('/(tabs)/new_session')}
                    >
                        <LinearGradient
                            colors={['#00d2ff', '#7b2ff7']}
                            style={styles.ctaCard}
                            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                        >
                            <View style={styles.ctaGlowBall} />
                            <Text style={styles.ctaTitle}>Start Medical Consultation</Text>
                            <Text style={styles.ctaDesc}>
                                Begin a live, AI-powered medical session with real-time bio-vision monitoring
                            </Text>
                            <View style={styles.ctaBtn}>
                                <Text style={styles.ctaBtnText}>Begin Session  →</Text>
                            </View>
                        </LinearGradient>
                    </TouchableOpacity>
                </Animated.View>

                {/* Stats Grid */}
                <Text style={styles.sectionTitle}>Your Overview</Text>
                <View style={styles.statsGrid}>
                    {STATS.map((s) => (
                        <View key={s.label} style={styles.statCard}>
                            <Text style={styles.statIcon}>{s.icon}</Text>
                            <Text style={[styles.statValue, { color: s.color }]}>{s.value}</Text>
                            <Text style={styles.statLabel}>{s.label}</Text>
                        </View>
                    ))}
                </View>

                {/* Features */}
                <Text style={styles.sectionTitle}>What It Does</Text>
                <View style={styles.featureList}>
                    {FEATURES.map((f) => (
                        <View key={f.title} style={styles.featureCard}>
                            <LinearGradient colors={[f.from, f.to]} style={styles.featureIconBg} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
                                <Text style={styles.featureIcon}>{f.icon}</Text>
                            </LinearGradient>
                            <View style={styles.featureText}>
                                <Text style={styles.featureTitle}>{f.title}</Text>
                                <Text style={styles.featureDesc}>{f.desc}</Text>
                            </View>
                        </View>
                    ))}
                </View>

                {/* Disclaimer */}
                <View style={styles.disclaimer}>
                    <Text style={styles.disclaimerText}>
                        ⚕️ This AI assistant provides pre-consultation information only. Always consult a licensed physician for clinical decisions.
                    </Text>
                </View>

                <View style={{ height: 100 }} />
            </ScrollView>
        </LinearGradient>
    );
}

const styles = StyleSheet.create({
    gradient: { flex: 1 },
    scroll: { padding: SPACING.lg, paddingTop: 60 },
    headerRow: {
        flexDirection: 'row', justifyContent: 'space-between',
        alignItems: 'center', marginBottom: SPACING.lg,
    },
    greeting: { color: 'rgba(255,255,255,0.55)', fontSize: 13, marginBottom: 4 },
    headerTitle: { color: '#fff', fontSize: 22, fontWeight: '800' },
    avatarCircle: {
        width: 48, height: 48, borderRadius: 24,
        alignItems: 'center', justifyContent: 'center',
    },
    avatarEmoji: { fontSize: 22 },
    ctaCard: {
        borderRadius: RADIUS.xl, padding: SPACING.lg,
        marginBottom: SPACING.lg, overflow: 'hidden',
        shadowColor: '#00d2ff', shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.5, shadowRadius: 20, elevation: 14,
    },
    ctaGlowBall: {
        position: 'absolute', right: -30, top: -30,
        width: 150, height: 150, borderRadius: 75,
        backgroundColor: 'rgba(255,255,255,0.1)',
    },
    ctaTitle: { color: '#fff', fontSize: 20, fontWeight: '800', marginBottom: 8 },
    ctaDesc: { color: 'rgba(255,255,255,0.75)', fontSize: 13, lineHeight: 20, marginBottom: SPACING.md },
    ctaBtn: {
        backgroundColor: 'rgba(255,255,255,0.2)',
        borderRadius: RADIUS.full, paddingHorizontal: SPACING.lg,
        paddingVertical: 10, alignSelf: 'flex-start',
        borderWidth: 1, borderColor: 'rgba(255,255,255,0.35)',
    },
    ctaBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },
    sectionTitle: {
        color: 'rgba(255,255,255,0.7)', fontSize: 12, fontWeight: '700',
        letterSpacing: 1.2, textTransform: 'uppercase',
        marginBottom: SPACING.md, marginTop: SPACING.xs,
    },
    statsGrid: {
        flexDirection: 'row', flexWrap: 'wrap',
        gap: 12, marginBottom: SPACING.lg,
    },
    statCard: {
        flex: 1, minWidth: '44%',
        backgroundColor: 'rgba(255,255,255,0.07)',
        borderRadius: RADIUS.lg, padding: SPACING.md,
        alignItems: 'center',
        borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
    },
    statIcon: { fontSize: 26, marginBottom: 6 },
    statValue: { fontSize: 26, fontWeight: '800' },
    statLabel: { color: 'rgba(255,255,255,0.5)', fontSize: 11, marginTop: 2 },
    featureList: { gap: 12, marginBottom: SPACING.lg },
    featureCard: {
        flexDirection: 'row', alignItems: 'center', gap: 14,
        backgroundColor: 'rgba(255,255,255,0.07)',
        borderRadius: RADIUS.lg, padding: SPACING.md,
        borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
    },
    featureIconBg: {
        width: 48, height: 48, borderRadius: 16,
        alignItems: 'center', justifyContent: 'center',
    },
    featureIcon: { fontSize: 24 },
    featureText: { flex: 1 },
    featureTitle: { color: '#fff', fontSize: 14, fontWeight: '700', marginBottom: 2 },
    featureDesc: { color: 'rgba(255,255,255,0.5)', fontSize: 12, lineHeight: 17 },
    disclaimer: {
        backgroundColor: 'rgba(255,171,64,0.1)', borderRadius: RADIUS.md,
        padding: SPACING.md, borderWidth: 1, borderColor: 'rgba(255,171,64,0.3)',
    },
    disclaimerText: { color: 'rgba(255,171,64,0.9)', fontSize: 12, lineHeight: 18 },
});
