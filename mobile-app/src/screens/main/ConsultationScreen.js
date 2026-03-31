import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, Dimensions, ActivityIndicator } from 'react-native';
import { CameraView } from 'expo-camera';
import { useAudioPlayer, useAudioRecorder, createAudioPlayer, requestRecordingPermissionsAsync, AudioModule, RecordingPresets } from 'expo-audio';
import * as FileSystem from 'expo-file-system';
import { Mic, MicOff, LogOut, Activity, AlertCircle, MessageSquare } from 'lucide-react-native';
import { Colors, Typography, Spacing, Radii, Shadows } from '../../theme';
import GlassCard from '../../components/GlassCard';
import AnimatedWaveform from '../../components/AnimatedWaveform';
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

  const ws = useRef(null);
  const cameraRef = useRef(null);
  const audioRecorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const recordingRef = useRef(null);
  const frameInterval = useRef(null);

  useEffect(() => {
    connectWebSocket();
    startVideoSampling();
    setupAudio();

    return () => {
      if (ws.current) ws.current.close();
      if (frameInterval.current) clearInterval(frameInterval.current);
      // cleanup done by hooks mainly, but let's be explicit if needed
    };
  }, []);

  useEffect(() => {
    if (isMicActive) {
      startRecording();
    } else {
      stopRecording();
    }
  }, [isMicActive]);

  const connectWebSocket = () => {
    const url = buildWsUrl(sessionId);
    ws.current = new WebSocket(url);

    ws.current.onopen = () => {
      ws.current.send(JSON.stringify({
        type: 'start',
        patient_id: patient.id,
        patient_name: patient.name,
        language: language
      }));
    };

    ws.current.onmessage = async (e) => {
      const data = JSON.parse(e.data);
      
      switch (data.type) {
        case 'question':
          setMessages(prev => [...prev, { role: 'bot', text: data.text }]);
          setSymptoms(data.symptoms_so_far || []);
          break;
        case 'transcript':
          setMessages(prev => [...prev, { role: 'patient', text: data.text }]);
          break;
        case 'audio':
          if (!isMuted) playTTS(data.audio_b64);
          break;
        case 'alert':
          setMetrics(prev => ({ ...prev, stress: true }));
          break;
        case 'processing':
          setIsAiProcessing(true);
          setMessages(prev => [...prev, { role: 'bot', text: data.text }]);
          break;
        case 'finalize':
          setIsAiProcessing(false);
          setIsFinalizing(true);
          setTimeout(() => {
            navigation.replace('Results', { diagnosis: data.diagnosis, sessionId });
          }, 2000);
          break;
      }
    };
  };

  const startVideoSampling = () => {
    frameInterval.current = setInterval(async () => {
      if (cameraRef.current && ws.current && ws.current.readyState === WebSocket.OPEN) {
        try {
          const photo = await cameraRef.current.takePictureAsync({ base64: true, quality: 0.3, scale: 0.5 });
          ws.current.send(JSON.stringify({ type: 'video_frame', image_base64: photo.base64 }));
        } catch (e) {}
      }
    }, 3000);
  };

  const setupAudio = async () => {
    const { status } = await requestRecordingPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Audio permissions are required for clinical analysis.');
    }
  };

  const playTTS = async (base64Audio) => {
    const uri = `${FileSystem.cacheDirectory}temp_audio.mp3`;
    await FileSystem.writeAsStringAsync(uri, base64Audio, { encoding: 'base64' });
    
    // In SDK 55 expo-audio, useAudioPlayer handles the sound
    // This part might need better React logic, but let's try a simple version
    // Actually you can't easily dynamic-load with useAudioPlayer in a function
    // But you can use AudioModule to create a player
    const player = createAudioPlayer(uri);
    player.play();
    setIsAiSpeaking(true);
    
    // Listen for completion
    // player.on('playbackFinished', () => setIsAiSpeaking(false));
  };

  const startRecording = async () => {
    try {
      if (!audioRecorder.isRecording) {
        await audioRecorder.prepareToRecordAsync();
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
        const base64Audio = await FileSystem.readAsStringAsync(uri, {
          encoding: 'base64',
        });
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
        <ScrollView style={styles.chatArea}>
          {messages.map((m, i) => (
            <View key={i} style={[styles.msgWrapper, m.role === 'bot' ? styles.botMsg : styles.patientMsg]}>
              <View style={[styles.bubble, m.role === 'bot' ? styles.botBubble : styles.patientBubble]}>
                <Text style={styles.msgText}>{m.text}</Text>
              </View>
            </View>
          ))}
          {isAiSpeaking && (
            <View style={styles.botMsg}>
              <AnimatedWaveform active color={Colors.indigo} />
            </View>
          )}
          {isAiProcessing && (
            <View style={[styles.botMsg, { marginLeft: 20, marginVertical: 10 }]}>
              <ActivityIndicator color={Colors.indigo} />
            </View>
          )}
        </ScrollView>

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
});

export default ConsultationScreen;
