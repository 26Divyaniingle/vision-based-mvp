import { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, RefreshControl } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { fetchSessions } from '../../services/sessionService';
import { SPACING, RADIUS } from '../../constants/theme';

export default function SessionsScreen() {
    const [sessions, setSessions] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    async function load() {
        try {
            const data = await fetchSessions();
            setSessions(data);
        } catch (_) { }
        finally { setLoading(false); setRefreshing(false); }
    }

    useEffect(() => { load(); }, []);

    const emotionIcon = (e: string) => {
        if (!e) return '😐';
        if (['sad', 'angry', 'fear'].includes(e.toLowerCase())) return '😟';
        if (['happy', 'surprise'].includes(e.toLowerCase())) return '😊';
        return '😐';
    };

    return (
        <LinearGradient colors={['#0f0c29', '#302b63', '#24243e']} style={styles.gradient}>
            <View style={styles.topBar}>
                <Text style={styles.title}>📋 Past Sessions</Text>
                <TouchableOpacity onPress={() => router.push('/(tabs)/new_session')} style={styles.newBtn}>
                    <Text style={styles.newBtnText}>+ New</Text>
                </TouchableOpacity>
            </View>

            {loading ? (
                <View style={styles.center}><ActivityIndicator color="#00d2ff" size="large" /></View>
            ) : sessions.length === 0 ? (
                <View style={styles.center}>
                    <Text style={styles.emptyEmoji}>🩺</Text>
                    <Text style={styles.emptyTitle}>No Sessions Yet</Text>
                    <Text style={styles.emptyDesc}>Start your first AI medical consultation to see results here.</Text>
                    <TouchableOpacity onPress={() => router.push('/(tabs)/new_session')} style={styles.startBtn}>
                        <LinearGradient colors={['#00d2ff', '#7b2ff7']} style={styles.startBtnInner} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                            <Text style={styles.startBtnText}>Start Consultation</Text>
                        </LinearGradient>
                    </TouchableOpacity>
                </View>
            ) : (
                <ScrollView
                    contentContainerStyle={styles.list}
                    showsVerticalScrollIndicator={false}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor="#00d2ff" />}
                >
                    {sessions.map((s, i) => (
                        <TouchableOpacity
                            key={s.session_id || i}
                            activeOpacity={0.85}
                            onPress={() => router.push({ pathname: '/results/[sessionId]', params: { sessionId: s.session_id } })}
                        >
                            <View style={styles.sessionCard}>
                                <View style={styles.cardLeft}>
                                    <Text style={styles.cardEmoji}>{emotionIcon(s.emotion_metrics?.dominant_emotion)}</Text>
                                </View>
                                <View style={styles.cardBody}>
                                    <Text style={styles.conditionText}>{s.condition || 'Unknown Condition'}</Text>
                                    <Text style={styles.dateText}>
                                        {s.created_at ? new Date(s.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Unknown date'}
                                    </Text>
                                    <Text style={styles.symptomsText} numberOfLines={1}>
                                        🩺 {(s.symptoms || []).join(', ') || 'No symptoms recorded'}
                                    </Text>
                                </View>
                                <View style={styles.cardRight}>
                                    <Text style={[styles.confBadge, { backgroundColor: (s.confidence || 0) > 0.7 ? 'rgba(0,230,118,0.15)' : 'rgba(255,171,64,0.15)' }]}>
                                        {((s.confidence || 0) * 100).toFixed(0)}%
                                    </Text>
                                    <Text style={styles.arrowText}>›</Text>
                                </View>
                            </View>
                        </TouchableOpacity>
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
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        paddingHorizontal: SPACING.lg, paddingTop: 58, paddingBottom: SPACING.md,
    },
    title: { color: '#fff', fontSize: 22, fontWeight: '800' },
    newBtn: {
        backgroundColor: 'rgba(0,210,255,0.15)', borderRadius: RADIUS.full,
        paddingHorizontal: 14, paddingVertical: 7,
        borderWidth: 1, borderColor: '#00d2ff',
    },
    newBtnText: { color: '#00d2ff', fontWeight: '700', fontSize: 13 },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: SPACING.lg, gap: 12 },
    emptyEmoji: { fontSize: 56 },
    emptyTitle: { color: '#fff', fontSize: 20, fontWeight: '700' },
    emptyDesc: { color: 'rgba(255,255,255,0.45)', fontSize: 14, textAlign: 'center', lineHeight: 20 },
    startBtn: { marginTop: 8 },
    startBtnInner: { borderRadius: RADIUS.md, paddingHorizontal: SPACING.lg, paddingVertical: 12 },
    startBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
    list: { padding: SPACING.lg, gap: 10 },
    sessionCard: {
        flexDirection: 'row', alignItems: 'center', gap: 12,
        backgroundColor: 'rgba(255,255,255,0.07)', borderRadius: RADIUS.lg,
        padding: SPACING.md, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
    },
    cardLeft: {
        width: 48, height: 48, borderRadius: 24,
        backgroundColor: 'rgba(255,255,255,0.08)',
        alignItems: 'center', justifyContent: 'center',
    },
    cardEmoji: { fontSize: 26 },
    cardBody: { flex: 1, gap: 3 },
    conditionText: { color: '#fff', fontWeight: '700', fontSize: 15 },
    dateText: { color: 'rgba(255,255,255,0.4)', fontSize: 11 },
    symptomsText: { color: '#00d2ff', fontSize: 12 },
    cardRight: { alignItems: 'flex-end', gap: 4 },
    confBadge: {
        paddingHorizontal: 8, paddingVertical: 3,
        borderRadius: RADIUS.full, color: '#00e676',
        fontWeight: '700', fontSize: 12,
    },
    arrowText: { color: 'rgba(255,255,255,0.35)', fontSize: 22 },
});
