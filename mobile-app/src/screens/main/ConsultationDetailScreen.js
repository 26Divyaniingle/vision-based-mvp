import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { FileText, ChevronLeft, Calendar, User, Clock, Activity, MessageSquare } from 'lucide-react-native';
import { Colors, Shadows } from '../../theme';
import GlassCard from '../../components/GlassCard';
import { SafeAreaView } from 'react-native-safe-area-context';

const ConsultationDetailScreen = ({ route, navigation }) => {
  const { consultation } = route.params;

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right', 'bottom']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <ChevronLeft color={Colors.textPrimary} size={24} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Consultation Detail</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <GlassCard style={styles.summaryCard}>
          <View style={styles.cardHeader}>
             <Activity color={Colors.indigo} size={20} />
             <Text style={styles.cardTitle}>AI Medical Summary</Text>
          </View>
          <Text style={styles.summaryText}>{consultation.summary || "No summary available."}</Text>
          
          <View style={styles.metaRow}>
             <View style={styles.metaItem}>
               <Calendar size={14} color={Colors.textMuted} />
               <Text style={styles.metaLabel}>{new Date(consultation.created_at).toLocaleDateString()}</Text>
             </View>
             <View style={styles.metaItem}>
               <Clock size={14} color={Colors.textMuted} />
               <Text style={styles.metaLabel}>{consultation.duration || "N/A"}</Text>
             </View>
          </View>
        </GlassCard>

        <View style={styles.insightsRow}>
            <GlassCard style={styles.insightBox}>
                <Text style={styles.insightLabel}>SYMPTOMS</Text>
                {(consultation.symptoms || []).map((s, i) => (
                    <View key={i} style={styles.badge}>
                        <Text style={styles.badgeText}>{s}</Text>
                    </View>
                ))}
                {consultation.symptoms?.length === 0 && <Text style={styles.noneText}>None detected</Text>}
            </GlassCard>
            <GlassCard style={styles.insightBox}>
                <Text style={styles.insightLabel}>KEYWORDS</Text>
                {(consultation.medical_keywords || []).map((k, i) => (
                    <View key={i} style={[styles.badge, {borderColor: Colors.indigo}]}>
                        <Text style={[styles.badgeText, {color: Colors.indigo}]}>{k}</Text>
                    </View>
                ))}
                {consultation.medical_keywords?.length === 0 && <Text style={styles.noneText}>None detected</Text>}
            </GlassCard>
        </View>

        <View style={styles.transcriptSection}>
            <View style={styles.sectionHeader}>
                <MessageSquare color={Colors.textSecondary} size={18} />
                <Text style={styles.sectionTitle}>Full Consultation Transcript</Text>
            </View>
            
            {(consultation.transcript || []).map((line, i) => (
                <View key={i} style={styles.transcriptLine}>
                    <Text style={line.speaker === 'Doctor' ? styles.doctorLabel : styles.patientLabel}>
                        {line.speaker}
                    </Text>
                    <Text style={styles.lineText}>{line.text}</Text>
                </View>
            ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a14' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 15 },
  headerTitle: { color: '#fff', fontSize: 20, fontWeight: 'bold' },
  backBtn: { padding: 5 },
  content: { paddingHorizontal: 20, paddingBottom: 40 },
  summaryCard: { padding: 20, marginBottom: 20 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 15 },
  cardTitle: { color: '#fff', fontSize: 18, fontWeight: '700' },
  summaryText: { color: '#eee', fontSize: 15, lineHeight: 22, marginBottom: 20 },
  metaRow: { flexDirection: 'row', gap: 20, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.05)', paddingTop: 15 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  metaLabel: { color: Colors.textMuted, fontSize: 12 },
  insightsRow: { flexDirection: 'row', gap: 12, marginBottom: 25 },
  insightBox: { flex: 1, padding: 15 },
  insightLabel: { fontSize: 10, fontWeight: 'bold', color: Colors.textMuted, marginBottom: 12, letterSpacing: 0.5 },
  badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, borderWidth: 1, borderColor: Colors.emerald, marginBottom: 6, alignSelf: 'flex-start' },
  badgeText: { fontSize: 11, color: Colors.emerald, fontWeight: '600' },
  noneText: { color: Colors.textMuted, fontSize: 12, fontStyle: 'italic' },
  transcriptSection: { marginTop: 10 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 20 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#fff' },
  transcriptLine: { marginBottom: 15, paddingLeft: 12, borderLeftWidth: 2, borderLeftColor: 'rgba(255,255,255,0.1)' },
  doctorLabel: { fontSize: 12, fontWeight: 'bold', color: Colors.indigo, marginBottom: 4 },
  patientLabel: { fontSize: 12, fontWeight: 'bold', color: Colors.emerald, marginBottom: 4 },
  lineText: { color: '#bbb', fontSize: 14, lineHeight: 20 }
});

export default ConsultationDetailScreen;
