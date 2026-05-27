import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  Alert, Dimensions, ActivityIndicator, TextInput, Keyboard,
  KeyboardAvoidingView, Platform, StatusBar, Animated, Image,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useAudioPlayer, useAudioPlayerStatus, useAudioRecorder, requestRecordingPermissionsAsync, RecordingPresets } from 'expo-audio';
import { File, Paths } from 'expo-file-system';
import { User, Mic, MicOff, LogOut, Send, Shield, Eye, Activity, Zap, Brain, HeartPulse } from 'lucide-react-native';
import { Colors, Shadows } from '../../theme';
import AnimatedWaveform from '../../components/AnimatedWaveform';
import AIStatusBanner from '../../components/AIStatusBanner';
import SecurityAlertOverlay from '../../components/SecurityAlertOverlay';
import AccessLockedModal from '../../components/AccessLockedModal';
import { buildWsUrl } from '../../api/report';

const doctorAvatar = require('../../../assets/doctor_avatar.png');

const { width: SCREEN_W } = Dimensions.get('window');
// Sidebar: ~28% of screen width, min 100px, max 130px — comfortable on all mobile sizes
const SIDEBAR_W = Math.min(130, Math.max(100, Math.round(SCREEN_W * 0.28)));

// ── Emotion colour map ──────────────────────────────────────────────────────────
const EMOTION_META = {
  happy:    { color: '#10b981', emoji: '😊' },
  neutral:  { color: '#6366f1', emoji: '😐' },
  sad:      { color: '#60a5fa', emoji: '😢' },
  angry:    { color: '#f43f5e', emoji: '😡' },
  fear:     { color: '#f59e0b', emoji: '😨' },
  disgust:  { color: '#a855f7', emoji: '🤢' },
  surprise: { color: '#f97316', emoji: '😲' },
};

// ── Emotion Card ────────────────────────────────────────────────────────────────
function EmotionCard({ label, emotion, pulse }) {
  const key   = (emotion || 'neutral').toLowerCase();
  const meta  = EMOTION_META[key] || EMOTION_META.neutral;
  const color = meta.color;
  return (
    <View style={[ecStyles.card, { borderColor: color + '55', backgroundColor: color + '18' }]}>
      <Text style={ecStyles.emoji}>{meta.emoji}</Text>
      <Text style={[ecStyles.emotion, { color }]}>{key.toUpperCase()}</Text>
      <Text style={ecStyles.sectionLabel}>{label}</Text>
      {pulse && (
        <View style={[ecStyles.pulseDot, { backgroundColor: color }]} />
      )}
    </View>
  );
}
const ecStyles = StyleSheet.create({
  card: {
    width: '100%', borderRadius: 12, borderWidth: 1,
    paddingVertical: 10, paddingHorizontal: 6,
    alignItems: 'center', marginBottom: 6, position: 'relative',
  },
  emoji:        { fontSize: 22, marginBottom: 2 },
  emotion:      { fontSize: 9, fontWeight: '800', letterSpacing: 0.8 },
  sectionLabel: { color: 'rgba(255,255,255,0.35)', fontSize: 8, fontWeight: '600', marginTop: 2 },
  pulseDot: {
    position: 'absolute', top: 6, right: 6,
    width: 6, height: 6, borderRadius: 3,
  },
});

// ── Metric Bar ──────────────────────────────────────────────────────────────────
function MetricBar({ icon, label, value, warn }) {
  const numVal = parseFloat(value);
  const ratio  = isNaN(numVal) ? 0 : Math.min(numVal, 1);
  const barColor = warn ? Colors.rose : (ratio > 0.6 ? Colors.amber : Colors.emerald);
  return (
    <View style={mbStyles.row}>
      <View style={mbStyles.labelRow}>
        {icon}
        <Text style={mbStyles.label}>{label}</Text>
        <Text style={[mbStyles.val, warn && { color: Colors.rose }]}>
          {isNaN(numVal) ? value : numVal.toFixed(2)}
        </Text>
      </View>
      <View style={mbStyles.track}>
        <View style={[mbStyles.fill, { width: `${ratio * 100}%`, backgroundColor: barColor }]} />
      </View>
    </View>
  );
}
const mbStyles = StyleSheet.create({
  row:      { width: '100%', marginBottom: 8 },
  labelRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 3 },
  label:    { color: 'rgba(255,255,255,0.45)', fontSize: 8, fontWeight: '700', flex: 1 },
  val:      { color: Colors.textSecondary, fontSize: 9, fontWeight: '800' },
  track:    { height: 3, backgroundColor: 'rgba(255,255,255,0.07)', borderRadius: 2, overflow: 'hidden' },
  fill:     { height: 3, borderRadius: 2 },
});

