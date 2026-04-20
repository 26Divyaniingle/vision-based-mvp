import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, TextInput, Animated } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Mail, Shield, CheckCircle, RefreshCcw, ArrowLeft } from 'lucide-react-native';
import { Colors, Typography, Spacing } from '../../theme';
import GlassCard from '../../components/GlassCard';
import PrimaryButton from '../../components/PrimaryButton';
import { sendOTP, verifyOTP, reRegisterFace } from '../../api/auth';

const ForgotTokenScreen = ({ navigation }) => {
  const [step, setStep] = useState(1); 
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [permission, requestPermission] = useCameraPermissions();
  const [isProcessing, setIsProcessing] = useState(false);
  const cameraRef = useRef(null);

  const handleSendOTP = async () => {
    if (!email) return;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      Alert.alert('Invalid Email', 'Please enter a valid email address.');
      return;
    }
    setIsProcessing(true);
    try {
      const res = await sendOTP(email);
      if (res.data.success) setStep(2);
      else Alert.alert('Error', res.data.msg);
    } catch (e) {
      Alert.alert('Error', 'Failed to reach recovery server.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleVerifyOTP = async () => {
    if (!otp) return;
    setIsProcessing(true);
    try {
      const res = await verifyOTP(email, otp);
      if (res.data.success) setStep(3);
      else Alert.alert('Error', res.data.msg);
    } catch (e) {
      Alert.alert('Error', 'Verification failed.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReRegister = async () => {
    if (!cameraRef.current) return;
    setIsProcessing(true);
    const newToken = Math.random().toString(36).slice(-6).toUpperCase();
    try {
      const photo = await cameraRef.current.takePictureAsync({ base64: true, quality: 0.5 });
      const res = await reRegisterFace(email, photo.base64, newToken);
      if (res.data.success) {
        Alert.alert('Success', `Face re-registered! Your new Access Token is: ${newToken}. Please save it.`, [
          { text: 'Login Now', onPress: () => navigation.replace('Login') }
        ]);
      } else {
        Alert.alert('Error', res.data.msg);
      }
    } catch (e) {
      Alert.alert('Error', 'Re-registration failed.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
        <ArrowLeft color={Colors.textSecondary} size={20} />
      </TouchableOpacity>

      <Text style={styles.title}>Recovery</Text>
      <Text style={styles.subtitle}>{step === 3 ? 'Biometric Update' : 'Access Restoration'}</Text>

      {(!permission || !permission.granted) && step === 3 ? (
        <View style={styles.permBox}>
           <Shield color={Colors.indigo} size={48} style={{ marginBottom: 10 }} />
           <Text style={styles.permText}>MediSense needs camera access to recapture your biometric profile.</Text>
           <PrimaryButton title="Grant Access" onPress={requestPermission} />
        </View>
      ) : (
        <GlassCard style={styles.card}>
          {step === 1 && (
            <View style={{ width: '100%', alignItems: 'center' }}>
              <View style={styles.iconCircle}><Mail color={Colors.indigo} size={32} /></View>
              <Text style={styles.label}>Verified Email</Text>
              <TextInput style={styles.input} value={email} onChangeText={setEmail} placeholder="Enter your email" placeholderTextColor={Colors.textMuted} autoCapitalize="none" />
              <PrimaryButton title={isProcessing ? "Sending..." : "Send OTP"} onPress={handleSendOTP} style={{ marginTop: 25, width: '100%' }} />
            </View>
          )}
          {step === 2 && (
            <View style={{ width: '100%', alignItems: 'center' }}>
              <View style={styles.iconCircle}><Shield color={Colors.indigo} size={32} /></View>
              <Text style={styles.label}>6-Digit Verification Code</Text>
              <TextInput style={styles.input} value={otp} onChangeText={setOtp} keyboardType="numeric" placeholder="XXXXXX" placeholderTextColor={Colors.textMuted} maxLength={6} />
              <PrimaryButton title={isProcessing ? "Verifying..." : "Verify Code"} onPress={handleVerifyOTP} style={{ marginTop: 25, width: '100%' }} />
            </View>
          )}
          {step === 3 && (
            <View style={{ width: '100%' }}>
              <View style={styles.cameraWrapper}>
                 <CameraView ref={cameraRef} style={styles.camera} facing="front" />
                 <View style={styles.cameraOverlay} />
              </View>
              <Text style={styles.hint}>Capture a new face embedding to restore your biometric login.</Text>
              <PrimaryButton title={isProcessing ? "Updating..." : "Recapture Face"} onPress={handleReRegister} style={{ marginTop: 25 }} />
            </View>
          )}
        </GlassCard>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg, padding: Spacing.xl, paddingTop: 60 },
  backBtn: { marginBottom: 20, width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.05)', justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 28, fontWeight: 'bold', color: '#fff' },
  subtitle: { color: Colors.purple, textTransform: 'uppercase', fontSize: 12, letterSpacing: 1, marginBottom: 30 },
  card: { padding: 30, width: '100%', alignItems: 'center' },
  iconCircle: { width: 64, height: 64, borderRadius: 32, backgroundColor: 'rgba(99,102,241,0.1)', justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  label: { color: Colors.textSecondary, marginBottom: 10, fontSize: 13, fontWeight: '600' },
  input: { backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 12, padding: 18, color: '#fff', width: '100%', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', textAlign: 'center', fontSize: 18 },
  cameraWrapper: { height: 260, width: '100%', borderRadius: 20, overflow: 'hidden', marginBottom: 20 },
  camera: { flex: 1 },
  cameraOverlay: { ...StyleSheet.absoluteFillObject, borderWidth: 1, borderColor: Colors.indigo, borderRadius: 20, opacity: 0.4 },
  hint: { color: Colors.textSecondary, textAlign: 'center', fontSize: 13, lineHeight: 20 },
  permBox: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 20 },
  permText: { color: Colors.textSecondary, textAlign: 'center', fontSize: 15, lineHeight: 22 },
});

export default ForgotTokenScreen;
