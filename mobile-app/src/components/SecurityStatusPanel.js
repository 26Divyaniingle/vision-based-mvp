/**
 * SecurityStatusPanel Component
 *
 * Displays a compact security monitoring card in the Dashboard.
 * Shows:
 *  - Overall identity verification status (Verified / Alert / Restricted)
 *  - Total unresolved alerts count
 *  - Last alert timestamp
 *  - Recent alert list (collapsible)
 *
 * This is a read-only display component. It fetches data from the backend
 * and refreshes when the parent screen gains focus.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import {
  ShieldCheck,
  ShieldAlert,
  ShieldX,
  ChevronDown,
  ChevronUp,
  Clock,
} from 'lucide-react-native';
import { Colors, Radii, Shadows } from '../theme';
import GlassCard from './GlassCard';
import { getPatientAlerts } from '../api/security';

// ─── Status helpers ──────────────────────────────────────────────────────────
const STATUS = {
  verified: { label: 'Identity Verified', color: '#10b981', Icon: ShieldCheck },
  warning:  { label: 'Security Alert',    color: '#f59e0b', Icon: ShieldAlert },
  locked:   { label: 'Session Restricted', color: '#f43f5e', Icon: ShieldX },
};

function resolveStatus(alerts) {
  if (!alerts || alerts.length === 0) return 'verified';
  const unresolved = alerts.filter((a) => !a.resolved);
  if (unresolved.length >= 3) return 'locked';
  if (unresolved.length > 0) return 'warning';
  return 'verified';
}

function fmtTime(isoStr) {
  if (!isoStr) return '--';
  const d = new Date(isoStr);
  return d.toLocaleString(undefined, {
    month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

// ─── Component ───────────────────────────────────────────────────────────────
/**
 * Props:
 *  patientId {number} – the logged-in patient's DB id
 *  refresh   {bool}   – bumping this value triggers a data refresh
 */
const SecurityStatusPanel = ({ patientId, refresh }) => {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);

  const fetchAlerts = useCallback(async () => {
    if (!patientId) return;
    setLoading(true);
    try {
      const res = await getPatientAlerts(patientId, 10);
      setAlerts(res.data?.alerts || []);
    } catch (_) {
      // Non-critical – silently fail; don't crash the dashboard
    } finally {
      setLoading(false);
    }
  }, [patientId]);

  useEffect(() => {
    fetchAlerts();
  }, [fetchAlerts, refresh]);

  const status = resolveStatus(alerts);
  const { label, color, Icon } = STATUS[status];
  const unresolvedCount = alerts.filter((a) => !a.resolved).length;
  const lastAlert = alerts[0]; // Already sorted newest-first by backend

  return (
    <GlassCard style={styles.card}>
      {/* ── Header ── */}
      <TouchableOpacity
        style={styles.header}
        onPress={() => setExpanded((v) => !v)}
        activeOpacity={0.8}
      >
        <View style={[styles.iconBox, { backgroundColor: `${color}18` }]}>
          <Icon color={color} size={20} />
        </View>
        <View style={styles.headerText}>
          <Text style={styles.title}>Session Security</Text>
          <Text style={[styles.statusLabel, { color }]}>{label}</Text>
        </View>
        <View style={styles.headerRight}>
          {loading ? (
            <ActivityIndicator size="small" color={Colors.indigo} />
          ) : (
            <>
              {unresolvedCount > 0 && (
                <View style={[styles.badge, { backgroundColor: color }]}>
                  <Text style={styles.badgeText}>{unresolvedCount}</Text>
                </View>
              )}
              {expanded ? (
                <ChevronUp color={Colors.textSecondary} size={16} />
              ) : (
                <ChevronDown color={Colors.textSecondary} size={16} />
              )}
            </>
          )}
        </View>
      </TouchableOpacity>

      {/* ── Quick stats row ── */}
      <View style={styles.statsRow}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{alerts.length}</Text>
          <Text style={styles.statLabel}>Total Alerts</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={[styles.statValue, unresolvedCount > 0 && { color }]}>{unresolvedCount}</Text>
          <Text style={styles.statLabel}>Unresolved</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{alerts.length - unresolvedCount}</Text>
          <Text style={styles.statLabel}>Resolved</Text>
        </View>
      </View>

      {/* ── Expanded alert list ── */}
      {expanded && (
        <View style={styles.alertList}>
          {alerts.length === 0 ? (
            <Text style={styles.noAlerts}>No security events recorded.</Text>
          ) : (
            alerts.slice(0, 5).map((a) => (
              <View key={a.id} style={styles.alertItem}>
                <View style={styles.alertDot(a.resolved)} />
                <View style={styles.alertContent}>
                  <Text style={styles.alertType}>
                    {a.alert_type === 'FACE_MISMATCH' ? '⚠️ Face Mismatch' : '🔄 Re-Verify Failed'}
                  </Text>
                  <View style={styles.alertMeta}>
                    <Clock color={Colors.textMuted} size={11} />
                    <Text style={styles.alertTime}>{fmtTime(a.created_at)}</Text>
                    {a.similarity_score !== null && (
                      <Text style={styles.alertScore}>
                        Score: {a.similarity_score?.toFixed(3)}
                      </Text>
                    )}
                    <Text style={[styles.alertResolved, { color: a.resolved ? '#10b981' : '#f59e0b' }]}>
                      {a.resolved ? '✓ Resolved' : '• Pending'}
                    </Text>
                  </View>
                </View>
              </View>
            ))
          )}
        </View>
      )}
    </GlassCard>
  );
};

// ─── Styles ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  card: { padding: 0, overflow: 'hidden', marginBottom: 16 },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: Radii.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerText: { flex: 1 },
  title: { fontSize: 13, fontWeight: '700', color: '#fff', letterSpacing: 0.3 },
  statusLabel: { fontSize: 11, fontWeight: '600', marginTop: 2, textTransform: 'uppercase', letterSpacing: 0.5 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  badge: {
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 5,
  },
  badgeText: { color: '#fff', fontSize: 11, fontWeight: '800' },

  // Stats
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.05)',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  statItem: { alignItems: 'center', gap: 3 },
  statValue: { fontSize: 18, fontWeight: '800', color: '#fff' },
  statLabel: { fontSize: 10, color: Colors.textMuted, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.4 },
  statDivider: { width: 1, backgroundColor: 'rgba(255,255,255,0.07)', marginVertical: 4 },

  // Alert list
  alertList: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.05)',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
    gap: 10,
  },
  noAlerts: {
    color: Colors.textMuted,
    fontSize: 12,
    textAlign: 'center',
    paddingVertical: 10,
    fontStyle: 'italic',
  },
  alertItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  alertDot: (resolved) => ({
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: resolved ? '#10b981' : '#f59e0b',
    marginTop: 4,
  }),
  alertContent: { flex: 1 },
  alertType: { color: Colors.textPrimary, fontSize: 12, fontWeight: '600', marginBottom: 3 },
  alertMeta: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  alertTime: { color: Colors.textMuted, fontSize: 10 },
  alertScore: {
    color: Colors.textMuted,
    fontSize: 10,
    backgroundColor: 'rgba(255,255,255,0.06)',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
  },
  alertResolved: { fontSize: 10, fontWeight: '600' },
});

export default SecurityStatusPanel;
