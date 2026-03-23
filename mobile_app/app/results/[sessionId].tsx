import { useEffect, useState } from 'react';
import {
    View, Text, ScrollView, TouchableOpacity,
    StyleSheet, Share, Alert, ActivityIndicator, Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import { emailPdfReport, generatePdfReport } from '../../services/sessionService';
import { SPACING, RADIUS } from '../../constants/theme';

export default function ResultsScreen() {
    const { sessionId, resultData, patientName } = useLocalSearchParams<{
        sessionId: string; resultData: string; patientName: string;
    }>();

    const [data, setData] = useState<any>(null);
    const [emailInput, setEmailInput] = useState('');
    const [loadingPdf, setLoadingPdf] = useState(false);
    const fadeAnim = new Animated.Value(0);
    const slideAnim = new Animated.Value(50);

    useEffect(() => {
        if (resultData) {
            try { setData(JSON.parse(resultData)); } catch (_) { }
        }
        Animated.parallel([
            Animated.timing(fadeAnim, { toValue: 1, duration: 700, useNativeDriver: true }),
            Animated.timing(slideAnim, { toValue: 0, duration: 700, useNativeDriver: true }),
        ]).start();
    }, [resultData]);

    const diagnosis = data?.diagnosis || {};
    const vision = data?.vision || {};
    const symptoms: string[] = data?.symptoms || [];

    const confidencePct = ((diagnosis.confidence || 0) * 100).toFixed(1);
    const safetyPassed = diagnosis.safety_passed !== false;

    async function handleDownloadPdf() {
        if (!data) return;
        setLoadingPdf(true);
        try {
            const sessionDataForPdf = {
                vision: {
                    dominant_emotion: vision.dominant_emotion,
                    avg_eye_strain: vision.avg_eye_strain,
                    avg_lip_tension: vision.avg_lip_tension,
                },
                ai_results: diagnosis,
                symptoms: symptoms.join(', '),
            };
            const pdf64 = await generatePdfReport(sessionDataForPdf, patientName || 'Patient');
            Alert.alert('PDF Generated ✅', 'Your medical report PDF has been generated. You can share it now.');
            await Share.share({ message: 'Vision Agentic AI Medical Report', title: 'Medical Report' });
        } catch (e: any) {
            Alert.alert('Error', e.message);
        } finally {
            setLoadingPdf(false);
        }
    }

    async function handleEmailPdf() {
        if (!emailInput.includes('@')) {
            Alert.alert('Invalid Email', 'Please enter a valid email address.');
            return;
        }
        setLoadingPdf(true);
        try {
            const sessionDataForPdf = {
                vision: {
                    dominant_emotion: vision.dominant_emotion,
                    avg_eye_strain: vision.avg_eye_strain,
                    avg_lip_tension: vision.avg_lip_tension,
                },
                ai_results: diagnosis,
                symptoms: symptoms.join(', '),
            };
            const success = await emailPdfReport(sessionDataForPdf, patientName || 'Patient', emailInput);
            Alert.alert(success ? '✅ Email Sent!' : '❌ Failed', success ? `Report sent to ${emailInput}` : 'Could not send email.');
        } catch (e: any) {
            Alert.alert('Error', e.message);
        } finally {
            setLoadingPdf(false);
        }
    }

    if (!data) {
        return (
            <LinearGradient colors={['#0f0c29', '#302b63']} style={styles.loadingScreen}>
                <ActivityIndicator color="#00d2ff" size="large" />
                <Text style={styles.loadingText}>Loading results…</Text>
            </LinearGradient>
        );
    }

    return (
        <LinearGradient colors={['#0f0c29', '#302b63', '#24243e']} style={styles.gradient}>
            <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

                {/* Header */}
                <Animated.View style={[styles.header, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
                    <LinearGradient colors={safetyPassed ? ['#00e676', '#00acc1'] : ['#ff5252', '#b71c1c']} style={styles.headerIcon}>
                        <Text style={{ fontSize: 36 }}>{safetyPassed ? '✅' : '⚠️'}</Text>
                    </LinearGradient>
                    <Text style={styles.headerTitle}>Consultation Complete</Text>
                    <Text style={styles.headerSub}>
                        {patientName} · Session {sessionId?.slice(-6)}
                    </Text>
                    <View style={[styles.safetyBadge, { backgroundColor: safetyPassed ? 'rgba(0,230,118,0.15)' : 'rgba(255,82,82,0.15)' }]}>
                        <Text style={[styles.safetyText, { color: safetyPassed ? '#00e676' : '#ff5252' }]}>
                            {safetyPassed ? '🛡️ SAFETY PASSED — Safe for Home Care' : '🚨 CONSULT A DOCTOR IMMEDIATELY'}
                        </Text>
                    </View>
                </Animated.View>

                {/* Condition Card */}
                <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
                    <LinearGradient colors={['rgba(0,210,255,0.18)', 'rgba(123,47,247,0.18)']} style={styles.conditionCard}>
                        <Text style={styles.cardSubtitle}>PREDICTED CONDITION</Text>
                        <Text style={styles.conditionText}>{diagnosis.condition || 'Unknown'}</Text>
                        {/* Confidence bar */}
                        <View style={styles.confRow}>
                            <Text style={styles.confLabel}>AI Confidence</Text>
                            <Text style={styles.confPct}>{confidencePct}%</Text>
                        </View>
                        <View style={styles.confBar}>
                            <LinearGradient
                                colors={['#00d2ff', '#7b2ff7']}
                                style={[styles.confFill, { width: `${confidencePct}%` as any }]}
                                start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                            />
                        </View>
                    </LinearGradient>
                </Animated.View>

                {/* Symptoms */}
                {symptoms.length > 0 && (
                    <Section title="🩺 Detected Symptoms">
                        <View style={styles.pillRow}>
                            {symptoms.map((s, i) => (
                                <View key={i} style={styles.symptomPill}>
                                    <Text style={styles.symptomText}>{s}</Text>
                                </View>
                            ))}
                        </View>
                    </Section>
                )}

                {/* Vision Analysis */}
                <Section title="👁️ Bio-Visual Analysis">
                    <View style={styles.metricsRow}>
                        <MetricBox icon="😐" label="Emotion" value={(vision.dominant_emotion || 'Neutral').toUpperCase()} />
                        <MetricBox icon="👁" label="Eye Strain" value={`${((vision.avg_eye_strain || 0) * 100).toFixed(0)}%`} />
                        <MetricBox icon="💋" label="Lip Tension" value={`${((vision.avg_lip_tension || 0) * 100).toFixed(0)}%`} />
                    </View>
                </Section>

                {/* Medication */}
                <Section title="💊 Clinical Medication">
                    <Text style={styles.bodyText}>{diagnosis.medication || 'Consult a doctor for advice.'}</Text>
                </Section>

                {/* Ayurvedic */}
                <Section title="🌿 Ayurvedic & Wellness">
                    <Text style={styles.bodyText}>{diagnosis.ayurvedic || 'Standard wellness advice recommended.'}</Text>
                </Section>

                {/* Prevention */}
                <Section title="🛡️ Prevention & Lifestyle">
                    <Text style={styles.bodyText}>{diagnosis.prevention || 'Maintain standard health precautions.'}</Text>
                </Section>

                {/* Report Actions */}
                <Section title="📄 Get Your Report">
                    <TouchableOpacity onPress={handleDownloadPdf} disabled={loadingPdf} activeOpacity={0.88}>
                        <LinearGradient colors={['#00d2ff', '#7b2ff7']} style={styles.actionBtn} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                            {loadingPdf ? <ActivityIndicator color="#fff" /> : <Text style={styles.actionBtnText}>⬇️  Download PDF Report</Text>}
                        </LinearGradient>
                    </TouchableOpacity>

                    <View style={styles.emailRow}>
                        <View style={styles.emailInput}>
                            <Text style={styles.emailIcon}>📧</Text>
                            <Text style={styles.emailPlaceholder}>Email report to patient…</Text>
                        </View>
                        <TouchableOpacity onPress={handleEmailPdf} style={styles.emailSendBtn}>
                            <Text style={styles.emailSendText}>Send</Text>
                        </TouchableOpacity>
                    </View>
                </Section>

                {/* Done */}
                <TouchableOpacity onPress={() => router.replace('/(tabs)/home')} style={styles.doneBtn}>
                    <Text style={styles.doneBtnText}>← Return to Dashboard</Text>
                </TouchableOpacity>

                {/* Disclaimer */}
                <View style={styles.disclaimer}>
                    <Text style={styles.disclaimerText}>
                        ⚕️ This is an AI-generated pre-consultation report. It does not replace professional medical advice. Always consult a licensed physician.
                    </Text>
                </View>

                <View style={{ height: 40 }} />
            </ScrollView>
        </LinearGradient>
    );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <View style={styles.section}>
            <Text style={styles.sectionTitle}>{title}</Text>
            <View style={styles.sectionCard}>{children}</View>
        </View>
    );
}

function MetricBox({ icon, label, value }: { icon: string; label: string; value: string }) {
    return (
        <View style={styles.metricBox}>
            <Text style={styles.metricIcon}>{icon}</Text>
            <Text style={styles.metricValue}>{value}</Text>
            <Text style={styles.metricLabel}>{label}</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    gradient: { flex: 1 },
    loadingScreen: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16 },
    loadingText: { color: '#00d2ff', fontSize: 14 },
    scroll: { padding: SPACING.lg, paddingTop: 58 },
    header: { alignItems: 'center', marginBottom: SPACING.lg },
    headerIcon: {
        width: 80, height: 80, borderRadius: 40,
        alignItems: 'center', justifyContent: 'center', marginBottom: SPACING.md,
        shadowColor: '#00e676', shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.6, shadowRadius: 20, elevation: 12,
    },
    headerTitle: { color: '#fff', fontSize: 26, fontWeight: '800' },
    headerSub: { color: 'rgba(255,255,255,0.5)', fontSize: 13, marginTop: 4, marginBottom: SPACING.md },
    safetyBadge: {
        borderRadius: RADIUS.full, paddingHorizontal: 16, paddingVertical: 8,
        borderWidth: 1, borderColor: 'rgba(0,230,118,0.3)',
    },
    safetyText: { fontWeight: '700', fontSize: 12 },
    conditionCard: {
        borderRadius: RADIUS.xl, padding: SPACING.lg, marginBottom: SPACING.md,
        borderWidth: 1, borderColor: 'rgba(0,210,255,0.2)',
    },
    cardSubtitle: { color: '#00d2ff', fontSize: 10, fontWeight: '700', letterSpacing: 1.2, marginBottom: 6 },
    conditionText: { color: '#fff', fontSize: 22, fontWeight: '800', marginBottom: SPACING.md },
    confRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
    confLabel: { color: 'rgba(255,255,255,0.55)', fontSize: 12 },
    confPct: { color: '#00d2ff', fontWeight: '700', fontSize: 12 },
    confBar: { height: 6, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 3, overflow: 'hidden' },
    confFill: { height: '100%', borderRadius: 3 },
    section: { marginBottom: SPACING.md },
    sectionTitle: {
        color: 'rgba(255,255,255,0.55)', fontSize: 11, fontWeight: '700',
        letterSpacing: 1, textTransform: 'uppercase', marginBottom: 8,
    },
    sectionCard: {
        backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: RADIUS.lg,
        padding: SPACING.md, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
    },
    pillRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    symptomPill: {
        backgroundColor: 'rgba(0,210,255,0.15)', borderRadius: RADIUS.full,
        paddingHorizontal: 12, paddingVertical: 5,
        borderWidth: 1, borderColor: 'rgba(0,210,255,0.3)',
    },
    symptomText: { color: '#00d2ff', fontSize: 12, fontWeight: '600' },
    metricsRow: { flexDirection: 'row', gap: 10 },
    metricBox: {
        flex: 1, alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: RADIUS.md,
        padding: SPACING.sm,
    },
    metricIcon: { fontSize: 22, marginBottom: 4 },
    metricValue: { color: '#fff', fontWeight: '700', fontSize: 14 },
    metricLabel: { color: 'rgba(255,255,255,0.4)', fontSize: 10, marginTop: 2 },
    bodyText: { color: 'rgba(255,255,255,0.8)', fontSize: 14, lineHeight: 22 },
    actionBtn: {
        height: 52, borderRadius: RADIUS.md,
        alignItems: 'center', justifyContent: 'center', marginBottom: SPACING.sm,
        shadowColor: '#00d2ff', shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.4, shadowRadius: 10, elevation: 8,
    },
    actionBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
    emailRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
    emailInput: {
        flex: 1, flexDirection: 'row', alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: RADIUS.md,
        paddingHorizontal: SPACING.md, height: 46,
        borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', gap: 8,
    },
    emailIcon: { fontSize: 16 },
    emailPlaceholder: { color: 'rgba(255,255,255,0.3)', fontSize: 13 },
    emailSendBtn: {
        backgroundColor: '#00d2ff', borderRadius: RADIUS.md,
        paddingHorizontal: SPACING.md, height: 46,
        alignItems: 'center', justifyContent: 'center',
    },
    emailSendText: { color: '#fff', fontWeight: '700', fontSize: 13 },
    doneBtn: {
        alignItems: 'center', paddingVertical: SPACING.md, marginBottom: SPACING.md,
    },
    doneBtnText: { color: '#00d2ff', fontWeight: '700', fontSize: 14 },
    disclaimer: {
        backgroundColor: 'rgba(255,171,64,0.1)', borderRadius: RADIUS.md,
        padding: SPACING.md, borderWidth: 1, borderColor: 'rgba(255,171,64,0.25)',
    },
    disclaimerText: { color: 'rgba(255,171,64,0.85)', fontSize: 12, lineHeight: 18 },
});
