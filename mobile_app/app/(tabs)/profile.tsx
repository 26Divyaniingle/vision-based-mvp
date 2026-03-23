import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { logout } from '../../services/authService';
import { SPACING, RADIUS } from '../../constants/theme';

const MENU_ITEMS = [
    { icon: '🩺', label: 'Start New Consultation', desc: 'Begin a new AI-powered session', color: '#00d2ff', action: 'new' },
    { icon: '📋', label: 'View Past Sessions', desc: 'Browse your consultation history', color: '#7b2ff7', action: 'sessions' },
    { icon: '📄', label: 'My Reports', desc: 'Download or email PDF reports', color: '#f9d423', action: 'reports' },
    { icon: '🔔', label: 'Notifications', desc: 'Health reminders & alerts', color: '#00e676', action: 'none' },
    { icon: '🌐', label: 'Language Settings', desc: 'Change consultation language', color: '#f83600', action: 'none' },
    { icon: '⚕️', label: 'About MedGemma AI', desc: 'Learn how the AI works', color: '#ff9800', action: 'none' },
];

export default function ProfileScreen() {
    function handleAction(action: string) {
        if (action === 'new') router.push('/(tabs)/new_session');
        else if (action === 'sessions') router.push('/(tabs)/sessions');
        else if (action === 'reports') router.push('/(tabs)/reports');
    }

    async function handleLogout() {
        Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Sign Out', style: 'destructive',
                onPress: async () => {
                    await logout();
                    router.replace('/auth/login');
                },
            },
        ]);
    }

    return (
        <LinearGradient colors={['#0f0c29', '#302b63', '#24243e']} style={styles.gradient}>
            <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

                {/* Profile Header */}
                <View style={styles.profileHeader}>
                    <LinearGradient colors={['#00d2ff', '#7b2ff7']} style={styles.avatar} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
                        <Text style={styles.avatarText}>👤</Text>
                    </LinearGradient>
                    <Text style={styles.userName}>Patient Profile</Text>
                    <Text style={styles.userSub}>Vision Agentic AI · MedGemma Powered</Text>

                    {/* Stats row */}
                    <View style={styles.statsRow}>
                        {[
                            { label: 'Sessions', value: '12', icon: '📋' },
                            { label: 'Diagnoses', value: '10', icon: '🔬' },
                            { label: 'Reports', value: '8', icon: '📄' },
                        ].map((s) => (
                            <View key={s.label} style={styles.statBox}>
                                <Text style={styles.statIcon}>{s.icon}</Text>
                                <Text style={styles.statValue}>{s.value}</Text>
                                <Text style={styles.statLabel}>{s.label}</Text>
                            </View>
                        ))}
                    </View>
                </View>

                {/* Feature cards */}
                <Text style={styles.sectionLabel}>Quick Actions</Text>
                <View style={styles.menuList}>
                    {MENU_ITEMS.map((item) => (
                        <TouchableOpacity
                            key={item.label}
                            style={styles.menuItem}
                            activeOpacity={0.8}
                            onPress={() => handleAction(item.action)}
                        >
                            <View style={[styles.menuIconBg, { backgroundColor: `${item.color}22` }]}>
                                <Text style={styles.menuIcon}>{item.icon}</Text>
                            </View>
                            <View style={styles.menuText}>
                                <Text style={styles.menuLabel}>{item.label}</Text>
                                <Text style={styles.menuDesc}>{item.desc}</Text>
                            </View>
                            <Text style={styles.menuArrow}>›</Text>
                        </TouchableOpacity>
                    ))}
                </View>

                {/* Tech stack */}
                <Text style={styles.sectionLabel}>Powered By</Text>
                <View style={styles.techCard}>
                    {[
                        { label: 'MedGemma LLM', sub: 'Medical Language Model', icon: '🧠' },
                        { label: 'FAISS RAG', sub: '380MB Verified Medicine DB', icon: '📚' },
                        { label: 'DeepFace Vision', sub: 'Real-time bio-signal capture', icon: '👁️' },
                        { label: 'FastAPI Backend', sub: 'WebSocket real-time pipeline', icon: '⚡' },
                    ].map((t) => (
                        <View key={t.label} style={styles.techRow}>
                            <Text style={styles.techIcon}>{t.icon}</Text>
                            <View>
                                <Text style={styles.techLabel}>{t.label}</Text>
                                <Text style={styles.techSub}>{t.sub}</Text>
                            </View>
                        </View>
                    ))}
                </View>

                {/* Logout */}
                <TouchableOpacity onPress={handleLogout} style={styles.logoutBtn} activeOpacity={0.85}>
                    <Text style={styles.logoutText}>🚪 Sign Out</Text>
                </TouchableOpacity>

                <Text style={styles.version}>Vision Agentic AI MVP · v1.0.0</Text>
                <View style={{ height: 100 }} />
            </ScrollView>
        </LinearGradient>
    );
}

