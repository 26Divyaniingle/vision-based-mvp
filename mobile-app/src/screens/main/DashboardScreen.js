import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Animated, Alert } from 'react-native';
import { User, LogOut, Globe, Play, ChevronRight, History, Bot, Mic, Activity, ClipboardList, Sparkles } from 'lucide-react-native';
import { Colors, Typography, Spacing, Radii, Shadows } from '../../theme';
import GlassCard from '../../components/GlassCard';
import PrimaryButton from '../../components/PrimaryButton';
import { getUser, clearUser } from '../../utils/storage';
import { getHistory, startConsultation, getTranscriberHistory } from '../../api/report';
import SecurityStatusPanel from '../../components/SecurityStatusPanel';
import { ActivityIndicator, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';

const HistoryItem = ({ item, navigation, isLast }) => {
  const handlePress = () => {
    if (item.type === 'transcriber') {
      navigation.navigate('ConsultationDetail', { consultation: item });
    } else {
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
  };

  return (
    <TouchableOpacity 
      onPress={handlePress} 
      style={[styles.historyItem, !isLast && styles.historyItemBorder]}
    >
      <View style={styles.historyIcon}>
        {item.type === 'transcriber' ? <Mic size={18} color={Colors.purple} /> : <Bot size={18} color={Colors.indigo} />}
      </View>
      <View style={styles.historyContent}>
        <Text style={styles.historyTitle} numberOfLines={1}>
          {item.type === 'transcriber' ? (item.summary || "Consultation Record") : item.condition}
        </Text>
        <Text style={styles.historySubtitle}>{new Date(item.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</Text>
      </View>
      <ChevronRight color={Colors.textMuted} size={16} />
    </TouchableOpacity>
  );
};

const DashboardScreen = ({ navigation }) => {
  const [user, setUser] = useState(null);
  const [language, setLanguage] = useState('Hinglish');
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

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
    // Basic setup if needed
  }, []);

  const languages = [
    { name: 'English', flag: '🇺🇸' },
    { name: 'Hindi', flag: '🇮🇳' },
    { name: 'Marathi', flag: '🇮🇳' },
    { name: 'Hinglish', flag: '🇮🇳' },
  ];

  const handleStart = () => {
    if (user.isLocked || user.sessionCount >= 15) {
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
      const res = await startConsultation(user.id, language);
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
        {/* Quick Action Hub */}
        <View style={styles.actionHub}>
          <Text style={styles.actionHubTitle}>Quick Actions</Text>
          <View style={styles.actionGrid}>
            <TouchableOpacity 
              activeOpacity={0.9} 
              onPress={handleStart}
              style={styles.actionCardWrapper}
            >
              <LinearGradient
                colors={['#6366f1', '#4f46e5']}
                style={styles.actionCard}
              >
                <View style={styles.actionIconBg}>
                  <Activity color="#fff" size={24} />
                </View>
                <Text style={styles.actionLabel}>AI Consultation</Text>
                <Text style={styles.actionSublabel}>Real-time Health Analysis</Text>
                
                <View style={styles.badgeContainer}>
                   <Text style={[styles.badgeText, (user.isLocked || user.sessionCount >= 15) && styles.badgeTextExpired]}>
                    {user.isLocked || user.sessionCount >= 15 ? "EXPIRED" : `${15 - (user.sessionCount || 0)} LEFT`}
                   </Text>
                </View>
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity 
              activeOpacity={0.9} 
              onPress={handleTranscriber}
              style={styles.actionCardWrapper}
            >
              <LinearGradient
                colors={['#8b5cf6', '#7c3aed']}
                style={styles.actionCard}
              >
                <View style={[styles.actionIconBg, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
                  <Mic color="#fff" size={24} />
                </View>
                <Text style={styles.actionLabel}>Live Transcriber</Text>
                <Text style={styles.actionSublabel}>Doctor-Patient Audio</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>

        {/* Language Selection - More compact */}
        <View style={styles.langSection}>
          <View style={styles.sectionHeaderCompact}>
            <Globe color={Colors.textSecondary} size={14} />
            <Text style={styles.sectionTitleSmall}>Preferred Language</Text>
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.langScroll}
          >
            {languages.map((l) => (
              <TouchableOpacity
                key={l.name}
                onPress={() => setLanguage(l.name)}
                style={[styles.langChip, language === l.name && styles.activeLangChip]}
              >
                <Text style={styles.flagSmall}>{l.flag} {l.name}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Security Monitoring Panel - Only if relevant */}
        {user?.id && (
          <SecurityStatusPanel
            patientId={user.id}
            refresh={history.length}
          />
        )}

        {/* Separated History Containers */}
        <View style={styles.historyContainers}>
          
          {/* AI Report Insights Section */}
          <View style={styles.containerSection}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionTitleRow}>
                <Sparkles color={Colors.indigo} size={20} />
                <Text style={styles.sectionTitle}>Medical Insights</Text>
              </View>
              <Text style={styles.itemCount}>{history.filter(i => i.type === 'session').length} Reports</Text>
            </View>

            <View style={styles.containerCard}>
              {loading ? (
                <ActivityIndicator color={Colors.indigo} style={{ padding: 20 }} />
              ) : error ? (
                <View style={styles.errorCompact}>
                  <Text style={styles.errorTextSmall}>Failed to load reports.</Text>
                  <TouchableOpacity onPress={fetchData}><Text style={styles.retryTextSmall}>Retry</Text></TouchableOpacity>
                </View>
              ) : history.filter(i => i.type === 'session').length > 0 ? (
                history.filter(i => i.type === 'session').slice(0, 5).map((item, index, arr) => (
                  <HistoryItem key={item.session_id} item={item} navigation={navigation} isLast={index === arr.length - 1} />
                ))
              ) : (
                <Text style={styles.emptyPlaceholder}>No AI reports yet.</Text>
              )}
            </View>
          </View>

          {/* Transcriber Records Section */}
          <View style={styles.containerSection}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionTitleRow}>
                <ClipboardList color={Colors.purple} size={20} />
                <Text style={styles.sectionTitle}>Transcriber Records</Text>
              </View>
              <Text style={styles.itemCount}>{history.filter(i => i.type === 'transcriber').length} Records</Text>
            </View>

            <View style={styles.containerCard}>
               {loading ? (
                <ActivityIndicator color={Colors.indigo} style={{ padding: 20 }} />
              ) : error ? (
                <View style={styles.errorCompact}>
                  <Text style={styles.errorTextSmall}>Failed to load records.</Text>
                  <TouchableOpacity onPress={fetchData}><Text style={styles.retryTextSmall}>Retry</Text></TouchableOpacity>
                </View>
              ) : history.filter(i => i.type === 'transcriber').length > 0 ? (
                history.filter(i => i.type === 'transcriber').slice(0, 5).map((item, index, arr) => (
                  <HistoryItem key={item.id} item={item} navigation={navigation} isLast={index === arr.length - 1} />
                ))
              ) : (
                <Text style={styles.emptyPlaceholder}>No transcription records yet.</Text>
              )}
            </View>
          </View>

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
  header: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    paddingHorizontal: 24, 
    paddingVertical: 20,
  },
  userProfile: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: { 
    width: 48, 
    height: 48, 
    borderRadius: 24, 
    backgroundColor: Colors.indigoLight, 
    justifyContent: 'center', 
    alignItems: 'center', 
    borderWidth: 1, 
    borderColor: 'rgba(99,102,241,0.3)' 
  },
  welcome: { fontSize: 22, fontWeight: 'bold', color: '#fff' },
  subtitle: { fontSize: 13, color: Colors.textSecondary },
  logoutBtn: { 
    width: 40, 
    height: 40, 
    borderRadius: 20, 
    backgroundColor: 'rgba(244,63,94,0.1)', 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  content: { paddingBottom: 100 },
  
  actionHub: { paddingHorizontal: 24, marginBottom: 25 },
  actionHubTitle: { fontSize: 14, fontWeight: '700', color: Colors.textSecondary, marginBottom: 15, textTransform: 'uppercase', letterSpacing: 1 },
  actionGrid: { flexDirection: 'row', gap: 12 },
  actionCardWrapper: { flex: 1 },
  actionCard: {
    padding: 20,
    borderRadius: 24,
    height: 180,
    justifyContent: 'flex-end',
    ...Shadows.card,
  },
  actionIconBg: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.25)',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'absolute',
    top: 20,
    left: 20,
  },
  actionLabel: { color: '#fff', fontSize: 18, fontWeight: '800', marginBottom: 2 },
  actionSublabel: { color: 'rgba(255,255,255,0.7)', fontSize: 11, fontWeight: '500' },
  badgeContainer: {
    position: 'absolute',
    top: 20,
    right: 20,
    backgroundColor: 'rgba(0,0,0,0.2)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  badgeText: { color: '#fff', fontSize: 9, fontWeight: '900' },
  badgeTextExpired: { color: '#fb7185' },

  langSection: { paddingHorizontal: 24, marginBottom: 30 },
  sectionHeaderCompact: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 },
  sectionTitleSmall: { fontSize: 12, fontWeight: '700', color: Colors.textSecondary, textTransform: 'uppercase' },
  langScroll: { gap: 8 },
  langChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  activeLangChip: {
    backgroundColor: Colors.indigoLight,
    borderColor: Colors.indigo,
  },
  flagSmall: { color: '#fff', fontSize: 13, fontWeight: '600' },

  historyContainers: { paddingHorizontal: 24, gap: 25 },
  containerSection: { },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: '#fff' },
  itemCount: { fontSize: 12, color: Colors.textMuted, fontWeight: '600' },
  containerCard: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    overflow: 'hidden',
    padding: 8,
  },
  historyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
  },
  historyItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  historyIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.05)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  historyContent: { flex: 1 },
  historyTitle: { color: '#fff', fontSize: 15, fontWeight: '600', marginBottom: 2 },
  historySubtitle: { color: Colors.textMuted, fontSize: 12 },
  emptyPlaceholder: { color: Colors.textMuted, fontSize: 13, textAlign: 'center', padding: 20, fontStyle: 'italic' },
  errorCompact: { padding: 20, alignItems: 'center', gap: 8 },
  errorTextSmall: { color: Colors.textMuted, fontSize: 12 },
  retryTextSmall: { color: Colors.indigo, fontSize: 12, fontWeight: '700' },

  fab: {
    position: 'absolute',
    bottom: 32,
    right: 24,
    width: 63,
    height: 63,
    borderRadius: 31.5,
    backgroundColor: Colors.indigo,
    justifyContent: 'center',
    alignItems: 'center',
    ...Shadows.glow,
  },
});

export default DashboardScreen;
