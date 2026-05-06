import { FileText, Share2, Pill, Leaf, CheckCircle, AlertTriangle, Home, Download, Mail } from 'lucide-react-native';
import { Colors, Typography, Spacing, Radii, Shadows } from '../../theme';
import GlassCard from '../../components/GlassCard';
import PrimaryButton from '../../components/PrimaryButton';
import { generatePDF, emailPDF } from '../../api/report';
import { View, Text, ScrollView, TouchableOpacity, Alert, StyleSheet, Linking, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import { useState } from 'react';
import { BASE_URL } from '../../api/client';

const ResultsScreen = ({ route, navigation }) => {
  const { diagnosis, sessionId } = route.params;
  const [activeTab, setActiveTab] = useState('allopathic');
  const [email, setEmail] = useState('');
  const [isSending, setIsSending] = useState(false);

  const handleExport = async () => {
    const url = `${BASE_URL}/report/generate_pdf?session_id=${sessionId}`;
    Linking.openURL(url).catch(err => {
        Alert.alert('Error', 'Unable to open browser to download PDF.');
    });
  };

  const handleEmail = async () => {
    if (!email || !email.includes('@')) {
        Alert.alert('Invalid Email', 'Please enter a valid email address.');
        return;
    }
    setIsSending(true);
    try {
        const res = await emailPDF(sessionId, email);
        if (res.data.success) {
            Alert.alert('Success', 'Medical report has been sent to your email.');
        } else {
            Alert.alert('Error', res.data.msg || 'Failed to send email.');
        }
    } catch (e) {
        const errorMsg = e.response?.data?.detail || e.message || 'Server unreachable.';
        Alert.alert('Error', errorMsg);
    } finally {
        setIsSending(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.header}>
        <FileText color={Colors.indigo} size={24} />
        <Text style={styles.headerTitle}>Medical Analysis</Text>
      </View>
      
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <GlassCard style={styles.diagnosisCard}>
          <Text style={styles.label}>Potential Condition</Text>
          <Text style={styles.conditionText}>{diagnosis.condition}</Text>
          
          <View style={styles.progressContainer}>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: `${diagnosis.confidence > 1 ? diagnosis.confidence : diagnosis.confidence * 100}%` }]} />
            </View>
            <Text style={styles.confidenceText}>{(diagnosis.confidence > 1 ? diagnosis.confidence : diagnosis.confidence * 100).toFixed(1)}% Confidence Match</Text>
          </View>
          
          <View style={[styles.safetyBadge, { backgroundColor: diagnosis.safety_passed ? 'rgba(16,185,129,0.1)' : 'rgba(244,63,94,0.1)' }]}>
             {diagnosis.safety_passed ? <CheckCircle color={Colors.emerald} size={14} /> : <AlertTriangle color={Colors.rose} size={14} />}
             <Text style={[styles.safetyText, { color: diagnosis.safety_passed ? Colors.emerald : Colors.rose }]}>
               {diagnosis.safety_passed ? 'CLINICAL SAFETY PASSED' : 'IMMEDIATE CARE ADVISED'}
             </Text>
          </View>
        </GlassCard>

        <View style={styles.tabHeader}>
          <TouchableOpacity onPress={() => setActiveTab('allopathic')} style={[styles.tab, activeTab === 'allopathic' && styles.activeTab]}>
            <Pill color={activeTab === 'allopathic' ? '#fff' : Colors.textSecondary} size={18} />
            <Text style={[styles.tabText, activeTab === 'allopathic' && styles.activeTabText]}>Allopathic</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setActiveTab('ayurvedic')} style={[styles.tab, activeTab === 'ayurvedic' && styles.activeTab]}>
            <Leaf color={activeTab === 'ayurvedic' ? '#fff' : Colors.textSecondary} size={18} />
            <Text style={[styles.tabText, activeTab === 'ayurvedic' && styles.activeTabText]}>Ayurvedic</Text>
          </TouchableOpacity>
        </View>

        <GlassCard style={styles.medCard}>
          {activeTab === 'allopathic' ? (
            <View>
              {(diagnosis?.medication?.allopathic || []).map((m, i) => (
                <View key={i} style={styles.medItem}>
                  <Text style={styles.medTitle}>{m.name}</Text>
                  <Text style={styles.medDesc}>{m.dosage} • {m.instruction}</Text>
                  <Text style={styles.medPurpose}>{m.purpose}</Text>
                </View>
              ))}
            </View>
          ) : (
            <View>
               {(diagnosis?.medication?.ayurvedic || []).map((m, i) => (
                <View key={i} style={styles.medItem}>
                  <Text style={styles.medTitle}>{m.remedy}</Text>
                  <Text style={styles.medBenefit}>{m.benefit}</Text>
                  <View style={styles.recipeBox}>
                    <Text style={styles.recipeTitle}>Recipe & Usage:</Text>
                    <Text style={styles.recipeText}>{m.usage}</Text>
                    <Text style={styles.timingText}><Text style={{fontWeight: 'bold'}}>Timing: </Text>{m.timing}</Text>
                  </View>
                </View>
              ))}
            </View>
          )}
        </GlassCard>

        <GlassCard style={styles.emailCard}>
            <Text style={styles.emailLabel}>Get Report via Email</Text>
            <View style={styles.emailRow}>
                <TextInput 
                    style={styles.emailInput}
                    placeholder="your@email.com"
                    placeholderTextColor={Colors.textMuted}
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                />
                <TouchableOpacity 
                    style={[styles.emailBtn, isSending && { opacity: 0.6 }]} 
                    onPress={handleEmail}
                    disabled={isSending}
                >
                    <Mail color="#fff" size={18} />
                </TouchableOpacity>
            </View>
        </GlassCard>

        <View style={styles.actions}>
          <PrimaryButton 
            title="Download PDF" 
            onPress={handleExport} 
            variant="primary" 
            style={styles.exportBtn}
          />
          <TouchableOpacity onPress={() => navigation.navigate('Dashboard')} style={styles.homeBtn}>
            <Home color={Colors.textSecondary} size={20} />
            <Text style={styles.homeBtnText}>Return to Dashboard</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg, paddingTop: 60 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 20 },
  headerTitle: { fontSize: 22, color: Colors.textPrimary, fontWeight: 'bold' },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 40 },
  diagnosisCard: { padding: 24, marginBottom: 25, alignItems: 'center' },
  label: { color: Colors.textSecondary, fontSize: 11, fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: 1 },
  conditionText: { color: Colors.textPrimary, fontSize: 26, fontWeight: '800', marginVertical: 12, textAlign: 'center' },
  progressContainer: { width: '100%', marginTop: 5 },
  progressBar: { height: 6, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 3, marginBottom: 8 },
  progressFill: { height: '100%', backgroundColor: Colors.indigo, borderRadius: 3 },
  confidenceText: { color: Colors.textSecondary, fontSize: 12, textAlign: 'center' },
  safetyBadge: { marginTop: 24, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 14, flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  safetyText: { fontSize: 11, fontWeight: 'bold', letterSpacing: 0.5 },
  tabHeader: { flexDirection: 'row', marginBottom: 15, gap: 12 },
  tab: { flex: 1, paddingVertical: 14, alignItems: 'center', justifyContent: 'center', borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.03)', flexDirection: 'row', gap: 10, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  activeTab: { backgroundColor: Colors.indigo, borderColor: Colors.indigo },
  tabText: { color: Colors.textSecondary, fontSize: 14, fontWeight: '500' },
  activeTabText: { color: '#fff', fontWeight: 'bold' },
  medCard: { padding: 20, marginBottom: 30 },
  medItem: { marginBottom: 15, paddingBottom: 15, borderBottomWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  medTitle: { color: Colors.emerald, fontSize: 17, fontWeight: 'bold', marginBottom: 4 },
  medDesc: { color: Colors.textSecondary, fontSize: 13, fontWeight: '600', marginBottom: 4 },
  medPurpose: { color: Colors.textMuted, fontSize: 12, fontStyle: 'italic', lineHeight: 18 },
  medBenefit: { color: Colors.indigo, fontSize: 15, fontWeight: 'bold', marginBottom: 8 },
  recipeBox: { backgroundColor: 'rgba(255,255,255,0.03)', padding: 12, borderRadius: 12, marginTop: 5 },
  recipeTitle: { color: Colors.textSecondary, fontSize: 11, fontWeight: 'bold', textTransform: 'uppercase', marginBottom: 5 },
  recipeText: { color: Colors.textPrimary, fontSize: 13, lineHeight: 19, marginBottom: 8 },
  timingText: { color: Colors.textSecondary, fontSize: 12 },
  emailCard: { padding: 20, marginBottom: 20, backgroundColor: 'rgba(255,255,255,0.02)' },
  emailLabel: { color: Colors.textSecondary, fontSize: 12, fontWeight: 'bold', marginBottom: 12, textTransform: 'uppercase' },
  emailRow: { flexDirection: 'row', gap: 10 },
  emailInput: { flex: 1, height: 48, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 12, paddingHorizontal: 15, color: '#fff', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  emailBtn: { width: 48, height: 48, backgroundColor: Colors.indigo, borderRadius: 12, justifyContent: 'center', alignItems: 'center', ...Shadows.glow },
  actions: { gap: 15 },
  exportBtn: { ...Shadows.glow },
  homeBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, padding: 15, marginTop: 10 },
  homeBtnText: { color: Colors.textSecondary, fontSize: 15, fontWeight: '500' },
});

export default ResultsScreen;
