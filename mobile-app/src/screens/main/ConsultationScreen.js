import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, Dimensions, ActivityIndicator } from 'react-native';
import { CameraView } from 'expo-camera';
import { useAudioPlayer, useAudioPlayerStatus, useAudioRecorder, requestRecordingPermissionsAsync, RecordingPresets } from 'expo-audio';
import { File, Paths } from 'expo-file-system';
import { Mic, MicOff, LogOut, Activity, AlertCircle, MessageSquare } from 'lucide-react-native';
import { Colors, Typography, Spacing, Radii, Shadows } from '../../theme';
import GlassCard from '../../components/GlassCard';
import AnimatedWaveform from '../../components/AnimatedWaveform';
import AIStatusBanner from '../../components/AIStatusBanner';
import { buildWsUrl } from '../../api/report';

const ConsultationScreen = ({ route, navigation }) => {
  const { sessionId, language, patient } = route.params;
  
  const [messages, setMessages] = useState([]);
  const [symptoms, setSymptoms] = useState([]);
  const [isMicActive, setIsMicActive] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isAiSpeaking, setIsAiSpeaking] = useState(false);
  const [isAiProcessing, setIsAiProcessing] = useState(false);
  const [metrics, setMetrics] = useState({ emotion: 'neutral', stress: false, pain: false });
  const [isFinalizing, setIsFinalizing] = useState(false);
  const [isReconnecting, setIsReconnecting] = useState(false);
  // Unified phase for AIStatusBanner: null | 'listening' | 'processing' | 'speaking' | 'finalizing' | 'reconnecting'
  const [currentPhase, setCurrentPhase] = useState(null);
  const reconnectTimeout = useRef(null);
  const reconnectAttempts = useRef(0);
  const heartbeatInterval = useRef(null);
  const chatScrollRef = useRef(null);

  const ws = useRef(null);
  const cameraRef = useRef(null);
  const audioRecorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const recordingRef = useRef(null);
  const frameInterval = useRef(null);
  const player = useAudioPlayer(null);
  const playerStatus = useAudioPlayerStatus(player);

  const isMutedRef = useRef(isMuted);
  useEffect(() => {
    isMutedRef.current = isMuted;
  }, [isMuted]);

  const playTTSRef = useRef(null);
  
  useEffect(() => {
    setIsAiSpeaking(playerStatus.playing);
    // Sync speaking phase
    if (playerStatus.playing) {
      setCurrentPhase('speaking');
    } else if (!isAiProcessing && !isReconnecting && !isFinalizing) {
      setCurrentPhase(null);
    }
  }, [playerStatus.playing]);

  useEffect(() => {
    connectWebSocket();
    startVideoSampling();
    setupAudio();

    return () => {
      if (ws.current) ws.current.close();
      if (frameInterval.current) clearInterval(frameInterval.current);
      if (reconnectTimeout.current) clearTimeout(reconnectTimeout.current);
      if (heartbeatInterval.current) clearInterval(heartbeatInterval.current);
    };
  }, []);

  useEffect(() => {
    if (isMicActive) {
      setCurrentPhase('listening');
      startRecording();
    } else {
      if (!isAiProcessing && !isAiSpeaking && !isFinalizing && !isReconnecting) {
        setCurrentPhase(null);
      }
      stopRecording();
    }
  }, [isMicActive]);

  // Auto-scroll to bottom when messages update
  useEffect(() => {
    if (chatScrollRef.current && messages.length > 0) {
      setTimeout(() => {
        chatScrollRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages, currentPhase]);

  const connectWebSocket = () => {
    const url = buildWsUrl(sessionId);
    console.log(`Connecting to WebSocket: ${url}`);
    
    if (ws.current) {
        ws.current.close();
    }

    ws.current = new WebSocket(url);

    ws.current.onopen = () => {
      console.log('WebSocket Connected');
      setIsReconnecting(false);
      setCurrentPhase(null);
      reconnectAttempts.current = 0;
      
      // Start heartbeat to keep connection alive
      heartbeatInterval.current = setInterval(() => {
        if (ws.current && ws.current.readyState === WebSocket.OPEN) {
          ws.current.send(JSON.stringify({ type: 'ping' }));
        }
      }, 20000);

      ws.current.send(JSON.stringify({
        type: 'start',
        patient_id: patient.id,
        patient_name: patient.name,
        language: language
      }));
    };

    ws.current.onmessage = (e) => {
      const data = JSON.parse(e.data);
      
      switch (data.type) {
        case 'question':
          setIsAiProcessing(false);
          setCurrentPhase(null); // will flip to 'speaking' when audio starts
          setMessages(prev => [...prev, { role: 'bot', text: data.text }]);
          if (data.symptoms_so_far) {
            setSymptoms(data.symptoms_so_far);
          }
          if (data.audio_b64 && !isMutedRef.current && playTTSRef.current) {
            playTTSRef.current(data.audio_b64);
          }
          break;
        case 'transcript':
          setIsAiProcessing(true);
          setCurrentPhase('processing');
          setMessages(prev => [...prev, { role: 'patient', text: data.text }]);
          break;
        case 'audio':
          setIsAiProcessing(false);
          if (!isMutedRef.current && playTTSRef.current) {
            playTTSRef.current(data.audio_b64);
          }
          break;
        case 'alert':
          setMetrics(prev => ({ ...prev, stress: true }));
          break;
        case 'processing':
          setIsAiProcessing(true);
          setCurrentPhase('processing');
          if (data.text) {
            setMessages(prev => [...prev, { role: 'status', text: data.text }]);
          }
          break;
        case 'finalize':
          setIsAiProcessing(false);
          setIsFinalizing(true);
          setCurrentPhase('finalizing');
          setTimeout(() => {
            navigation.replace('Results', { diagnosis: data.diagnosis, sessionId });
          }, 2000);
          break;
      }
    };


    ws.current.onerror = (e) => {
      console.error('WebSocket Error:', e.message);
    };

    ws.current.onclose = (e) => {
      console.log(`WebSocket Closed: ${e.code} ${e.reason}`);
      if (heartbeatInterval.current) clearInterval(heartbeatInterval.current);
      
      if (!isFinalizing && reconnectAttempts.current < 5) {
        setIsReconnecting(true);
        setCurrentPhase('reconnecting');
        const delay = Math.min(1000 * Math.pow(2, reconnectAttempts.current), 10000);
        reconnectAttempts.current += 1;
        console.log(`Attempting to reconnect in ${delay}ms (Attempt ${reconnectAttempts.current})`);
        reconnectTimeout.current = setTimeout(() => {
          connectWebSocket();
        }, delay);
      }
    };
  };

  const startVideoSampling = () => {
    frameInterval.current = setInterval(async () => {
      if (cameraRef.current && ws.current && ws.current.readyState === WebSocket.OPEN) {
        try {
          const photo = await cameraRef.current.takePictureAsync({ base64: true, quality: 0.2, scale: 0.4 });
          ws.current.send(JSON.stringify({ type: 'video_frame', image_base64: photo.base64 }));
        } catch (e) {}
      }
    }, 5000);
  };

  const setupAudio = async () => {
    const { status } = await requestRecordingPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Audio permissions are required for clinical analysis.');
    }
  };

  const playTTS = React.useCallback(async (base64Audio) => {
    try {
      const file = new File(Paths.cache, 'temp_audio.mp3');
      await file.write(base64Audio, { encoding: 'base64' });
      
      if (player && !player.isReleased) {
        player.replace(file.uri);
        player.play();
      }
    } catch (e) {
      console.error('Error in playTTS:', e);
    }
  }, [player]);


  useEffect(() => {
    playTTSRef.current = playTTS;
  }, [player]);

  const startRecording = async () => {
    try {
      if (!audioRecorder.isRecording) {
        if (audioRecorder.prepareToRecordAsync) {
            await audioRecorder.prepareToRecordAsync();
        }
        audioRecorder.record();
      }
    } catch (err) {
      console.error('Failed to start recording', err);
    }
  };

  const stopRecording = async () => {
    if (!audioRecorder.isRecording) return;
    try {
      await audioRecorder.stop();
      const uri = audioRecorder.uri;

      if (uri && ws.current && ws.current.readyState === WebSocket.OPEN) {
        const file = new File(uri);
        const base64Audio = await file.base64();
        ws.current.send(JSON.stringify({
          type: 'audio_chunk',
          audio_b64: base64Audio
        }));
      }
    } catch (err) {
      console.error('Failed to stop recording', err);
    }
  };

  return (
    <View style={styles.container}>
      {isReconnecting && (
        <View style={styles.reconnectBanner}>
          <ActivityIndicator size="small" color="#fff" />
          <Text style={styles.reconnectText}>Connection lost. Reconnecting...</Text>
        </View>
      )}
      <View style={styles.videoSection}>
        <CameraView ref={cameraRef} style={styles.camera} facing="front" />
        <View style={styles.metricsOverlay}>
          <GlassCard style={styles.metricCard}>
            <Activity color={Colors.emerald} size={16} />
            <Text style={styles.metricValue}>{metrics.emotion.toUpperCase()}</Text>
          </GlassCard>
          {metrics.stress && (
            <View style={styles.alarmBadge}>
              <AlertCircle color="#fff" size={14} />
              <Text style={styles.alarmText}>STRESS DETECTED</Text>
            </View>
          )}
        </View>
      </View>

      <View style={styles.interactionSection}>
        <ScrollView
          ref={chatScrollRef}
          style={styles.chatArea}
          showsVerticalScrollIndicator={false}
        >
          {messages.map((m, i) => {
            if (m.role === 'status') {
              return (
                <View key={i} style={styles.statusRow}>
                  <Text style={styles.statusRowText}>{m.text}</Text>
                </View>
              );
            }
            return (
              <View key={i} style={[styles.msgWrapper, m.role === 'bot' ? styles.botMsg : styles.patientMsg]}>
                <View style={[styles.bubble, m.role === 'bot' ? styles.botBubble : styles.patientBubble]}>
                  <Text style={styles.msgText}>{m.text}</Text>
                </View>
              </View>
            );
          })}
          {isAiSpeaking && (
            <View style={styles.botMsg}>
              <AnimatedWaveform active color={Colors.indigo} />
            </View>
          )}
          {/* spacer so banner doesn't overlap last message */}
          <View style={{ height: 8 }} />
        </ScrollView>

        {/* Animated status banner */}
        <AIStatusBanner phase={currentPhase} />

        <View style={styles.symptomsTray}>
          <View style={styles.trayHeader}>
            <MessageSquare size={14} color={Colors.textSecondary} />
            <Text style={styles.trayTitle}>Detected Symptoms</Text>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {symptoms.map(s => (
              <View key={s} style={styles.symptomBadge}>
                <Text style={styles.symptomText}>{s}</Text>
              </View>
            ))}
            {symptoms.length === 0 && <Text style={styles.noSympText}>Listening for clinical markers...</Text>}
          </ScrollView>
        </View>

        {isMicActive && !isAiSpeaking && (
          <View style={{ marginBottom: 10 }}>
            <AnimatedWaveform active color={Colors.emerald} />
          </View>
        )}

        <View style={styles.toolbar}>
           <TouchableOpacity style={[styles.toolBtn, isMuted && styles.mutedBtn]} onPress={() => setIsMuted(!isMuted)}>
            <Text style={styles.toolIcon}>{isMuted ? '🔇' : '🔊'}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.toolBtn, isMicActive && styles.activeMic]} onPress={() => setIsMicActive(!isMicActive)}>
            {isMicActive ? <Mic color="#fff" /> : <MicOff color={Colors.textSecondary} />}
          </TouchableOpacity>
          <TouchableOpacity style={[styles.toolBtn, styles.endBtn]} onPress={() => navigation.goBack()}>
            <LogOut color={Colors.rose} />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  videoSection: { height: '40%', backgroundColor: '#000' },
  camera: { flex: 1 },
  metricsOverlay: { position: 'absolute', top: 50, left: 20, right: 20, flexDirection: 'row', justifyContent: 'space-between' },
  metricCard: { padding: 10, minWidth: 100, alignItems: 'center', flexDirection: 'row', gap: 6 },
  metricValue: { color: Colors.emerald, fontSize: 13, fontWeight: 'bold' },
  alarmBadge: { backgroundColor: Colors.rose, paddingHorizontal: 15, paddingVertical: 8, borderRadius: 20, flexDirection: 'row', alignItems: 'center', gap: 6 },
  alarmText: { color: '#fff', fontSize: 10, fontWeight: 'bold' },
  interactionSection: { flex: 1, backgroundColor: Colors.bg, borderTopLeftRadius: 30, borderTopRightRadius: 30, marginTop: -30, paddingTop: 20 },
  chatArea: { flex: 1, paddingHorizontal: 20 },
  msgWrapper: { width: '100%', marginVertical: 8 },
  botMsg: { alignItems: 'flex-start' },
  patientMsg: { alignItems: 'flex-end' },
  bubble: { maxWidth: '85%', padding: 14, borderRadius: 20 },
  botBubble: { backgroundColor: 'rgba(255,255,255,0.04)', borderBottomLeftRadius: 4, borderWidth: 1, borderColor: 'rgba(99,102,241,0.1)' },
  patientBubble: { backgroundColor: 'rgba(16,185,129,0.15)', borderBottomRightRadius: 4, borderWidth: 1, borderColor: 'rgba(16,185,129,0.2)' },
  msgText: { color: '#f1f5f9', fontSize: 15, lineHeight: 22 },
  symptomsTray: { padding: 20, borderTopWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  trayHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 },
  trayTitle: { color: Colors.textSecondary, fontSize: 11, fontWeight: 'bold', textTransform: 'uppercase' },
  symptomBadge: { backgroundColor: 'rgba(16,185,129,0.08)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10, marginRight: 8, borderWidth: 1, borderColor: 'rgba(16,185,129,0.3)' },
  symptomText: { color: Colors.emerald, fontSize: 12, fontWeight: '500' },
  noSympText: { color: Colors.textMuted, fontSize: 12, fontStyle: 'italic' },
  toolbar: { flexDirection: 'row', justifyContent: 'center', paddingBottom: 40, gap: 20 },
  toolBtn: { width: 56, height: 56, borderRadius: 28, backgroundColor: 'rgba(255,255,255,0.05)', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  activeMic: { backgroundColor: Colors.indigo, ...Shadows.glow },
  mutedBtn: { backgroundColor: 'rgba(255,255,255,0.1)' },
  endBtn: { backgroundColor: 'rgba(244,63,94,0.05)', borderColor: Colors.rose },
  toolIcon: { fontSize: 20 },
  reconnectBanner: { backgroundColor: Colors.rose, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 10, gap: 10, position: 'absolute', top: 0, left: 0, right: 0, zIndex: 100 },
  reconnectText: { color: '#fff', fontSize: 12, fontWeight: 'bold' },
  statusRow: { alignSelf: 'center', marginVertical: 6, backgroundColor: 'rgba(99,102,241,0.08)', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 5, borderWidth: 1, borderColor: 'rgba(99,102,241,0.18)' },
  statusRowText: { color: Colors.textSecondary, fontSize: 11, fontStyle: 'italic' },
});

export default ConsultationScreen;