const styles = StyleSheet.create({
    gradient: { flex: 1 },
    scroll: { padding: SPACING.lg, paddingTop: 58 },
    profileHeader: {
        alignItems: 'center', marginBottom: SPACING.xl,
        backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: RADIUS.xl,
        padding: SPACING.lg, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
    },
    avatar: {
        width: 80, height: 80, borderRadius: 40,
        alignItems: 'center', justifyContent: 'center', marginBottom: SPACING.md,
        shadowColor: '#00d2ff', shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.5, shadowRadius: 15, elevation: 10,
    },
    avatarText: { fontSize: 36 },
    userName: { color: '#fff', fontSize: 20, fontWeight: '800' },
    userSub: { color: 'rgba(255,255,255,0.45)', fontSize: 12, marginTop: 4, marginBottom: SPACING.md },
    statsRow: { flexDirection: 'row', gap: 12 },
    statBox: { flex: 1, alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: RADIUS.md, padding: SPACING.sm },
    statIcon: { fontSize: 20, marginBottom: 4 },
    statValue: { color: '#fff', fontWeight: '800', fontSize: 18 },
    statLabel: { color: 'rgba(255,255,255,0.4)', fontSize: 10, marginTop: 2 },
    sectionLabel: {
        color: 'rgba(255,255,255,0.45)', fontSize: 11, fontWeight: '700',
        letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 10,
    },
    menuList: { gap: 8, marginBottom: SPACING.lg },
    menuItem: {
        flexDirection: 'row', alignItems: 'center', gap: 12,
        backgroundColor: 'rgba(255,255,255,0.07)', borderRadius: RADIUS.lg,
        padding: SPACING.md, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
    },
    menuIconBg: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
    menuIcon: { fontSize: 22 },
    menuText: { flex: 1 },
    menuLabel: { color: '#fff', fontWeight: '600', fontSize: 14 },
    menuDesc: { color: 'rgba(255,255,255,0.4)', fontSize: 12, marginTop: 2 },
    menuArrow: { color: 'rgba(255,255,255,0.3)', fontSize: 22 },
    techCard: {
        backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: RADIUS.lg,
        padding: SPACING.md, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
        gap: 12, marginBottom: SPACING.lg,
    },
    techRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    techIcon: { fontSize: 24 },
    techLabel: { color: '#fff', fontWeight: '600', fontSize: 13 },
    techSub: { color: 'rgba(255,255,255,0.4)', fontSize: 11 },
    logoutBtn: {
        backgroundColor: 'rgba(255,82,82,0.1)', borderRadius: RADIUS.md,
        padding: SPACING.md, alignItems: 'center', marginBottom: SPACING.md,
        borderWidth: 1, borderColor: 'rgba(255,82,82,0.3)',
    },
    logoutText: { color: '#ff5252', fontWeight: '700', fontSize: 15 },
    version: { color: 'rgba(255,255,255,0.2)', fontSize: 11, textAlign: 'center' },
});
