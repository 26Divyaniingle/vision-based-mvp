import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Animated, Alert } from 'react-native';
import { User, LogOut, Globe, Play, ChevronRight, History, Bot, Mic } from 'lucide-react-native';
import { Colors, Typography, Spacing, Radii, Shadows } from '../../theme';
import GlassCard from '../../components/GlassCard';
import PrimaryButton from '../../components/PrimaryButton';
import { getUser, clearUser } from '../../utils/storage';
import { getHistory, startConsultation, getTranscriberHistory } from '../../api/report';
import SecurityStatusPanel from '../../components/SecurityStatusPanel';
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
        const [sessionRes, transcriberRes] = await Promise.all([
          getHistory(userData.id),
          getTranscriberHistory(userData.id)
        ]);
        
        // Tag and merge
        const sessionHistory = (sessionRes.data || []).map(item => ({ ...item, type: 'session' }));
        const transcriberHistory = (transcriberRes.data || []).map(item => ({ ...item, type: 'transcriber' }));
        
        const combined = [...sessionHistory, ...transcriberHistory].sort((a, b) => 
          new Date(b.created_at) - new Date(a.created_at)
        );
        
        setHistory(combined);
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
    if (user.isLocked || user.sessionCount >= 2) {
      // Access Locked - handle in ConsultationScreen or show message here
      // For now, we allow navigation but ConsultationScreen will show the lock modal
      navigation.navigate('Consultation', { sessionId: `sess_${Date.now()}`, language, patient: user, isLocked: true });
      return;
    }
    const sessionId = `sess_${Date.now()}`;
    navigation.navigate('Consultation', { sessionId, language, patient: user });
  };

  const handleTranscriber = async () => {
    try {
      setLoading(true);
      const res = await startConsultation(user.id);
      if (res.data?.consultation_id) {
        navigation.navigate('Transcriber', { consultationId: res.data.consultation_id, patientId: user.id });
      }
    } catch (err) {
      Alert.alert("Error", "Could not initialize transcriber session.");
    } finally {
      setLoading(false);
    }
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
          
          {/* Session Limit Display */}
          <View style={styles.sessionLimitBadge}>
            <Text style={[styles.sessionLimitText, (user.isLocked || user.sessionCount >= 2) && styles.expiredText]}>
              {user.isLocked || user.sessionCount >= 2 
                ? "Trial Expired" 
                : `Free Sessions Remaining: ${2 - (user.sessionCount || 0)}/2`}
            </Text>
          </View>

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

        {/* Smart Transcriber Card */}
        <GlassCard style={styles.transcriberCard}>
          <View style={styles.transcriberHeader}>
            <Mic color={Colors.indigo} size={24} />
            <Text style={styles.transcriberTitle}>Smart AI Transcriber</Text>
          </View>
          <Text style={styles.transcriberInfo}>Record and transcribe doctor-patient conversations in real-time with automatic speaker detection.</Text>
          <TouchableOpacity onPress={handleTranscriber} style={styles.transcriberBtn}>
             <Text style={styles.transcriberBtnText}>Start Transcription</Text>
             <ChevronRight color="#fff" size={18} />
          </TouchableOpacity>
        </GlassCard>

        {/* Security Monitoring Panel */}
        {user?.id && (
          <SecurityStatusPanel
            patientId={user.id}
            refresh={history.length} // re-fetches whenever history changes
          />
        )}

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
                key={item.id || item.session_id}
                onPress={() => {
                  if (item.type === 'transcriber') {
                    navigation.navigate('ConsultationDetail', { consultation: item });
                  } else {
                    // Map history item to results screen format
                    const safeParse = (str) => {
                      if (!str) return {};
                      if (typeof str === 'object') return str;
                      try { return JSON.parse(str); }
                      catch (e) {
                        try { return JSON.parse(str.replace(/'/g, '"')); }
                        catch (e2) { return {}; }
                      }
                    };

                    let medication = safeParse(item.medication);

                    let visionData = safeParse(item.emotion_metrics);

                    navigation.navigate('Results', {
                      sessionId: item.session_id,
                      vision: visionData,
                      diagnosis: {
                        condition: item.condition,
                        confidence: (item.confidence || 0) * 100,
                        medication: medication,
                        safety_passed: item.safety,
                      }
                    });
                  }
                }}
              >
                <GlassCard style={styles.historyItem}>
                  <View style={styles.historyLeft}>
                    <View style={styles.typeRow}>
                      <Text style={[styles.typeBadge, item.type === 'transcriber' ? styles.typeTranscriber : styles.typeChat]}>
                         {item.type === 'transcriber' ? 'Transcribed' : 'AI Chat'}
                      </Text>
                      <Text style={styles.historyDate}>{new Date(item.created_at).toLocaleDateString()}</Text>
                    </View>
                    <Text style={styles.historyCondition}>
                        {item.type === 'transcriber' ? (item.summary ? item.summary.substring(0, 30) + "..." : "Consultation") : item.condition}
                    </Text>
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
  historyLeft: { gap: 4, flex: 1 },
  typeRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 2 },
  typeBadge: { fontSize: 9, fontWeight: 'bold', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, textTransform: 'uppercase' },
  typeChat: { backgroundColor: 'rgba(56,239,125,0.1)', color: '#38ef7d' },
  typeTranscriber: { backgroundColor: 'rgba(99,102,241,0.1)', color: Colors.indigo },
  historyCondition: { color: '#fff', fontSize: 16, fontWeight: '600' },
  historyDate: { color: Colors.textMuted, fontSize: 12 },
  historySection: { marginBottom: 16 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#fff' },
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
  transcriberCard: { padding: 20, marginBottom: 25, backgroundColor: 'rgba(99,102,241,0.05)', borderColor: 'rgba(99,102,241,0.2)', borderWidth: 1 },
  transcriberHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  transcriberTitle: { color: '#fff', fontSize: 18, fontWeight: '700' },
  transcriberInfo: { color: Colors.textSecondary, fontSize: 13, marginBottom: 15, lineHeight: 18 },
  transcriberBtn: { backgroundColor: Colors.indigo, padding: 12, borderRadius: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5 },
  transcriberBtnText: { color: '#fff', fontWeight: 'bold' },
  sessionLimitBadge: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  sessionLimitText: {
    color: Colors.indigo,
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  expiredText: {
    color: Colors.rose,
  },
});

export default DashboardScreen;
