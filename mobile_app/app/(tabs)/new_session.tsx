import { useState } from 'react';
import {
    View, Text, ScrollView, TouchableOpacity,
    StyleSheet, Alert, TextInput,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { SPACING, RADIUS } from '../../constants/theme';

const LANGUAGES = [
    { code: 'English', label: 'English', flag: '🇬🇧' },
    { code: 'Hindi', label: 'Hindi', flag: '🇮🇳' },
    { code: 'Marathi', label: 'Marathi', flag: '🇮🇳' },
    { code: 'Hinglish', label: 'Hinglish', flag: '🇮🇳' },
    { code: 'Spanish', label: 'Spanish', flag: '🇪🇸' },
    { code: 'French', label: 'French', flag: '🇫🇷' },
    { code: 'German', label: 'German', flag: '🇩🇪' },
    { code: 'Arabic', label: 'Arabic', flag: '🇸🇦' },
    { code: 'Chinese', label: 'Chinese', flag: '🇨🇳' },
    { code: 'Japanese', label: 'Japanese', flag: '🇯🇵' },
];

export default function NewSessionScreen() {
    const [name, setName] = useState('');
    const [age, setAge] = useState('');
    const [lang, setLang] = useState('English');

    function startSession() {
        if (!name.trim()) {
            Alert.alert('Missing Name', 'Please enter your name before starting.');
            return;
        }
        const sessionId = `session_${Date.now()}`;
        router.push({
            pathname: '/interview/[sessionId]',
            params: { sessionId, patientName: name.trim(), age: age || '30', language: lang },
        });
    }

    return (
        <LinearGradient colors={['#0f0c29', '#302b63', '#24243e']} style={styles.gradient}>
            <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

                {/* Header */}
                <View style={styles.header}>
                    <LinearGradient colors={['#00d2ff', '#7b2ff7']} style={styles.headerIcon} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
                        <Text style={{ fontSize: 32 }}>🩺</Text>
                    </LinearGradient>
                    <Text style={styles.title}>New Consultation</Text>
                    <Text style={styles.subtitle}>Set up your AI-powered medical interview</Text>
                </View>

                {/* Steps info */}
                {[
                    { n: '1', label: 'Speak naturally — describe symptoms', icon: '🎙️' },
                    { n: '2', label: 'Camera monitors your bio-signals live', icon: '👁️' },
                    { n: '3', label: 'AI analyzes & gives diagnosis + remedies', icon: '🔬' },
                ].map((s) => (
                    <View key={s.n} style={styles.stepRow}>
                        <View style={styles.stepBubble}><Text style={styles.stepNum}>{s.n}</Text></View>
                        <Text style={styles.stepIcon}>{s.icon}</Text>
                        <Text style={styles.stepLabel}>{s.label}</Text>
                    </View>
                ))}

                <View style={styles.divider} />

                {/* Form */}
                <Text style={styles.sectionLabel}>Your Name</Text>
                <View style={styles.inputRow}>
                    <Text style={styles.inputIcon}>👤</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="Enter your full name"
                        placeholderTextColor="rgba(255,255,255,0.3)"
                        value={name}
                        onChangeText={setName}
                    />
                </View>

                <Text style={[styles.sectionLabel, { marginTop: 14 }]}>Age (optional)</Text>
                <View style={styles.inputRow}>
                    <Text style={styles.inputIcon}>🎂</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="e.g. 28"
                        placeholderTextColor="rgba(255,255,255,0.3)"
                        value={age}
                        onChangeText={setAge}
                        keyboardType="numeric"
                    />
                </View>

                <Text style={[styles.sectionLabel, { marginTop: 14 }]}>Consultation Language</Text>
                <View style={styles.langGrid}>
                    {LANGUAGES.map((l) => (
                        <TouchableOpacity
                            key={l.code}
                            style={[styles.langChip, lang === l.code && styles.langChipSelected]}
                            onPress={() => setLang(l.code)}
                            activeOpacity={0.8}
                        >
                            <Text style={styles.langFlag}>{l.flag}</Text>
                            <Text style={[styles.langLabel, lang === l.code && { color: '#00d2ff' }]}>{l.label}</Text>
                        </TouchableOpacity>
                    ))}
                </View>

                {/* Start button */}
                <TouchableOpacity onPress={startSession} activeOpacity={0.88}>
                    <LinearGradient
                        colors={['#00d2ff', '#7b2ff7']}
                        style={styles.startBtn}
                        start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                    >
                        <Text style={styles.startBtnText}>🚀  Start My Consultation</Text>
                    </LinearGradient>
                </TouchableOpacity>

                <View style={{ height: 100 }} />
            </ScrollView>
        </LinearGradient>
    );
}

const styles = StyleSheet.create({
    gradient: { flex: 1 },
    scroll: { padding: SPACING.lg, paddingTop: 60 },
    header: { alignItems: 'center', marginBottom: SPACING.lg },
    headerIcon: {
        width: 72, height: 72, borderRadius: 36,
        alignItems: 'center', justifyContent: 'center', marginBottom: SPACING.md,
        shadowColor: '#00d2ff', shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.6, shadowRadius: 16, elevation: 10,
    },
    title: { color: '#fff', fontSize: 26, fontWeight: '800', marginBottom: 4 },
    subtitle: { color: 'rgba(255,255,255,0.5)', fontSize: 13 },
    stepRow: {
        flexDirection: 'row', alignItems: 'center', gap: 10,
        backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: RADIUS.md,
        padding: SPACING.md, marginBottom: 8,
        borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
    },
    stepBubble: {
        width: 30, height: 30, borderRadius: 15,
        backgroundColor: 'rgba(0,210,255,0.2)', alignItems: 'center', justifyContent: 'center',
        borderWidth: 1, borderColor: '#00d2ff',
    },
    stepNum: { color: '#00d2ff', fontWeight: '700', fontSize: 12 },
    stepIcon: { fontSize: 20 },
    stepLabel: { color: 'rgba(255,255,255,0.7)', fontSize: 13, flex: 1 },
    divider: { height: 1, backgroundColor: 'rgba(255,255,255,0.1)', marginVertical: SPACING.md },
    sectionLabel: { color: 'rgba(255,255,255,0.7)', fontSize: 12, fontWeight: '600', marginBottom: 8, letterSpacing: 0.8, textTransform: 'uppercase' },
    inputRow: {
        flexDirection: 'row', alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.06)',
        borderRadius: RADIUS.md, borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)', paddingHorizontal: SPACING.md,
    },
    inputIcon: { fontSize: 18, marginRight: 8 },
    input: { flex: 1, color: '#fff', height: 52, fontSize: 15 },
    langGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: SPACING.lg },
    langChip: {
        flexDirection: 'row', alignItems: 'center', gap: 6,
        paddingHorizontal: 12, paddingVertical: 8,
        borderRadius: RADIUS.full, backgroundColor: 'rgba(255,255,255,0.06)',
        borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)',
    },
    langChipSelected: {
        backgroundColor: 'rgba(0,210,255,0.15)', borderColor: '#00d2ff',
    },
    langFlag: { fontSize: 16 },
    langLabel: { color: 'rgba(255,255,255,0.7)', fontSize: 13, fontWeight: '500' },
    startBtn: {
        height: 58, borderRadius: RADIUS.xl,
        alignItems: 'center', justifyContent: 'center',
        marginTop: SPACING.xs,
        shadowColor: '#00d2ff', shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.5, shadowRadius: 16, elevation: 12,
    },
    startBtnText: { color: '#fff', fontSize: 17, fontWeight: '700' },
});
