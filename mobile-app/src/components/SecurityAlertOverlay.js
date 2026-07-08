/**
 * SecurityAlertOverlay Component
 *
 * A professional, medical-grade security alert modal that appears when a face
 * mismatch is detected during a consultation session.
 *
 * Features:
 *  - Animated entrance with shake effect on critical alerts
 *  - Re-verification flow using the device camera
 *  - Session restriction lock UI (after 3+ mismatches)
 *  - Non-intrusive on first alert; escalates on repeated mismatches
 *  - Logs mismatch events and clears them on successful re-verify
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Animated,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { CameraView } from 'expo-camera';
import { ShieldAlert, ShieldCheck, ShieldX, Eye, RefreshCw, X, AlertTriangle } from 'lucide-react-native';
import { Colors, Radii, Shadows } from '../theme';
import { reVerifyIdentity } from '../api/security';

const { width } = Dimensions.get('window');

// ─── Colour tokens specific to security UI ──────────────────────────────────
const SEC = {
  warning: '#f59e0b',   // amber  – first alert
  danger: '#f43f5e',    // rose   – restricted / locked
  safe: '#10b981',      // emerald – verified
  overlay: 'rgba(0,0,0,0.82)',
};

// ─── Component ───────────────────────────────────────────────────────────────
/**
 * Props:
 *  visible       {bool}    – whether the modal is shown
 *  mismatchCount {number}  – total mismatches so far this session
 *  score         {number}  – cosine distance score (0–1)
 *  restricted    {bool}    – whether the session is locked
 *  patientId     {number}  – current patient's DB id
 *  sessionId     {string}  – active consultation session id
 *  onDismiss     {func}    – called when user dismisses (non-restricted)
 *  onVerified    {func}    – called when re-verification succeeds
 *  onEndSession  {func}    – called when user decides to end session
 */
