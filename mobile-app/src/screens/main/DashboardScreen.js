import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Animated } from 'react-native';
import { User, LogOut, Globe, Play, ChevronRight, History, Bot } from 'lucide-react-native';
import { Colors, Typography, Spacing, Radii, Shadows } from '../../theme';
import GlassCard from '../../components/GlassCard';
import PrimaryButton from '../../components/PrimaryButton';
import { getUser, clearUser } from '../../utils/storage';
import { getHistory } from '../../api/report';
import { ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const DashboardScreen = ({ navigation }) => {
  const [user, setUser] = useState(null);
  const [language, setLanguage] = useState('English');
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const shimmerAnim = useRef(new Animated.Value(0)).current;

  const fetchData = async () => {
    setLoading(true);
    setError(false);
    const userData = await getUser();
    setUser(userData);
    if (userData?.id) {
      try {
        const res = await getHistory(userData.id);
        setHistory(res.data || []);
      } catch (err) {
        console.log("Error fetching history:", err);
        setError(true);
      }
    }
    setLoading(false);
  };

  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [])
  );

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(shimmerAnim, { toValue: 1, duration: 1500, useNativeDriver: true }),
        Animated.timing(shimmerAnim, { toValue: 0.5, duration: 1500, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  const languages = [
    { name: 'English', flag: '🇺🇸' },
    { name: 'Hindi', flag: '🇮🇳' },
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
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right', 'bottom']}>
      <View style={styles.header}>
        <View style={styles.userProfile}>
          <View style={styles.avatar}>
            <User color={Colors.indigo} size={24} />
          </View>
          <View>
            <Text style={styles.welcome}>Hello, {user.name}!</Text>
            <Text style={styles.subtitle}>Welcome back to MedSense</Text>
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

          <View style={styles.langContainer}>
            <Text style={styles.langLabel}>Select Language</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.horizontalScroll}
            >
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
            </ScrollView>
          </View>

          <PrimaryButton
            title="Start Consultation"
            onPress={handleStart}
            style={styles.startBtn}
            variant="primary"
          />
        </GlassCard>

        <View style={styles.historySection}>
          <View style={styles.sectionHeader}>
            <History color={Colors.textSecondary} size={18} />
            <Text style={styles.sectionTitle}>Recent Insights</Text>
          </View>

          {loading ? (
            <ActivityIndicator color={Colors.indigo} style={{ marginTop: 20 }} />
          ) : error ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>Unable to load history.</Text>
              <TouchableOpacity onPress={fetchData} style={styles.retryBtn}>
                <Text style={styles.retryText}>Retry</Text>
              </TouchableOpacity>
            </View>
          ) : history.length > 0 ? (
            history.map((item, index) => (
              <TouchableOpacity
                key={item.session_id}
                onPress={() => {
                  // Map history item to results screen format
                  let medication = item.medication;
                  if (typeof medication === 'string') {
                    try {
                      medication = JSON.parse(medication.replace(/'/g, '"'));
                    } catch (e) { medication = {}; }
                  }

                  navigation.navigate('Results', {
                    sessionId: item.session_id,
                    diagnosis: {
                      condition: item.condition,
                      confidence: item.confidence * 100, // convert 0.8 to 80
                      medication: medication,
                      safety_passed: item.safety,
                    }
                  });
                }}
              >
                <GlassCard style={styles.historyItem}>
                  <View style={styles.historyLeft}>
                    <Text style={styles.historyCondition}>{item.condition}</Text>
                    <Text style={styles.historyDate}>{new Date(item.created_at).toLocaleDateString()}</Text>
                  </View>
                  <ChevronRight color={Colors.textMuted} size={18} />
                </GlassCard>
              </TouchableOpacity>
            ))
          ) : (
            <GlassCard style={styles.placeholderCard}>
              <Text style={styles.placeholderText}>No medical reports generated yet.</Text>
            </GlassCard>
          )}
        </View>
      </ScrollView>

      {/* Floating AI Button — Meta AI style */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate('AIChatbot')}
        activeOpacity={0.85}
      >
        <Bot color="#fff" size={22} />
      </TouchableOpacity>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 24, marginBottom: 30 },
  userProfile: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: Colors.indigoLight, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(99,102,241,0.2)' },
  welcome: { fontSize: 20, fontWeight: 'bold', color: '#fff' },
  subtitle: { fontSize: 13, color: Colors.textSecondary },
  logoutBtn: { padding: 8 },
  content: { paddingHorizontal: 24, paddingBottom: 40 },
  startCard: { padding: 25, marginBottom: 30, alignItems: 'center' },
  shimmerTitle: { fontSize: 22, fontWeight: '800', color: '#fff', marginBottom: 10, letterSpacing: 0.5, alignItems: 'center', textAlign: 'center' },
  startInfo: { color: Colors.textSecondary, textAlign: 'center', marginBottom: 25, lineHeight: 20 },
  startBtn: { width: '100%', ...Shadows.glow },
  langContainer: { width: '100%', marginBottom: 25 },
  langLabel: { fontSize: 12, fontWeight: '600', color: Colors.textSecondary, marginBottom: 12, textTransform: 'uppercase', letterSpacing: 0.5, textAlign: 'center' },
  horizontalScroll: { gap: 10, paddingBottom: 5 },
  langItem: { width: 105, backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 14, padding: 12, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)', position: 'relative' },
  activeLang: { borderColor: Colors.indigo, backgroundColor: 'rgba(99,102,241,0.12)', borderWidth: 1.5 },
  flag: { fontSize: 20, marginBottom: 4 },
  langName: { color: Colors.textPrimary, fontSize: 13, fontWeight: '500' },
  dot: { position: 'absolute', top: 8, right: 8, width: 6, height: 6, borderRadius: 3, backgroundColor: Colors.indigo },
  placeholderCard: { padding: 30, alignItems: 'center', borderStyle: 'dashed' },
  placeholderText: { color: Colors.textMuted, fontSize: 13 },
  errorBox: { alignItems: 'center', marginTop: 20, gap: 10 },
  errorText: { color: Colors.textMuted, fontSize: 13 },
  retryBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 10, backgroundColor: 'rgba(99,102,241,0.1)' },
  retryText: { color: Colors.indigo, fontSize: 13, fontWeight: 'bold' },
  historyItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 18,
    marginBottom: 12
  },
  historyLeft: { gap: 4 },
  historyCondition: { color: '#fff', fontSize: 16, fontWeight: '600' },
  historyDate: { color: Colors.textMuted, fontSize: 12 },
  fab: {
    position: 'absolute',
    bottom: 32,
    right: 24,
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: Colors.indigo,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: Colors.indigo,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 10,
  },
});

export default DashboardScreen;
