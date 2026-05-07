import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, TextInput, Animated } from 'react-native';
import { Scan, Key, ArrowRight, Camera, Smartphone } from 'lucide-react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Colors, Typography, Spacing, Shadows } from '../../theme';
import GlassCard from '../../components/GlassCard';
import PrimaryButton from '../../components/PrimaryButton';
import { loginFace, loginToken } from '../../api/auth';
import { saveUser } from '../../utils/storage';

const LoginScreen = ({ navigation }) => {
  const [tab, setTab] = useState('face');
  const [permission, requestPermission] = useCameraPermissions();
  const [token, setToken] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const cameraRef = useRef(null);

  const scanAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (isScanning) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(scanAnim, { toValue: 280, duration: 1500, useNativeDriver: false }),
          Animated.timing(scanAnim, { toValue: 0, duration: 1500, useNativeDriver: false }),
        ])
      ).start();
    } else {
      scanAnim.stopAnimation();
    }
  }, [isScanning]);

  if (!permission) return <View style={styles.container} />;
  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <Smartphone size={64} color={Colors.indigo} style={{ marginBottom: 20 }} />
        <Text style={styles.permText}>MedSense needs camera access for clinical authentication.</Text>
        <PrimaryButton title="Grant Access" onPress={requestPermission} />
      </View>
    );
  }

  const handleFaceLogin = async () => {
    if (!cameraRef.current) return;
    setIsScanning(true);
    try {
      const photo = await cameraRef.current.takePictureAsync({ base64: true, quality: 0.5 });
      const res = await loginFace(photo.base64);
      if (res.data.success) {
        await saveUser(res.data);
        navigation.replace('Dashboard');
      } else {
        Alert.alert('Auth Failed', res.data.msg);
      }
    } catch (e) {
      Alert.alert('Login Error', e.response?.data?.detail || e.message || 'Face recognition failed. Please try again.');
    } finally {
      setIsScanning(false);
    }
  };

  const handleTokenLogin = async () => {
    if (!token) return;
    try {
      const res = await loginToken(token);
      if (res.data.success) {
        await saveUser(res.data);
        navigation.replace('Dashboard');
      } else {
        Alert.alert('Error', res.data.msg);
      }
    } catch (e) {
      Alert.alert('Error', e.response?.data?.detail || e.message || 'Invalid token or server error.');
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.branding}>
        <Text style={styles.title}>MedSense</Text>
        <Text style={styles.dot}>.</Text>
      </View>
      <Text style={styles.subtitle}>Vision-Based Medical Assistant</Text>

      <View style={styles.tabContainer}>
        <TouchableOpacity onPress={() => setTab('face')} style={[styles.tab, tab === 'face' && styles.activeTab]}>
          <Scan size={18} color={tab === 'face' ? '#fff' : Colors.textSecondary} />
          <Text style={[styles.tabText, tab === 'face' && styles.activeTabText]}>Face Link</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setTab('token')} style={[styles.tab, tab === 'token' && styles.activeTab]}>
          <Key size={18} color={tab === 'token' ? '#fff' : Colors.textSecondary} />
          <Text style={[styles.tabText, tab === 'token' && styles.activeTabText]}>Token Access</Text>
        </TouchableOpacity>
      </View>

      <GlassCard style={styles.card}>
        {tab === 'face' ? (
          <View>
            <View style={styles.cameraWrapper}>
              <CameraView ref={cameraRef} style={styles.camera} facing="front" />
              <Animated.View style={[styles.scanLine, { top: scanAnim }]} />
              <View style={styles.cameraReticle} />
            </View>
            <PrimaryButton
              title={isScanning ? "Authenticating..." : "Scan Biometrics"}
              onPress={handleFaceLogin}
              style={{ marginTop: 25 }}
            />
          </View>
        ) : (
          <View>
            <Text style={styles.label}>Patient Access Token</Text>
            <View style={styles.inputWrapper}>
              <TextInput
                style={styles.input}
                placeholder="Enter alphanumeric token"
                placeholderTextColor={Colors.textMuted}
                value={token}
                onChangeText={setToken}
                autoCapitalize="none"
              />
            </View>
            <PrimaryButton title="Login with Token" onPress={handleTokenLogin} style={{ marginTop: 25 }} />
          </View>
        )}
      </GlassCard>

      <View style={styles.footer}>
        <TouchableOpacity onPress={() => navigation.navigate('Register')}>
          <Text style={styles.footerText}>New Patient? <Text style={styles.footerLink}>Create Profile</Text></Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => navigation.navigate('ForgotToken')} style={{ marginTop: 15 }}>
          <Text style={styles.footerTextMuted}>Forgot Access Token?</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg, alignItems: 'center', justifyContent: 'center', padding: Spacing.xl },
  branding: { flexDirection: 'row', alignItems: 'baseline', marginTop: 10 },
  title: { fontSize: 42, fontWeight: '900', color: '#fff', letterSpacing: -1 },
  dot: { fontSize: 42, fontWeight: '900', color: Colors.indigo },
  subtitle: { fontSize: 13, color: Colors.textSecondary, marginBottom: 10, fontWeight: '500', textTransform: 'uppercase', letterSpacing: 1.15 },
  tabContainer: { flexDirection: 'row', marginBottom: 25, backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 16, padding: 5, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  tab: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 20, paddingVertical: 12, borderRadius: 12 },
  activeTab: { backgroundColor: Colors.indigo, ...Shadows.glow },
  tabText: { color: Colors.textSecondary, fontWeight: '600', fontSize: 14 },
  activeTabText: { color: '#fff' },
  card: { width: '100%', padding: 25 },
  cameraWrapper: { height: 280, width: '100%', borderRadius: 24, overflow: 'hidden', backgroundColor: '#000', position: 'relative' },
  camera: { flex: 1 },
  cameraReticle: { ...StyleSheet.absoluteFillObject, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', borderRadius: 24 },
  scanLine: { position: 'absolute', width: '100%', height: 2, backgroundColor: Colors.indigo, shadowColor: Colors.indigo, shadowOpacity: 0.8, shadowRadius: 10 },
  label: { color: Colors.textSecondary, marginBottom: 10, fontSize: 12, fontWeight: 'bold', textTransform: 'uppercase' },
  inputWrapper: { backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  input: { padding: 18, color: '#fff', fontSize: 16 },
  footer: { marginTop: 40, alignItems: 'center' },
  footerText: { color: '#94a3b8', fontSize: 14 },
  footerLink: { color: Colors.indigo, fontWeight: 'bold' },
  footerTextMuted: { color: Colors.textMuted, fontSize: 13 },
  permText: { color: Colors.textSecondary, textAlign: 'center', marginBottom: 30, fontSize: 16, lineHeight: 24 },
});

export default LoginScreen;
