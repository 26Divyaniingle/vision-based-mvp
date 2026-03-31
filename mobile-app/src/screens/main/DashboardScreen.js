import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Animated } from 'react-native';
import { User, LogOut, Globe, Play, ChevronRight, History } from 'lucide-react-native';
import { Colors, Typography, Spacing, Radii, Shadows } from '../../theme';
import GlassCard from '../../components/GlassCard';
import PrimaryButton from '../../components/PrimaryButton';
import { getUser, clearUser } from '../../utils/storage';

const DashboardScreen = ({ navigation }) => {
  const [user, setUser] = useState(null);
  const [language, setLanguage] = useState('English');

  useEffect(() => {
    getUser().then(setUser);
  }, []);

  const languages = [
    { name: 'English', flag: '🇺🇸' },
    { name: 'Hindi', flag: '🇮🇳' },
    { name: 'Spanish', flag: '🇪🇸' },
    { name: 'Marathi', flag: '🇮🇳' },
    { name: 'Hinglish', flag: '🇮🇳' },
  ];

  const handleStart = () => {
    const sessionId = `sess_${Date.now()}`;
    navigation.navigate('Consultation', { sessionId, language, patient: user });
  };

  const handleLogout = async () => {
    await clearUser();
    navigation.replace('Login');
  };

  if (!user) return <View style={styles.container} />;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.userProfile}>
          <View style={styles.avatar}>
            <User color={Colors.indigo} size={24} />
          </View>
          <View>
            <Text style={styles.welcome}>Hello, {user.name}!</Text>
            <Text style={styles.subtitle}>Welcome back to MediSense</Text>
          </View>
        </View>
        <TouchableOpacity onPress={handleLogout} style={styles.logoutBtn}>
          <LogOut color={Colors.rose} size={20} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <GlassCard style={styles.startCard}>
           <Text style={styles.shimmerTitle}>Virtual Clinic</Text>
           <Text style={styles.startInfo}>Connect with our Medical AI for a real-time health assessment.</Text>
           <PrimaryButton 
            title="Start Consultation" 
            onPress={handleStart} 
            style={styles.startBtn}
            variant="primary"
          />
        </GlassCard>

        <View style={styles.langSection}>
          <View style={styles.sectionHeader}>
            <Globe color={Colors.indigo} size={18} />
            <Text style={styles.sectionTitle}>Consultation Language</Text>
          </View>
          <View style={styles.grid}>
            {languages.map((l) => (
              <TouchableOpacity 
                key={l.name} 
                onPress={() => setLanguage(l.name)}
                style={[styles.langItem, language === l.name && styles.activeLang]}
              >
                <Text style={styles.flag}>{l.flag}</Text>
                <Text style={styles.langName}>{l.name}</Text>
                {language === l.name && <View style={styles.dot} />}
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.historySection}>
          <View style={styles.sectionHeader}>
            <History color={Colors.textSecondary} size={18} />
            <Text style={styles.sectionTitle}>Recent Insights</Text>
          </View>
          <GlassCard style={styles.placeholderCard}>
            <Text style={styles.placeholderText}>No medical reports generated yet.</Text>
          </GlassCard>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg, paddingTop: 60 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 24, marginBottom: 30 },
  userProfile: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: Colors.indigoLight, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(99,102,241,0.2)' },
  welcome: { fontSize: 20, fontWeight: 'bold', color: '#fff' },
  subtitle: { fontSize: 13, color: Colors.textSecondary },
  logoutBtn: { padding: 8 },
  content: { paddingHorizontal: 24, paddingBottom: 40 },
  startCard: { padding: 25, marginBottom: 30, alignItems: 'center' },
  shimmerTitle: { fontSize: 22, fontWeight: '800', color: '#fff', marginBottom: 10, letterSpacing: 0.5 },
  startInfo: { color: Colors.textSecondary, textAlign: 'center', marginBottom: 25, lineHeight: 20 },
  startBtn: { width: '100%', ...Shadows.glow },
  langSection: { marginBottom: 30 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 15 },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: Colors.textSecondary, textTransform: 'uppercase', letterSpacing: 1 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  langItem: { width: '48%', backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 16, padding: 18, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)', position: 'relative' },
  activeLang: { borderColor: Colors.indigo, backgroundColor: 'rgba(99,102,241,0.1)' },
  flag: { fontSize: 24, marginBottom: 8 },
  langName: { color: Colors.textPrimary, fontSize: 14, fontWeight: '500' },
  dot: { position: 'absolute', top: 12, right: 12, width: 6, height: 6, borderRadius: 3, backgroundColor: Colors.indigo },
  placeholderCard: { padding: 30, alignItems: 'center', borderStyle: 'dashed' },
  placeholderText: { color: Colors.textMuted, fontSize: 13 },
});

export default DashboardScreen;