// ── Chat Bubble ─────────────────────────────────────────────────────────────────
const BUBBLE_MAX_W = SCREEN_W - SIDEBAR_W - 80;

function ChatBubble({ msg }) {
  if (msg.role === 'status') {
    return (
      <View style={cbStyles.statusRow}>
        <Text style={cbStyles.statusText}>{msg.text}</Text>
      </View>
    );
  }
  const isBot = msg.role === 'bot';
  return (
    <View style={[cbStyles.wrapper, isBot ? cbStyles.botWrapper : cbStyles.patWrapper]}>
      <View style={cbStyles.avatar}>
        {isBot ? (
          <Image source={doctorAvatar} style={cbStyles.avatarImage} />
        ) : (
          <Text style={cbStyles.avatarText}>👤</Text>
        )}
      </View>
      <View style={[cbStyles.bubble, { maxWidth: BUBBLE_MAX_W },
        isBot ? cbStyles.botBubble : cbStyles.patBubble]}>
        <Text style={cbStyles.msgText}>{msg.text}</Text>
      </View>
    </View>
  );
}
const cbStyles = StyleSheet.create({
  wrapper:   { flexDirection: 'row', alignItems: 'flex-end', marginVertical: 5, paddingHorizontal: 8 },
  botWrapper:{ justifyContent: 'flex-start' },
  patWrapper:{ justifyContent: 'flex-end', flexDirection: 'row-reverse' },
  avatar:    { width: 26, height: 26, borderRadius: 13, backgroundColor: 'rgba(255,255,255,0.07)',
               justifyContent: 'center', alignItems: 'center', marginHorizontal: 4, overflow: 'hidden' },
  avatarImage: { width: '100%', height: '100%', borderRadius: 13 },
  avatarText:{ fontSize: 13 },
  bubble:    { padding: 11, borderRadius: 16 },
  botBubble: { backgroundColor: 'rgba(99,102,241,0.13)', borderWidth: 1,
               borderColor: 'rgba(99,102,241,0.22)', borderBottomLeftRadius: 4 },
  patBubble: { backgroundColor: 'rgba(16,185,129,0.13)', borderWidth: 1,
               borderColor: 'rgba(16,185,129,0.22)', borderBottomRightRadius: 4 },
  msgText:   { color: '#f1f5f9', fontSize: 13, lineHeight: 19 },
  statusRow: { alignSelf: 'center', marginVertical: 4, backgroundColor: 'rgba(99,102,241,0.09)',
               borderRadius: 10, paddingHorizontal: 12, paddingVertical: 4,
               borderWidth: 1, borderColor: 'rgba(99,102,241,0.18)', marginHorizontal: 8 },
  statusText:{ color: Colors.textSecondary, fontSize: 10, fontStyle: 'italic', textAlign: 'center' },
});