const SecurityAlertOverlay = ({
  visible,
  mismatchCount = 1,
  score = 0,
  restricted = false,
  patientId,
  sessionId,
  onDismiss,
  onVerified,
  onEndSession,
}) => {
  const [phase, setPhase] = useState('alert'); // 'alert' | 'camera' | 'verifying' | 'success' | 'failed'
  const [verifyResult, setVerifyResult] = useState(null);
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);
  const shakeAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const cameraRef = useRef(null);

  // Shake animation on new alert
  useEffect(() => {
    if (visible) {
      setPhase('alert');
      setVerifyResult(null);
      setIsCameraReady(false);
      // Shake the card to draw attention
      Animated.sequence([
        Animated.timing(shakeAnim, { toValue: 10, duration: 80, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: -10, duration: 80, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: 8, duration: 80, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: -8, duration: 80, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: 0, duration: 80, useNativeDriver: true }),
      ]).start();

      // Pulse the shield icon
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.15, duration: 700, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1.0, duration: 700, useNativeDriver: true }),
        ])
      ).start();
    } else {
      pulseAnim.stopAnimation();
    }
  }, [visible]);

  // Reset camera ready state when phase changes to anything other than camera
  useEffect(() => {
    if (phase !== 'camera') {
      setIsCameraReady(false);
    }
  }, [phase]);

  const handleReVerify = async () => {
    if (!cameraRef.current || !isCameraReady || isCapturing) {
      console.warn('Re-verify requested but camera not ready or already capturing');
      return;
    }
    setIsCapturing(true);
    try {
      const photo = await cameraRef.current.takePictureAsync({
        base64: true,
        quality: 0.4,
        shutterSound: false,
      });
      setPhase('verifying');
      setIsCapturing(false);
      const res = await reVerifyIdentity(patientId, sessionId, photo.base64);
      const data = res.data;
      if (data.verified) {
        setVerifyResult({ success: true, message: data.message });
        setPhase('success');
        setTimeout(() => {
          onVerified && onVerified();
        }, 2000);
      } else {
        setVerifyResult({ success: false, message: data.message, score: data.score });
        setPhase('failed');
      }
    } catch (err) {
      setIsCapturing(false);
      console.error('Re-verification request exception:', err);
      const errMsg = err.response?.data?.detail || err.response?.data?.message || err.message || 'Verification request failed. Check your connection.';
      setVerifyResult({ success: false, message: errMsg });
      setPhase('failed');
    }
  };

  // ── Severity colour ──────────────────────────────────────────────────────
  const severityColor = restricted ? SEC.danger : mismatchCount >= 2 ? SEC.warning : SEC.warning;
  const isLocked = restricted;

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={!isLocked ? onDismiss : undefined}
    >
      <View style={styles.backdrop}>
        <Animated.View
          style={[
            styles.card,
            { borderColor: severityColor },
            { transform: [{ translateX: shakeAnim }] },
          ]}
        >
          {/* ── Header ── */}
          <View style={[styles.cardHeader, { backgroundColor: `${severityColor}22` }]}>
            <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
              {phase === 'success' ? (
                <ShieldCheck color={SEC.safe} size={32} />
              ) : phase === 'failed' ? (
                <ShieldX color={SEC.danger} size={32} />
              ) : (
                <ShieldAlert color={severityColor} size={32} />
              )}
            </Animated.View>

            <View style={styles.headerTextGroup}>
              <Text style={[styles.alertTitle, { color: severityColor }]}>
                {phase === 'success'
                  ? 'Identity Verified'
                  : phase === 'failed'
                  ? 'Verification Failed'
                  : isLocked
                  ? 'Session Restricted'
                  : 'Security Alert'}
              </Text>
              <Text style={styles.alertBadge}>
                {isLocked ? '🔒 LOCKED' : `⚠️ Alert #${mismatchCount}`}
              </Text>
            </View>

            {/* Dismiss (only when not restricted and on alert phase) */}
            {!isLocked && phase === 'alert' && (
              <TouchableOpacity
                style={styles.dismissBtn}
                onPress={onDismiss}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <X color={Colors.textSecondary} size={18} />
              </TouchableOpacity>
            )}
          </View>

          {/* ── Body — Alert Phase ── */}
          {phase === 'alert' && (
            <View style={styles.body}>
              <View style={styles.warningRow}>
                <AlertTriangle color={severityColor} size={16} />
                <Text style={[styles.warningText, { color: severityColor }]}>
                  Unauthorized person access detected during consultation.
                </Text>
              </View>

              {/* Score info */}
              <View style={styles.scoreRow}>
                <View style={styles.scoreItem}>
                  <Text style={styles.scoreLabel}>Distance Score</Text>
                  <Text style={[styles.scoreValue, { color: severityColor }]}>
                    {score.toFixed(3)}
                  </Text>
                </View>
                <View style={styles.scoreDivider} />
                <View style={styles.scoreItem}>
                  <Text style={styles.scoreLabel}>Mismatches</Text>
                  <Text style={[styles.scoreValue, { color: severityColor }]}>
                    {mismatchCount}
                  </Text>
                </View>
                <View style={styles.scoreDivider} />
                <View style={styles.scoreItem}>
                  <Text style={styles.scoreLabel}>Status</Text>
                  <Text style={[styles.scoreValue, { color: isLocked ? SEC.danger : SEC.warning }]}>
                    {isLocked ? 'LOCKED' : 'WARNING'}
                  </Text>
                </View>
              </View>

              {isLocked && (
                <View style={styles.lockBox}>
                  <Text style={styles.lockText}>
                    This session has been restricted due to repeated identity mismatches.
                    You must verify your identity to continue.
                  </Text>
                </View>
              )}

              <Text style={styles.instructionText}>
                Please look at the camera and tap "Verify Now" to confirm your identity.
              </Text>

              {/* Action Buttons */}
              <View style={styles.btnRow}>
                {!isLocked && (
                  <TouchableOpacity
                    style={[styles.btn, styles.btnSecondary]}
                    onPress={onDismiss}
                  >
                    <Text style={styles.btnTextSecondary}>Acknowledge</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  style={[styles.btn, styles.btnPrimary]}
                  onPress={() => setPhase('camera')}
                >
                  <Eye color="#fff" size={16} />
                  <Text style={styles.btnTextPrimary}>Verify Now</Text>
                </TouchableOpacity>
              </View>

              {!isLocked && (
                <TouchableOpacity style={styles.endLink} onPress={onEndSession}>
                  <Text style={styles.endLinkText}>End Session Instead</Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          {/* ── Body — Camera Phase ── */}
          {phase === 'camera' && (
            <View style={styles.body}>
              <Text style={styles.cameraInstruction}>
                Position your face within the frame, then tap the button below.
              </Text>
              <View style={styles.cameraWrapper}>
                <CameraView 
                  ref={cameraRef} 
                  style={styles.miniCamera} 
                  facing="front" 
                  onCameraReady={() => {
                    console.log("Overlay camera READY");
                    setIsCameraReady(true);
                  }}
                  onMountError={(err) => {
                    console.error("Overlay camera mount error:", err);
                    setIsCameraReady(false);
                  }}
                />
                <View style={styles.cameraFaceGuide} />
              </View>
              <TouchableOpacity
                style={[
                  styles.btn,
                  styles.btnPrimary,
                  { marginTop: 16, alignSelf: 'center' },
                  (!isCameraReady || isCapturing) && { opacity: 0.6 }
                ]}
                onPress={handleReVerify}
                disabled={!isCameraReady || isCapturing}
              >
                {isCapturing ? (
                  <>
                    <ActivityIndicator size="small" color="#fff" />
                    <Text style={styles.btnTextPrimary}>Capturing Image...</Text>
                  </>
                ) : isCameraReady ? (
                  <>
                    <ShieldCheck color="#fff" size={16} />
                    <Text style={styles.btnTextPrimary}>Confirm Identity</Text>
                  </>
                ) : (
                  <>
                    <ActivityIndicator size="small" color="#fff" />
                    <Text style={styles.btnTextPrimary}>Starting Camera...</Text>
                  </>
                )}
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.endLink}
                onPress={() => setPhase('alert')}
              >
                <Text style={styles.endLinkText}>← Back</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* ── Body — Verifying Phase ── */}
          {phase === 'verifying' && (
            <View style={[styles.body, styles.centeredBody]}>
              <ActivityIndicator size="large" color={Colors.indigo} />
              <Text style={styles.verifyingText}>Verifying identity…</Text>
              <Text style={styles.verifyingSubText}>
                Comparing your face to the registered profile.
              </Text>
            </View>
          )}

          {/* ── Body — Success Phase ── */}
          {phase === 'success' && (
            <View style={[styles.body, styles.centeredBody]}>
              <View style={[styles.resultIcon, { backgroundColor: `${SEC.safe}22` }]}>
                <ShieldCheck color={SEC.safe} size={48} />
              </View>
              <Text style={[styles.resultTitle, { color: SEC.safe }]}>Identity Confirmed</Text>
              <Text style={styles.resultSubText}>
                {verifyResult?.message || 'Your identity has been verified. Consultation access restored.'}
              </Text>
            </View>
          )}

          {/* ── Body — Failed Phase ── */}
          {phase === 'failed' && (
            <View style={[styles.body, styles.centeredBody]}>
              <View style={[styles.resultIcon, { backgroundColor: `${SEC.danger}22` }]}>
                <ShieldX color={SEC.danger} size={48} />
              </View>
              <Text style={[styles.resultTitle, { color: SEC.danger }]}>Verification Failed</Text>
              <Text style={styles.resultSubText}>
                {verifyResult?.message || 'Face does not match. Please try again.'}
              </Text>
              <View style={styles.btnRow}>
                <TouchableOpacity
                  style={[styles.btn, styles.btnPrimary]}
                  onPress={() => setPhase('camera')}
                >
                  <RefreshCw color="#fff" size={15} />
                  <Text style={styles.btnTextPrimary}>Try Again</Text>
                </TouchableOpacity>
                {!isLocked && (
                  <TouchableOpacity
                    style={[styles.btn, styles.btnSecondary]}
                    onPress={onDismiss}
                  >
                    <Text style={styles.btnTextSecondary}>Dismiss</Text>
                  </TouchableOpacity>
                )}
              </View>
              {!isLocked && (
                <TouchableOpacity style={styles.endLink} onPress={onEndSession}>
                  <Text style={styles.endLinkText}>End Session</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </Animated.View>
      </View>
    </Modal>
  );
};

// ─── Styles ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: SEC.overlay,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  card: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: '#0f0f1e',
    borderRadius: Radii.xl,
    borderWidth: 1.5,
    overflow: 'hidden',
    ...Shadows.card,
  },

  // Header
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 18,
    gap: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  headerTextGroup: { flex: 1 },
  alertTitle: {
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  alertBadge: {
    fontSize: 11,
    color: Colors.textSecondary,
    fontWeight: '600',
    textTransform: 'uppercase',
    marginTop: 2,
    letterSpacing: 0.5,
  },
  dismissBtn: {
    padding: 4,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },

  // Body
  body: {
    padding: 20,
    gap: 14,
  },
  centeredBody: {
    alignItems: 'center',
    paddingVertical: 32,
    gap: 16,
  },

  // Warning row
  warningRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: 'rgba(245,158,11,0.08)',
    borderRadius: Radii.md,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(245,158,11,0.18)',
  },
  warningText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '500',
  },

  // Score row
  scoreRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: Radii.md,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
  },
  scoreItem: { alignItems: 'center', gap: 4 },
  scoreLabel: {
    fontSize: 10,
    color: Colors.textSecondary,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  scoreValue: { fontSize: 16, fontWeight: '800' },
  scoreDivider: { width: 1, backgroundColor: 'rgba(255,255,255,0.07)' },

  // Lock box
  lockBox: {
    backgroundColor: 'rgba(244,63,94,0.08)',
    borderRadius: Radii.md,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(244,63,94,0.2)',
  },
  lockText: {
    color: SEC.danger,
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center',
  },
  instructionText: {
    color: Colors.textSecondary,
    fontSize: 13,
    lineHeight: 19,
    textAlign: 'center',
  },

  // Buttons
  btnRow: {
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'center',
    marginTop: 4,
  },
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: Radii.lg,
    flex: 1,
    justifyContent: 'center',
  },
  btnPrimary: {
    backgroundColor: Colors.indigo,
    ...Shadows.glow,
  },
  btnSecondary: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  btnTextPrimary: { color: '#fff', fontWeight: '700', fontSize: 14 },
  btnTextSecondary: { color: Colors.textPrimary, fontWeight: '600', fontSize: 14 },

  // End session link
  endLink: { alignItems: 'center', marginTop: 4 },
  endLinkText: { color: SEC.danger, fontSize: 12, fontWeight: '500' },

  // Camera
  cameraInstruction: {
    color: Colors.textSecondary,
    fontSize: 13,
    lineHeight: 18,
    textAlign: 'center',
  },
  cameraWrapper: {
    width: '100%',
    height: 200,
    borderRadius: Radii.lg,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: '#000',
  },
  miniCamera: { flex: 1 },
  cameraFaceGuide: {
    position: 'absolute',
    top: '10%',
    left: '20%',
    right: '20%',
    bottom: '10%',
    borderRadius: 999,
    borderWidth: 2,
    borderColor: 'rgba(99,102,241,0.6)',
    borderStyle: 'dashed',
  },

  // Result screens
  resultIcon: {
    width: 90,
    height: 90,
    borderRadius: 45,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  resultTitle: { fontSize: 20, fontWeight: '800', textAlign: 'center' },
  resultSubText: {
    color: Colors.textSecondary,
    fontSize: 13,
    lineHeight: 19,
    textAlign: 'center',
    maxWidth: 300,
  },
  verifyingText: { color: '#fff', fontSize: 16, fontWeight: '700', marginTop: 16 },
  verifyingSubText: { color: Colors.textSecondary, fontSize: 12, textAlign: 'center' },
});

export default SecurityAlertOverlay;
