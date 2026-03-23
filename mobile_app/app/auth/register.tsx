import { useState } from 'react';
import {
    View, Text, TextInput, TouchableOpacity,
    StyleSheet, ScrollView, Alert, ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { registerUser } from '../../services/authService';
import { COLORS, SPACING, RADIUS } from '../../constants/theme';

export default function RegisterScreen() {
    const [username, setUsername] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);

    async function handleRegister() {
        if (!username.trim() || !email.trim() || !password.trim()) {
            Alert.alert('Missing Fields', 'Please fill in all fields.');
            return;
        }
        setLoading(true);
        try {
            await registerUser(username.trim(), email.trim(), password);
            Alert.alert('Account Created! 🎉', 'You can now sign in.', [
                { text: 'Sign In', onPress: () => router.replace('/auth/login') },
            ]);
        } catch (e: any) {
            Alert.alert('Registration Failed', e.message);
        } finally {
            setLoading(false);
        }
    }

    return (
        <LinearGradient colors={['#0f0c29', '#302b63', '#24243e']} style={styles.gradient}>
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.kav}>
                <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">

                    <View style={styles.header}>
                        <LinearGradient colors={['#f9d423', '#f83600']} style={styles.logoCircle} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
                            <Text style={styles.logoEmoji}>🩺</Text>
                        </LinearGradient>
                        <Text style={styles.title}>Create Account</Text>
                        <Text style={styles.subtitle}>Join your AI-powered health companion</Text>
                    </View>

                    <View style={styles.card}>
                        {[
                            { label: 'Username', icon: '👤', value: username, set: setUsername, placeholder: 'Choose a username', keyboard: 'default' as const },
                            { label: 'Email Address', icon: '📧', value: email, set: setEmail, placeholder: 'Enter your email', keyboard: 'email-address' as const },
                            { label: 'Password', icon: '🔒', value: password, set: setPassword, placeholder: 'Create a strong password', keyboard: 'default' as const },
                        ].map((field, i) => (
                            <View key={field.label} style={{ marginTop: i > 0 ? 16 : 0 }}>
                                <Text style={styles.label}>{field.label}</Text>
                                <View style={styles.inputRow}>
                                    <Text style={styles.inputIcon}>{field.icon}</Text>
                                    <TextInput
                                        style={styles.input}
                                        placeholder={field.placeholder}
                                        placeholderTextColor="rgba(255,255,255,0.3)"
                                        value={field.value}
                                        onChangeText={field.set}
                                        keyboardType={field.keyboard}
                                        secureTextEntry={field.label === 'Password'}
                                        autoCapitalize="none"
                                    />
                                </View>
                            </View>
                        ))}

                        <TouchableOpacity onPress={handleRegister} disabled={loading} activeOpacity={0.85}>
                            <LinearGradient
                                colors={['#f9d423', '#f83600']}
                                style={styles.btn}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 0 }}
                            >
                                {loading
                                    ? <ActivityIndicator color="#fff" />
                                    : <Text style={styles.btnText}>Create My Account →</Text>}
                            </LinearGradient>
                        </TouchableOpacity>

                        <View style={styles.loginRow}>
                            <Text style={styles.loginText}>Already have an account? </Text>
                            <TouchableOpacity onPress={() => router.back()}>
                                <Text style={styles.loginLink}>Sign In</Text>
                            </TouchableOpacity>
                        </View>
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
        alignItems: 'center', justifyContent: 'center', marginBottom: SPACING.md,
        shadowColor: '#f9d423', shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.6, shadowRadius: 20, elevation: 12,
    },
    logoEmoji: { fontSize: 38 },
    title: { fontSize: 28, fontWeight: '800', color: '#fff' },
    subtitle: { fontSize: 14, color: 'rgba(255,255,255,0.55)', marginTop: 6 },
    card: {
        backgroundColor: 'rgba(255,255,255,0.07)',
        borderRadius: RADIUS.xl, padding: SPACING.lg,
        borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)',
    },
    label: { color: 'rgba(255,255,255,0.7)', fontSize: 12, fontWeight: '600', marginBottom: 8, letterSpacing: 0.8, textTransform: 'uppercase' },
    inputRow: {
        flexDirection: 'row', alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.05)',
        borderRadius: RADIUS.md, borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)', paddingHorizontal: SPACING.md,
    },
    inputIcon: { fontSize: 18, marginRight: 8 },
    input: { flex: 1, color: '#fff', height: 52, fontSize: 15 },
    btn: {
        height: 54, borderRadius: RADIUS.md,
        alignItems: 'center', justifyContent: 'center', marginTop: SPACING.lg,
        shadowColor: '#f9d423', shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.4, shadowRadius: 12, elevation: 8,
    },
    btnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
    loginRow: { flexDirection: 'row', justifyContent: 'center', marginTop: SPACING.md },
    loginText: { color: 'rgba(255,255,255,0.5)', fontSize: 13 },
    loginLink: { color: '#f9d423', fontSize: 13, fontWeight: '700' },
});