// ══════════════════════════════════════════════════════════════════════════════
//  MAIN SCREEN
// ══════════════════════════════════════════════════════════════════════════════
const ConsultationScreen = ({ route, navigation }) => {
  const { sessionId, language, patient } = route.params;
  const [permission, requestPermission] = useCameraPermissions();

  const [messages, setMessages]             = useState([]);
  const [symptoms, setSymptoms]             = useState([]);
  const [isMicActive, setIsMicActive]       = useState(false);
  const [isMuted, setIsMuted]               = useState(false);
  const [isAiSpeaking, setIsAiSpeaking]     = useState(false);
  const [isAiProcessing, setIsAiProcessing] = useState(false);
  const [isFinalizing, setIsFinalizing]     = useState(false);
  const [isReconnecting, setIsReconnecting] = useState(false);
  const [currentPhase, setCurrentPhase]     = useState(null);
  const [isTextMode, setIsTextMode]         = useState(false);
  const [textInput, setTextInput]           = useState('');

  // Patient live vision metrics (updated every ~5 s from backend)
  const [patientEmotion,  setPatientEmotion]  = useState('neutral');
  const [eyeStrain,       setEyeStrain]       = useState(null);
  const [lipTension,      setLipTension]      = useState(null);
  const [stressDetected,  setStressDetected]  = useState(false);
  const [painDetected,    setPainDetected]    = useState(false);

  // Security
  const [securityAlertVisible,  setSecurityAlertVisible]  = useState(false);
  const [securityMismatchCount, setSecurityMismatchCount] = useState(0);
  const [securityScore,         setSecurityScore]         = useState(0);
  const [sessionRestricted,     setSessionRestricted]     = useState(false);
  const [accessLockedVisible,   setAccessLockedVisible]   = useState(route.params?.isLocked || false);
  const [cameraRefreshKey,      setCameraRefreshKey]      = useState(0); 
  const isCameraReady     = useRef(false);
  const isMounted         = useRef(true);
  const isFinalizingRef   = useRef(false);
  const isLockedRef       = useRef(false);

  const ws                = useRef(null);
  const cameraRef         = useRef(null);   // hidden — used only for frame capture
  const chatScrollRef     = useRef(null);
  const reconnectTimeout  = useRef(null);
  const reconnectAttempts = useRef(0);
  const heartbeatInterval = useRef(null);
  const frameInterval     = useRef(null);
  const isMutedRef        = useRef(isMuted);
  const playTTSRef        = useRef(null);
  const blinkAnim         = useRef(new Animated.Value(0.3)).current;
  const isCapturing       = useRef(false);

  // Blinking animation for the "SECURE" dot
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(blinkAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
        Animated.timing(blinkAnim, { toValue: 0.3, duration: 800, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  const audioRecorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const player        = useAudioPlayer(null);
  const playerStatus  = useAudioPlayerStatus(player);

  useEffect(() => { isMutedRef.current = isMuted; }, [isMuted]);

  useEffect(() => {
    isFinalizingRef.current = isFinalizing;
  }, [isFinalizing]);

  useEffect(() => {
    setIsAiSpeaking(playerStatus.playing);
    if (playerStatus.playing) {
      setCurrentPhase('speaking');
    } else if (!isAiProcessing && !isReconnecting && !isFinalizing) {
      setCurrentPhase(null);
    }
  }, [playerStatus.playing]);

  useEffect(() => {
    isMounted.current = true;
    (async () => {
      if (requestPermission) {
        const { status } = await requestPermission();
        if (status !== 'granted') {
          console.warn('Camera permission not granted');
          setMessages(prev => [...prev, { 
            role: 'status', 
            text: '⚠️ Camera permission required for identity security monitoring.' 
          }]);
        }
      }
    })();
    connectWebSocket();
    startVideoSampling();
    setupAudio();
    return () => {
      isMounted.current = false;
      if (ws.current)              ws.current.close();
      if (frameInterval.current)   clearInterval(frameInterval.current);
      if (reconnectTimeout.current) clearTimeout(reconnectTimeout.current);
      if (heartbeatInterval.current) clearInterval(heartbeatInterval.current);
    };
  }, []);

  useEffect(() => {
    if (isMicActive) {
      setCurrentPhase('listening');
      startRecording();
    } else {
      if (!isAiProcessing && !isAiSpeaking && !isFinalizing && !isReconnecting)
        setCurrentPhase(null);
      stopRecording();
    }
  }, [isMicActive]);

  useEffect(() => {
    if (chatScrollRef.current && messages.length > 0)
      setTimeout(() => chatScrollRef.current?.scrollToEnd({ animated: true }), 100);
  }, [messages, currentPhase]);

  // ── WebSocket ────────────────────────────────────────────────────────────────
  const connectWebSocket = () => {
    const url = buildWsUrl(sessionId);
    if (ws.current) ws.current.close();
    ws.current = new WebSocket(url);

    ws.current.onopen = () => {
      setIsReconnecting(false);
      setCurrentPhase(null);
      reconnectAttempts.current = 0;
      heartbeatInterval.current = setInterval(() => {
        if (ws.current && ws.current.readyState === WebSocket.OPEN)
          ws.current.send(JSON.stringify({ type: 'ping' }));
      }, 20000);
      ws.current.send(JSON.stringify({
        type: 'start', patient_id: patient.id,
        patient_name: patient.name, language,
      }));
    };

    ws.current.onmessage = (e) => {
      const data = JSON.parse(e.data);
      switch (data.type) {
        case 'access_locked':
          isLockedRef.current = true;
          setAccessLockedVisible(true);
          break;
        case 'question':
          setIsAiProcessing(false);
          setCurrentPhase(null);
          setMessages(prev => [...prev, { role: 'bot', text: data.text }]);
          if (data.symptoms_so_far) setSymptoms(data.symptoms_so_far);
          if (data.audio_b64 && !isMutedRef.current && playTTSRef.current)
            playTTSRef.current(data.audio_b64);
          break;
        case 'transcript':
          setIsAiProcessing(true);
          setCurrentPhase('processing');
          setMessages(prev => [...prev, { role: 'patient', text: data.text }]);
          break;
        case 'audio':
          setIsAiProcessing(false);
          if (!isMutedRef.current && playTTSRef.current)
            playTTSRef.current(data.audio_b64);
          break;
        case 'alert':
          setStressDetected(true);
          break;
        case 'processing':
          setIsAiProcessing(true);
          setCurrentPhase('processing');
          if (data.text) setMessages(prev => [...prev, { role: 'status', text: data.text }]);
          break;
        case 'status':
          if (data.text) setMessages(prev => [...prev, { role: 'status', text: data.text }]);
          break;
        case 'vision_update':
          // Real-time patient biometric data from backend
          if (data.emotion)            setPatientEmotion(data.emotion);
          if (data.eye_strain  != null) setEyeStrain(data.eye_strain);
          if (data.lip_tension != null) setLipTension(data.lip_tension);
          if (data.stress      != null) setStressDetected(data.stress);
          if (data.pain        != null) setPainDetected(data.pain);
          break;
        case 'identity_alert':
          setSecurityScore(data.score || 0);
          setSecurityMismatchCount(data.mismatch_count || 1);
          if (data.restrict) setSessionRestricted(true);
          isCameraReady.current = false;
          setSecurityAlertVisible(true);
          setMessages(prev => [...prev, {
            role: 'status',
            text: `🛡️ Alert #${data.mismatch_count || 1}: Identity mismatch (score: ${(data.score || 0).toFixed(3)})`,
          }]);
          break;
        case 'finalize':
          setIsAiProcessing(false);
          setIsFinalizing(true);
          isFinalizingRef.current = true;
          setCurrentPhase('finalizing');
          setTimeout(() => {
            if (isMounted.current) {
              navigation.replace('Results', {
                diagnosis: data.diagnosis, 
                sessionId, 
                vision: data.vision,
                remainingSessions: data.remaining_sessions
              });
            }
          }, 2000);
          break;
      }
    };

    ws.current.onerror = (e) => {
      if (isMounted.current) {
        // Use warn (not error) to avoid triggering the Expo red overlay on retries
        console.warn('WebSocket connection error — will auto-retry if applicable.');
      }
    };
    ws.current.onclose = () => {
      if (heartbeatInterval.current) clearInterval(heartbeatInterval.current);
      if (!isMounted.current || isFinalizingRef.current || isLockedRef.current) {
        return;
      }
      if (reconnectAttempts.current < 5) {
        setIsReconnecting(true);
        setCurrentPhase('reconnecting');
        const delay = Math.min(1000 * Math.pow(2, reconnectAttempts.current), 10000);
        reconnectAttempts.current += 1;
        reconnectTimeout.current = setTimeout(connectWebSocket, delay);
      }
    };
  };

  // ── Video sampling (camera hidden in UI, active for ML) ──────────────────────
  const startVideoSampling = () => {
    if (frameInterval.current) clearInterval(frameInterval.current);
    
    console.log("Initializing video sampling loop...");
    frameInterval.current = setInterval(async () => {
      // 1. Skip if UI is busy, alert is showing, or camera is unmounted
      if (securityAlertVisible || !isCameraReady.current || !cameraRef.current) {
        return;
      }
      
      // 2. Prevent concurrent captures
      if (isCapturing.current) return;

      if (ws.current && ws.current.readyState === WebSocket.OPEN) {
        try {
          isCapturing.current = true;
          const photo = await cameraRef.current.takePictureAsync({ 
            base64: true, 
            quality: 0.4, // Reduced quality for faster processing
          });
          
          if (photo?.base64 && ws.current && ws.current.readyState === WebSocket.OPEN) {
            ws.current.send(JSON.stringify({ type: 'video_frame', image_base64: photo.base64 }));
          }
        } catch (err) {
          console.warn('Background sampling error:', err.message);
          // Don't refresh the key here as it causes unmount loops
        } finally {
          isCapturing.current = false;
        }
      }
    }, 5000); // 5 seconds is plenty for background identity monitoring
  };

  // ── Audio ────────────────────────────────────────────────────────────────────
  const setupAudio = async () => {
    const { status } = await requestRecordingPermissionsAsync();
    if (status !== 'granted')
      Alert.alert('Permission needed', 'Audio permissions are required for clinical analysis.');
  };



  const playTTS = React.useCallback(async (base64Audio) => {
    if (!isMounted.current) return;
    try {
      const file = new File(Paths.cache, 'temp_audio.mp3');
      await file.write(base64Audio, { encoding: 'base64' });
      
      // Safety check: Ensure player exists and is not released
      if (player && !player.isReleased) {
        try { 
          player.replace(file.uri); 
          player.play(); 
        } catch (err) { 
          console.warn('AudioPlayer replace/play error:', err); 
        }
      }
    } catch (e) { 
      console.error('playTTS error:', e); 
    }
  }, [player]);

  useEffect(() => { playTTSRef.current = playTTS; }, [player]);

  const startRecording = async () => {
    if (!isMounted.current) return;
    try {
      if (!audioRecorder.isRecording) {
        if (audioRecorder.prepareToRecordAsync) await audioRecorder.prepareToRecordAsync();
        if (isMounted.current) audioRecorder.record();
      }
    } catch (err) { console.error('Start recording error:', err); }
  };

  const stopRecording = async () => {
    if (!audioRecorder.isRecording) return;
    try {
      await audioRecorder.stop();
      if (!isMounted.current) return;
      
      const uri = audioRecorder.uri;
      if (uri && ws.current && ws.current.readyState === WebSocket.OPEN) {
        const file = new File(uri);
        const base64Audio = await file.base64();
        ws.current.send(JSON.stringify({ type: 'audio_chunk', audio_b64: base64Audio }));
      }
    } catch (err) { console.error('Stop recording error:', err); }
  };

  const sendTextMessage = () => {
    const msg = textInput.trim();
    if (!msg) return;
    if (!ws.current || ws.current.readyState !== WebSocket.OPEN) {
      Alert.alert('Not connected', 'Please wait for the connection to be established.');
      return;
    }
    ws.current.send(JSON.stringify({ type: 'audio_chunk', text: msg }));
    setTextInput('');
    Keyboard.dismiss();
  };

  // ── Helpers ──────────────────────────────────────────────────────────────────
  const fmtMetric = (v) => (v == null ? '—' : parseFloat(v).toFixed(2));

  // ══════════════════════════════════════════════════════════════════════════════
  //  RENDER
  // ══════════════════════════════════════════════════════════════════════════════
  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.bg} />



      {/* Reconnect banner */}
      {isReconnecting && (
        <View style={styles.reconnectBanner}>
          <ActivityIndicator size="small" color="#fff" />
          <Text style={styles.reconnectText}>Connection lost — Reconnecting…</Text>
        </View>
      )}

      {/* ── Horizontal layout: Sidebar | Chat ─────────────────────────────── */}
      <View style={styles.mainRow}>

        {/* ════════════ LEFT SIDEBAR — Patient Vision Panel ════════════════ */}
        <View style={[styles.sidebar, { width: SIDEBAR_W }]}>

          <View style={styles.cameraMonitorContainer}>
            {(!securityAlertVisible && permission?.granted) ? (
              <CameraView
                key={`camera-${cameraRefreshKey}`}
                ref={cameraRef}
                style={styles.cameraMonitor}
                facing="front"
                zoom={0}
                mute={true}
                onCameraReady={() => {
                  console.log("Background Camera READY");
                  isCameraReady.current = true;
                }}
                onMountError={(err) => {
                  console.error("Background Camera mount error:", err);
                  isCameraReady.current = false;
                }}
              />
            ) : (
              <View style={[styles.cameraMonitor, { backgroundColor: '#111', justifyContent: 'center', alignItems: 'center' }]}>
                {securityAlertVisible ? (
                  <Shield size={24} color={Colors.rose} opacity={0.5} />
                ) : (
                  <ActivityIndicator size="small" color={Colors.indigo} />
                )}
              </View>
            )}
            <View style={styles.cameraOverlay}>
              <View style={styles.liveBadge}>
                <Animated.View style={[styles.liveDot, { backgroundColor: Colors.rose, opacity: blinkAnim }]} />
                <Text style={[styles.liveText]}>SECURE</Text>
              </View>
              {/* Face alignment guide */}
              <View style={styles.sidebarFaceGuide} />
            </View>
          </View>

          {/* Patient emotion card */}
          <EmotionCard
            label="PATIENT MOOD"
            emotion={patientEmotion}
            pulse
          />

          {/* Divider */}
          <View style={styles.divider} />

          {/* Section header */}
          <Text style={styles.sectionHeader}>BIO METRICS</Text>

          {/* Eye strain bar */}
          <MetricBar
            icon={<Eye size={9} color={Colors.indigo} />}
            label="EYE STRAIN"
            value={fmtMetric(eyeStrain)}
            warn={parseFloat(eyeStrain) > 0.7}
          />

          {/* Lip tension bar */}
          <MetricBar
            icon={<Zap size={9} color={Colors.amber} />}
            label="LIP TENSION"
            value={fmtMetric(lipTension)}
            warn={parseFloat(lipTension) > 0.7}
          />

          {/* Divider */}
          <View style={styles.divider} />

          {/* Section header */}
          <Text style={styles.sectionHeader}>DISTRESS</Text>

          {/* Stress flag */}
          <View style={[styles.flagRow, stressDetected && styles.flagRowActive]}>
            <Activity size={11} color={stressDetected ? Colors.rose : Colors.textMuted} />
            <Text style={[styles.flagText, stressDetected && { color: Colors.rose }]}>
              STRESS
            </Text>
            <View style={[styles.flagPill, stressDetected && styles.flagPillActive]}>
              <Text style={styles.flagPillText}>{stressDetected ? 'YES' : 'OK'}</Text>
            </View>
          </View>

          {/* Pain flag */}
          <View style={[styles.flagRow, painDetected && styles.flagRowActive]}>
            <HeartPulse size={11} color={painDetected ? Colors.rose : Colors.textMuted} />
            <Text style={[styles.flagText, painDetected && { color: Colors.rose }]}>
              PAIN
            </Text>
            <View style={[styles.flagPill, painDetected && styles.flagPillActive]}>
              <Text style={styles.flagPillText}>{painDetected ? 'YES' : 'OK'}</Text>
            </View>
          </View>

          {/* Divider */}
          {securityMismatchCount > 0 && <View style={styles.divider} />}

          {/* Security chip */}
          {securityMismatchCount > 0 && (
            <View style={[styles.secChip, sessionRestricted && styles.secChipLocked]}>
              <Shield size={10} color="#fff" />
              <Text style={styles.secChipText}>
                {sessionRestricted ? 'LOCKED' : `${securityMismatchCount} ALERT${securityMismatchCount > 1 ? 'S' : ''}`}
              </Text>
            </View>
          )}

          {/* Spacer to push content up */}
          <View style={{ flex: 1 }} />

          {/* Brain icon footer */}
          <Brain size={16} color="rgba(99,102,241,0.3)" style={{ marginBottom: 8 }} />
        </View>

        {/* ════════════ CHAT COLUMN ═════════════════════════════════════════ */}
        <KeyboardAvoidingView
          style={styles.chatColumn}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
        >
          {/* Chat header */}
          <View style={styles.chatHeader}>
            <View style={styles.headerPatientAvatar}>
              <User color={Colors.indigo} size={18} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.chatTitle} numberOfLines={1}>
                {patient?.name || 'Consultation'}
              </Text>
              <Text style={styles.chatSubtitle}>AI-Assisted Medical Session</Text>
            </View>
            {/* Waveform indicator in header */}
            <View style={styles.headerWave}>
              {(isMicActive || isAiSpeaking) && (
                <AnimatedWaveform
                  active
                  color={isMicActive ? Colors.emerald : Colors.indigo}
                />
              )}
            </View>
          </View>

          {/* Messages list */}
          <ScrollView
            ref={chatScrollRef}
            style={styles.chatScroll}
            contentContainerStyle={styles.chatScrollContent}
            showsVerticalScrollIndicator={false}
          >
            {messages.length === 0 && (
              <View style={styles.emptyState}>
                <Image
                  source={doctorAvatar}
                  style={styles.emptyDoctorAvatar}
                />
                <Text style={styles.emptyTitle}>Session Started</Text>
                <Text style={styles.emptySub}>
                  Use the mic or keyboard below to begin the consultation.
                </Text>
              </View>
            )}

            {messages.map((m, i) => <ChatBubble key={i} msg={m} />)}

            {isAiSpeaking && (
              <View style={[cbStyles.wrapper, cbStyles.botWrapper]}>
                <View style={cbStyles.avatar}>
                  <Image source={doctorAvatar} style={cbStyles.avatarImage} />
                </View>
                <View style={[cbStyles.botBubble, { padding: 12 }]}>
                  <AnimatedWaveform active color={Colors.indigo} />
                </View>
              </View>
            )}

            <View style={{ height: 10 }} />
          </ScrollView>

          {/* AI status banner */}
          <AIStatusBanner phase={currentPhase} />

          {/* Symptoms tray — only shown when there are symptoms */}
          {symptoms.length > 0 && (
            <View style={styles.symptomsTray}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {symptoms.map((s) => (
                  <View key={s} style={styles.symptomBadge}>
                    <Text style={styles.symptomText}>{s}</Text>
                  </View>
                ))}
              </ScrollView>
            </View>
          )}

          {/* Text input */}
          {isTextMode && (
            <View style={styles.textInputRow}>
              <TextInput
                style={styles.textInputField}
                placeholder="Type your response…"
                placeholderTextColor={Colors.textMuted}
                value={textInput}
                onChangeText={setTextInput}
                multiline
                maxLength={500}
                returnKeyType="send"
                onSubmitEditing={sendTextMessage}
                blurOnSubmit={false}
              />
              <TouchableOpacity
                style={[styles.sendBtn, !textInput.trim() && styles.sendBtnDisabled]}
                onPress={sendTextMessage}
                disabled={!textInput.trim()}
              >
                <Send color={textInput.trim() ? '#fff' : Colors.textMuted} size={16} />
              </TouchableOpacity>
            </View>
          )}

          {/* Toolbar */}
          <View style={styles.toolbar}>
            <TouchableOpacity
              style={[styles.toolBtn, isMuted && styles.mutedBtn]}
              onPress={() => setIsMuted(!isMuted)}
            >
              <Text style={styles.toolIcon}>{isMuted ? '🔇' : '🔊'}</Text>
            </TouchableOpacity>

            {/* Mic — prominent CTA */}
            <TouchableOpacity
              style={[styles.micBtn, isMicActive && styles.micBtnActive]}
              onPress={() => setIsMicActive(!isMicActive)}
            >
              {isMicActive
                ? <Mic color="#fff" size={22} />
                : <MicOff color={Colors.textSecondary} size={22} />}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.toolBtn, isTextMode && styles.activeText]}
              onPress={() => { setIsTextMode(!isTextMode); setTextInput(''); Keyboard.dismiss(); }}
            >
              <Text style={styles.toolIcon}>⌨️</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.toolBtn, styles.endBtn]}
              onPress={() => navigation.goBack()}
            >
              <LogOut color={Colors.rose} size={18} />
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </View>

      {/* Security overlay */}
      <SecurityAlertOverlay
        visible={securityAlertVisible}
        mismatchCount={securityMismatchCount}
        score={securityScore}
        restricted={sessionRestricted}
        patientId={patient?.id}
        sessionId={sessionId}
        onDismiss={() => {
          isCameraReady.current = false;
          setSecurityAlertVisible(false);
          setCameraRefreshKey(k => k + 1);
        }}
        onVerified={() => {
          isCameraReady.current = false;
          setSecurityAlertVisible(false);
          setSessionRestricted(false);
          setSecurityMismatchCount(0);
          setCameraRefreshKey(k => k + 1);
          
          // Notify WebSocket to reset its internal mismatch counters
          if (ws.current && ws.current.readyState === WebSocket.OPEN) {
            ws.current.send(JSON.stringify({ type: 'resolve_security' }));
          }

          setMessages(prev => [...prev, {
            role: 'status',
            text: '✅ Identity re-verified. Consultation access restored.',
          }]);
        }}
        onEndSession={() => {
          setSecurityAlertVisible(false);
          navigation.goBack();
        }}
      />
      {/* ── Usage Limit Overlay ────────────────────────────────────────────────── */}
      <AccessLockedModal 
        visible={accessLockedVisible} 
        onBack={() => navigation.goBack()} 
      />
      {/* ───────────────────────────────────────────────────────────────────── */}
    </View>
  );
};

