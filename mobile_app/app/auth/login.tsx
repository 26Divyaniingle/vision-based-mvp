import { useState } from 'react';
import {
    View, Text, TextInput, TouchableOpacity,
    StyleSheet, ScrollView, Alert, ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { loginUser } from '../../services/authService';
import { COLORS, SPACING, RADIUS } from '../../constants/theme';

export default function LoginScreen() {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [showPass, setShowPass] = useState(false);

    async function handleLogin() {
        if (!username.trim() || !password.trim()) {
            Alert.alert('Missing Fields', 'Please fill in both username and password.');
            return;
        }
        setLoading(true);
        try {
            await loginUser(username.trim(), password);
            router.replace('/(tabs)/home');
        } catch (e: any) {
            Alert.alert('Login Failed', e.message);
        } finally {
            setLoading(false);
        }
    }

    return (
        <LinearGradient colors={['#0f0c29', '#302b63', '#24243e']} style={styles.gradient}>
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.kav}>
                <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">

                    {/* Header */}
                    <View style={styles.header}>
                        <LinearGradient colors={['#00d2ff', '#7b2ff7']} style={styles.logoCircle} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
                            <Text style={styles.logoEmoji}>🧠</Text>
                        </LinearGradient>
                        <Text style={styles.title}>Welcome Back</Text>
                        <Text style={styles.subtitle}>Sign in to your medical AI assistant</Text>
                    </View>

                    {/* Card */}
                    <View style={styles.card}>
                        <Text style={styles.label}>Username</Text>
                        <View style={styles.inputRow}>
                            <Text style={styles.inputIcon}>👤</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="Enter your username"
                                placeholderTextColor="rgba(255,255,255,0.3)"
                                value={username}
                                onChangeText={setUsername}
                                autoCapitalize="none"
                                autoCorrect={false}
                            />
                        </View>

                        <Text style={[styles.label, { marginTop: 16 }]}>Password</Text>
                        <View style={styles.inputRow}>
                            <Text style={styles.inputIcon}>🔒</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="Enter your password"
                                placeholderTextColor="rgba(255,255,255,0.3)"
                                value={password}
                                onChangeText={setPassword}
                                secureTextEntry={!showPass}
                            />
                            <TouchableOpacity onPress={() => setShowPass(!showPass)}>
                                <Text style={styles.inputIcon}>{showPass ? '🙈' : '👁️'}</Text>
                            </TouchableOpacity>
                        </View>

                        {/* Login Button */}
                        <TouchableOpacity onPress={handleLogin} disabled={loading} activeOpacity={0.85}>
                            <LinearGradient
                                colors={['#00d2ff', '#7b2ff7']}
                                style={styles.loginBtn}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 0 }}
                            >
                                {loading
                                    ? <ActivityIndicator color="#fff" />
                                    : <Text style={styles.loginBtnText}>Sign In →</Text>}
                            </LinearGradient>
                        </TouchableOpacity>

                        {/* Register link */}
                        <View style={styles.registerRow}>
                            <Text style={styles.registerText}>Don't have an account? </Text>
                            <TouchableOpacity onPress={() => router.push('/auth/register')}>
                                <Text style={styles.registerLink}>Create Account</Text>
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* Feature pills */}
                    <View style={styles.pillRow}>
                        {['🔬 RAG-Powered', '👁️ Bio-Vision', '🌿 Ayurvedic', '🛡️ Safe AI'].map((p) => (
                            <View key={p} style={styles.pill}>
                                <Text style={styles.pillText}>{p}</Text>
                            </View>
                        ))}
                    </View>

                </ScrollView>
            </KeyboardAvoidingView>
        </LinearGradient>
    );
}

const styles = StyleSheet.create({
    gradient: { flex: 1 },
    kav: { flex: 1 },
    scroll: { flexGrow: 1, padding: SPACING.lg, justifyContent: 'center' },
    header: { alignItems: 'center', marginBottom: SPACING.xl },
    logoCircle: {
        width: 80, height: 80, borderRadius: 40,
        alignItems: 'center', justifyContent: 'center',
        marginBottom: SPACING.md,
        shadowColor: '#00d2ff', shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.6, shadowRadius: 20, elevation: 12,
    },
    logoEmoji: { fontSize: 38 },
    title: { fontSize: 28, fontWeight: '800', color: '#fff', letterSpacing: 0.3 },
    subtitle: { fontSize: 14, color: 'rgba(255,255,255,0.55)', marginTop: 6 },
    card: {
        backgroundColor: 'rgba(255,255,255,0.07)',
        borderRadius: RADIUS.xl,
        padding: SPACING.lg,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.12)',
        marginBottom: SPACING.xl,
    },
    label: { color: 'rgba(255,255,255,0.7)', fontSize: 12, fontWeight: '600', marginBottom: 8, letterSpacing: 0.8, textTransform: 'uppercase' },
    inputRow: {
        flexDirection: 'row', alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.05)',
        borderRadius: RADIUS.md, borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
        paddingHorizontal: SPACING.md,
    },
    inputIcon: { fontSize: 18, marginRight: 8 },
    input: { flex: 1, color: '#fff', height: 52, fontSize: 15 },
    loginBtn: {
        height: 54, borderRadius: RADIUS.md,
        alignItems: 'center', justifyContent: 'center',
        marginTop: SPACING.lg,
        shadowColor: '#00d2ff', shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.45, shadowRadius: 12, elevation: 8,
    },
    loginBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
    registerRow: { flexDirection: 'row', justifyContent: 'center', marginTop: SPACING.md },
    registerText: { color: 'rgba(255,255,255,0.5)', fontSize: 13 },
    registerLink: { color: '#00d2ff', fontSize: 13, fontWeight: '700' },
    pillRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center' },
    pill: {
        backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 20,
        paddingHorizontal: 12, paddingVertical: 6,
        borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)',
    },
    pillText: { color: 'rgba(255,255,255,0.7)', fontSize: 11, fontWeight: '600' },
});
