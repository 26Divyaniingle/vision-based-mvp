import { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, Share } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { fetchSessions, generatePdfReport } from '../../services/sessionService';
import { SPACING, RADIUS } from '../../constants/theme';

export default function ReportsScreen() {
    const [sessions, setSessions] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [generatingFor, setGeneratingFor] = useState<string | null>(null);

    useEffect(() => {
        fetchSessions().then((data) => {
            setSessions(data);
            setLoading(false);
        }).catch(() => setLoading(false));
    }, []);

    async function handleGeneratePdf(session: any) {
        setGeneratingFor(session.session_id);
        try {
            const sessionDataForPdf = {
                vision: {
                    dominant_emotion: session.emotion_metrics?.dominant_emotion || 'neutral',
                    avg_eye_strain: session.emotion_metrics?.avg_eye_strain || 0,
                    avg_lip_tension: session.emotion_metrics?.avg_lip_tension || 0,
                },
                ai_results: {
                    condition: session.condition,
                    confidence: session.confidence,
                    medication: session.medication,
                    ayurvedic: session.ayurvedic,
                    prevention: session.prevention,
                    safety_passed: session.safety,
                },
                symptoms: (session.symptoms || []).join(', '),
            };
            const pdf64 = await generatePdfReport(sessionDataForPdf, 'Patient');
            Alert.alert('✅ PDF Ready', `Report for "${session.condition}" is ready.`);
            await Share.share({ message: 'Vision Agentic AI Medical Report', title: 'Medical Report' });
        } catch (e: any) {
            Alert.alert('Error', e.message || 'Failed to generate PDF.');
        } finally {
            setGeneratingFor(null);
        }
    }

    return (
        <LinearGradient colors={['#0f0c29', '#302b63', '#24243e']} style={styles.gradient}>
            <View style={styles.topBar}>
                <Text style={styles.title}>📄 My Reports</Text>
            </View>

            {loading ? (
                <View style={styles.center}><ActivityIndicator color="#00d2ff" size="large" /></View>
            ) : sessions.length === 0 ? (
                <View style={styles.center}>
                    <Text style={styles.emptyEmoji}>📭</Text>
                    <Text style={styles.emptyTitle}>No Reports Yet</Text>
                    <Text style={styles.emptyDesc}>Complete a consultation to generate your first medical report.</Text>
                </View>
            ) : (
                <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
                    {sessions.map((s, i) => (
                        <View key={s.session_id || i} style={styles.reportCard}>
                            {/* Card Header */}
                            <View style={styles.cardHeader}>
                                <View style={styles.cardHeaderLeft}>
                                    <LinearGradient colors={['rgba(0,210,255,0.3)', 'rgba(123,47,247,0.3)']} style={styles.iconBg}>
                                        <Text style={{ fontSize: 22 }}>🩺</Text>
                                    </LinearGradient>
                                    <View>
                                        <Text style={styles.conditionTitle}>{s.condition || 'Unknown'}</Text>
                                        <Text style={styles.dateText}>
                                            {s.created_at
                                                ? new Date(s.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
                                                : 'No date'}
                                        </Text>
                                    </View>
                                </View>
                                <View style={[styles.safetyBadge, { backgroundColor: s.safety ? 'rgba(0,230,118,0.15)' : 'rgba(255,82,82,0.15)' }]}>
                                    <Text style={{ color: s.safety ? '#00e676' : '#ff5252', fontSize: 11, fontWeight: '700' }}>
                                        {s.safety ? '✅ Safe' : '⚠️ Warn'}
                                    </Text>
                                </View>
                            </View>

                            {/* Confidence */}
                            <View style={styles.confRow}>
                                <Text style={styles.confLabel}>AI Confidence</Text>
                                <Text style={styles.confValue}>{((s.confidence || 0) * 100).toFixed(0)}%</Text>
                            </View>
                            <View style={styles.confBar}>
                                <View style={[styles.confFill, { width: `${((s.confidence || 0) * 100).toFixed(0)}%` as any }]} />
                            </View>

                            {/* Symptoms chips */}
                            <View style={styles.pillRow}>
                                {(s.symptoms || []).slice(0, 4).map((symp: string, j: number) => (
                                    <View key={j} style={styles.pill}>
                                        <Text style={styles.pillText}>{symp}</Text>
                                    </View>
                                ))}
                            </View>

                            {/* Actions */}
                            <View style={styles.actionRow}>
                                <TouchableOpacity
                                    onPress={() => handleGeneratePdf(s)}
                                    disabled={generatingFor === s.session_id}
                                    style={styles.pdfBtn}
                                    activeOpacity={0.85}
                                >
                                    <LinearGradient colors={['#00d2ff', '#7b2ff7']} style={styles.pdfBtnInner} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                                        {generatingFor === s.session_id
                                            ? <ActivityIndicator color="#fff" size="small" />
                                            : <Text style={styles.pdfBtnText}>⬇️  Download PDF</Text>}
                                    </LinearGradient>
                                </TouchableOpacity>
                            </View>
                        </View>
                    ))}
                    <View style={{ height: 100 }} />
                </ScrollView>
            )}
        </LinearGradient>
    );
}

const styles = StyleSheet.create({
    gradient: { flex: 1 },
    topBar: {
        paddingHorizontal: SPACING.lg, paddingTop: 58, paddingBottom: SPACING.md,
    },
    title: { color: '#fff', fontSize: 22, fontWeight: '800' },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: SPACING.lg, gap: 12 },
    emptyEmoji: { fontSize: 56 },
    emptyTitle: { color: '#fff', fontSize: 20, fontWeight: '700' },
    emptyDesc: { color: 'rgba(255,255,255,0.45)', fontSize: 14, textAlign: 'center', lineHeight: 20 },
    list: { padding: SPACING.lg, gap: 14 },
    reportCard: {
        backgroundColor: 'rgba(255,255,255,0.07)', borderRadius: RADIUS.xl,
        padding: SPACING.md, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', gap: 10,
    },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    cardHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    iconBg: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
    conditionTitle: { color: '#fff', fontWeight: '700', fontSize: 15 },
    dateText: { color: 'rgba(255,255,255,0.4)', fontSize: 11, marginTop: 2 },
    safetyBadge: { borderRadius: RADIUS.full, paddingHorizontal: 10, paddingVertical: 5, borderWidth: 1, borderColor: 'transparent' },
    confRow: { flexDirection: 'row', justifyContent: 'space-between' },
    confLabel: { color: 'rgba(255,255,255,0.45)', fontSize: 12 },
    confValue: { color: '#00d2ff', fontWeight: '700', fontSize: 12 },
    confBar: { height: 5, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 3, overflow: 'hidden' },
    confFill: { height: '100%', backgroundColor: '#00d2ff', borderRadius: 3 },
    pillRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
    pill: {
        backgroundColor: 'rgba(0,210,255,0.12)', borderRadius: RADIUS.full,
        paddingHorizontal: 10, paddingVertical: 4,
        borderWidth: 1, borderColor: 'rgba(0,210,255,0.25)',
    },
    pillText: { color: '#00d2ff', fontSize: 11, fontWeight: '600' },
    actionRow: { flexDirection: 'row', gap: 8 },
    pdfBtn: { flex: 1 },
    pdfBtnInner: { height: 42, borderRadius: RADIUS.md, alignItems: 'center', justifyContent: 'center' },
    pdfBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },
});