// ══════════════════════════════════════════════════════════════════════════════
//  STYLES
// ══════════════════════════════════════════════════════════════════════════════
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bg },



  reconnectBanner: {
    position: 'absolute', top: 0, left: 0, right: 0, zIndex: 999,
    backgroundColor: Colors.rose, flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center', paddingVertical: 8, gap: 8,
  },
  reconnectText: { color: '#fff', fontSize: 12, fontWeight: 'bold' },

  /* Layout */
  mainRow: { flex: 1, flexDirection: 'row' },

  /* ══ SIDEBAR ══ */
  sidebar: {
    backgroundColor: '#080814',
    borderRightWidth: 1,
    borderRightColor: 'rgba(99,102,241,0.18)',
    alignItems: 'center',
    paddingTop: Platform.OS === 'ios' ? 54 : 32,
    paddingBottom: 16,
    paddingHorizontal: 8,
    gap: 0,
  },

  cameraMonitorContainer: {
    width: SIDEBAR_W - 16,
    height: SIDEBAR_W - 16, // Perfect 1:1 circle
    borderRadius: (SIDEBAR_W - 16) / 2,
    overflow: 'hidden',
    marginBottom: 16,
    backgroundColor: '#000',
    borderWidth: 2,
    borderColor: 'rgba(99,102,241,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    // Glow effect
    shadowColor: Colors.indigo,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 5,
  },
  cameraMonitor: {
    width: '100%',
    height: '100%',
  },
  samplingCamera: { 
    width: 1, 
    height: 1, 
    opacity: 0.01, 
    position: 'absolute', 
    bottom: 0, 
    right: 0, 
    overflow: 'hidden' 
  },
  sidebarFaceGuide: {
    position: 'absolute',
    top: '15%',
    left: '15%',
    right: '15%',
    bottom: '15%',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    borderRadius: 999,
    borderStyle: 'dashed',
  },
  cameraOverlay: {
    position: 'absolute',
    top: 6,
    left: 6,
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  liveDot:  { width: 5, height: 5, borderRadius: 2.5, backgroundColor: Colors.rose },
  liveText: { color: '#fff', fontSize: 7, fontWeight: '900', letterSpacing: 0.5 },

  divider: {
    width: '85%', height: 1,
    backgroundColor: 'rgba(255,255,255,0.06)',
    marginVertical: 8,
  },

  sectionHeader: {
    color: 'rgba(255,255,255,0.25)', fontSize: 8,
    fontWeight: '800', letterSpacing: 1,
    alignSelf: 'flex-start', marginBottom: 6,
  },

  /* Flag rows */
  flagRow: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 8, padding: 5, marginBottom: 5,
    width: '100%',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
  },
  flagRowActive: {
    backgroundColor: 'rgba(244,63,94,0.08)',
    borderColor: 'rgba(244,63,94,0.25)',
  },
  flagText: { color: Colors.textMuted, fontSize: 8, fontWeight: '700', flex: 1 },
  flagPill: {
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderRadius: 4, paddingHorizontal: 4, paddingVertical: 1,
  },
  flagPillActive: { backgroundColor: 'rgba(244,63,94,0.3)' },
  flagPillText: { color: '#fff', fontSize: 7, fontWeight: '800' },

  /* Security */
  secChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: 'rgba(245,158,11,0.85)',
    paddingHorizontal: 7, paddingVertical: 4, borderRadius: 8, marginTop: 4,
  },
  secChipLocked: { backgroundColor: 'rgba(244,63,94,0.85)' },
  secChipText:   { color: '#fff', fontSize: 8, fontWeight: '800' },

  /* ══ CHAT COLUMN ══ */
  chatColumn: { width: SCREEN_W - SIDEBAR_W, flexDirection: 'column' },

  chatHeader: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 14,
    paddingTop: Platform.OS === 'ios' ? 54 : 32,
    paddingBottom: 12,
    backgroundColor: '#09091a',
    borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  headerDoctorAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginRight: 10,
    borderWidth: 1,
    borderColor: 'rgba(99,102,241,0.4)',
  },
  headerPatientAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginRight: 10,
    borderWidth: 1,
    borderColor: 'rgba(99,102,241,0.4)',
    backgroundColor: 'rgba(99,102,241,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  chatTitle:    { color: Colors.textPrimary, fontSize: 15, fontWeight: '700' },
  chatSubtitle: { color: Colors.textMuted, fontSize: 10, marginTop: 1 },
  headerWave:   { marginLeft: 8 },

  chatScroll:        { flex: 1 },
  chatScrollContent: { paddingVertical: 14 },

  emptyState: { alignItems: 'center', marginTop: 50, paddingHorizontal: 24 },
  emptyDoctorAvatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: 'rgba(99,102,241,0.6)',
    // Glow/elevation
    shadowColor: Colors.indigo,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
  },
  emptyTitle: { color: Colors.textSecondary, fontSize: 14, fontWeight: '700', marginBottom: 4 },
  emptySub:   { color: Colors.textMuted, fontSize: 11, textAlign: 'center', lineHeight: 17 },

  /* Symptoms */
  symptomsTray: {
    paddingHorizontal: 12, paddingVertical: 7,
    borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.05)',
    backgroundColor: '#09091a',
  },
  symptomBadge: {
    backgroundColor: 'rgba(16,185,129,0.09)', paddingHorizontal: 9, paddingVertical: 4,
    borderRadius: 7, marginRight: 6, borderWidth: 1, borderColor: 'rgba(16,185,129,0.28)',
  },
  symptomText: { color: Colors.emerald, fontSize: 11, fontWeight: '600' },

  /* Text input */
  textInputRow: {
    flexDirection: 'row', alignItems: 'flex-end',
    marginHorizontal: 10, marginBottom: 8,
    backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 14,
    borderWidth: 1, borderColor: 'rgba(99,102,241,0.25)',
    paddingHorizontal: 12, paddingVertical: 8, gap: 8,
  },
  textInputField: {
    flex: 1, color: '#f1f5f9', fontSize: 13, lineHeight: 19,
    maxHeight: 90, paddingTop: 0, paddingBottom: 0,
  },
  sendBtn:        { width: 32, height: 32, borderRadius: 16, backgroundColor: Colors.indigo, justifyContent: 'center', alignItems: 'center' },
  sendBtnDisabled:{ backgroundColor: 'rgba(99,102,241,0.2)' },

  /* Toolbar */
  toolbar: {
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center',
    paddingBottom: Platform.OS === 'ios' ? 30 : 18, paddingTop: 10, gap: 14,
    borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.05)',
    backgroundColor: '#09091a',
  },
  toolBtn: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.05)',
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
  },
  micBtn: {
    width: 58, height: 58, borderRadius: 29,
    backgroundColor: 'rgba(255,255,255,0.06)',
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 1.5, borderColor: 'rgba(99,102,241,0.3)',
  },
  micBtnActive: { backgroundColor: Colors.indigo, borderColor: Colors.indigo, ...Shadows.glow },
  mutedBtn:     { backgroundColor: 'rgba(255,255,255,0.1)' },
  activeText:   { backgroundColor: Colors.indigo, ...Shadows.glow },
  endBtn:       { backgroundColor: 'rgba(244,63,94,0.06)', borderColor: Colors.rose },
  toolIcon:     { fontSize: 17 },
});

export default ConsultationScreen;
