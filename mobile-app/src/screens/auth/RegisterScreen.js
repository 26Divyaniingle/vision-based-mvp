import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, Image, TextInput, ScrollView } from 'react-native';
import { Camera, ShieldCheck, User, Phone, Mail, Hash, ArrowRight, ArrowLeft } from 'lucide-react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Colors, Typography, Spacing, Radii } from '../../theme';
import GlassCard from '../../components/GlassCard';
import PrimaryButton from '../../components/PrimaryButton';
import { registerFace } from '../../api/auth';
import { saveUser } from '../../utils/storage';

const RegisterScreen = ({ navigation }) => {
  const [step, setStep] = useState(1);
  const [permission, requestPermission] = useCameraPermissions();
  const [form, setForm] = useState({ name: '', age: '', email: '', phone: '' });
  const [isCapturing, setIsCapturing] = useState(false);
  const cameraRef = useRef(null);

  const nextStep = () => {
    if (!form.name || !form.age) {
      Alert.alert('Missing Info', 'Please provide at least Name and Age.');
      return;
    }
    setStep(2);
  };

  const handleRegister = async () => {
    if (!cameraRef.current) return;
    setIsCapturing(true);
    try {
      const photo = await cameraRef.current.takePictureAsync({ base64: true, quality: 0.5 });
      const res = await registerFace(form.name, form.age, form.phone, form.email, photo.base64);
      
      if (res.data.success) {
        await saveUser(res.data);
        Alert.alert('Registration Successful', `Your account is ready! Your 6-digit login token is: ${res.data.token}`, [
          { text: 'Enter Dashboard', onPress: () => navigation.replace('Dashboard') }
        ]);
      } else {
        Alert.alert('Error', res.data.msg);
      }
    } catch (e) {
      Alert.alert('Registration Failed', e.response?.data?.detail || e.message || 'Network error or server unavailable.');
    } finally {
      setIsCapturing(false);
    }
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.backBtn} onPress={() => step === 1 ? navigation.goBack() : setStep(1)}>
        <ArrowLeft color={Colors.textSecondary} size={20} />
      </TouchableOpacity>

      <Text style={styles.title}>Create Profile</Text>
      <Text style={styles.subtitle}>Step {step} of 2</Text>

      {step === 1 ? (
        <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
          <GlassCard style={styles.card}>
            <View style={styles.inputGroup}>
              <User size={16} color={Colors.indigo} />
              <TextInput style={styles.input} value={form.name} onChangeText={(v) => setForm({...form, name: v})} placeholder="Full Name" placeholderTextColor={Colors.textMuted} />
            </View>
            
            <View style={[styles.inputGroup, { marginTop: 15 }]}>
              <Hash size={16} color={Colors.indigo} />
              <TextInput style={styles.input} value={form.age} onChangeText={(v) => setForm({...form, age: v})} placeholder="Age" keyboardType="numeric" placeholderTextColor={Colors.textMuted} />
            </View>
            
            <View style={[styles.inputGroup, { marginTop: 15 }]}>
              <Mail size={16} color={Colors.indigo} />
              <TextInput style={styles.input} value={form.email} onChangeText={(v) => setForm({...form, email: v})} placeholder="Email Address" keyboardType="email-address" autoCapitalize="none" placeholderTextColor={Colors.textMuted} />
            </View>
            
            <View style={[styles.inputGroup, { marginTop: 15 }]}>
              <Phone size={16} color={Colors.indigo} />
              <TextInput style={styles.input} value={form.phone} onChangeText={(v) => setForm({...form, phone: v})} placeholder="Phone (Optional)" keyboardType="phone-pad" placeholderTextColor={Colors.textMuted} />
            </View>

            <PrimaryButton title="Continue" onPress={nextStep} style={{ marginTop: 30 }} />
          </GlassCard>
        </ScrollView>
      ) : (
        <View style={{ width: '100%', alignItems: 'center' }}>
          <GlassCard style={styles.card}>
            <View style={styles.cameraWrapper}>
              <CameraView ref={cameraRef} style={styles.camera} facing="front" />
              <View style={styles.scanFrame} />
            </View>
            <View style={styles.hintBox}>
              <ShieldCheck color={Colors.emerald} size={18} />
              <Text style={styles.hintText}>Position your face within the frame for biometric embedding.</Text>
            </View>
            <PrimaryButton 
              title={isCapturing ? "Processing..." : "Capture & Secure"} 
              onPress={handleRegister} 
              style={{ marginTop: 20 }}
            />
          </GlassCard>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg, padding: Spacing.xl, paddingTop: 60 },
  backBtn: { marginBottom: 20, width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.05)', justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 28, fontWeight: 'bold', color: '#fff', marginBottom: 5 },
  subtitle: { fontSize: 13, color: Colors.purple, textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 30 },
  scroll: { width: '100%' },
  card: { width: '100%', padding: 25 },
  inputGroup: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 12, paddingHorizontal: 15, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  input: { flex: 1, padding: 15, color: '#fff', fontSize: 15 },
  cameraWrapper: { height: 320, width: '100%', borderRadius: 24, overflow: 'hidden', backgroundColor: '#000' },
  camera: { flex: 1 },
  scanFrame: { ...StyleSheet.absoluteFillObject, borderWidth: 2, borderColor: Colors.emerald, borderRadius: 24, opacity: 0.3 },
  hintBox: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 20, paddingHorizontal: 10 },
  hintText: { color: Colors.textSecondary, fontSize: 13, flex: 1, lineHeight: 18 },
});

export default RegisterScreen;
