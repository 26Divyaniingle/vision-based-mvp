import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ScrollView, ActivityIndicator, Alert, Switch
} from 'react-native';
import { useAudioRecorder, requestRecordingPermissionsAsync, RecordingPresets } from 'expo-audio';
import { File } from 'expo-file-system';
import { Mic, MicOff, ChevronLeft, Zap, Brain } from 'lucide-react-native';
import { Colors, Shadows } from '../../theme';
import { buildTranscriberWsUrl, stopConsultation } from '../../api/report';

// Supported language options
const LANGUAGES = ['English', 'Hinglish', 'Hindi', 'Marathi'];

const TranscriberScreen = ({ route, navigation }) => {
  const { consultationId, patientId } = route.params;

  const [transcript, setTranscript] = useState([]);
  const [isRecording, setIsRecording] = useState(true);
  const [status, setStatus] = useState('Initializing...');
  const [isFinalizing, setIsFinalizing] = useState(false);
  const [verbatim, setVerbatim] = useState(true);          // TRUE = Recorder mode (default)
  const [language, setLanguage] = useState('Hinglish');

  const ws = useRef(null);
  const audioRecorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const timeoutRef = useRef(null);
  const scrollRef = useRef(null);
  const isRecordingRef = useRef(true);
  const verbatimRef = useRef(true);
  const languageRef = useRef('Hinglish');

  // Keep refs in sync with state (used inside async recording loops)
  useEffect(() => { isRecordingRef.current = isRecording; }, [isRecording]);
  useEffect(() => { verbatimRef.current = verbatim; }, [verbatim]);
  useEffect(() => { languageRef.current = language; }, [language]);

  useEffect(() => {
    connectWS();
    setupAudio();
    return () => {
      if (ws.current) ws.current.close();
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      isRecordingRef.current = false;
    };
  }, []);

  useEffect(() => {
    isRecordingRef.current = isRecording;
    if (isRecording) {
      startRecordingCycle();
    } else {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    }
  }, [isRecording]);

  // When verbatim or language changes, tell the server immediately
  useEffect(() => {
    sendModeToServer(verbatim, language);
  }, [verbatim, language]);

  const connectWS = () => {
    const url = buildTranscriberWsUrl(consultationId);
    ws.current = new WebSocket(url);

    ws.current.onopen = () => {
      setStatus('🟢 Live Transcription Active');
      // Send initial mode on connect
      sendModeToServer(verbatimRef.current, languageRef.current);
    };

    ws.current.onmessage = (e) => {
      const data = JSON.parse(e.data);
      if (data.type === 'transcript_update') {
        setTranscript(prev => [
          ...prev,
          { speaker: data.speaker, text: data.text, verbatim: data.verbatim }
        ]);
        scrollRef.current?.scrollToEnd({ animated: true });
      }
      // mode_ack: server confirmed the mode change
    };

    ws.current.onclose = () => setStatus('🔴 Disconnected');
    ws.current.onerror = (e) => console.log('WS Error', e);
  };

  const sendModeToServer = (isVerbatim, lang) => {
    if (ws.current && ws.current.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify({
        type: 'set_mode',
        verbatim: isVerbatim,
        language: lang
      }));
    }
  };

  const setupAudio = async () => {
    const { status } = await requestRecordingPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Audio permissions are required for transcription.');
    }
  };

  const startRecordingCycle = async () => {
    if (!isRecordingRef.current) return;

    try {
      if (ws.current && ws.current.readyState === WebSocket.OPEN) {
        setStatus('🔴 Recording...');

        if (audioRecorder.prepareToRecordAsync && !audioRecorder.isPrepared) {
          await audioRecorder.prepareToRecordAsync();
        }

        if (!isRecordingRef.current) return;
        audioRecorder.record();

        // 4-second chunks for responsive, near-real-time transcription
        await new Promise(resolve => setTimeout(resolve, 4000));

        if (!isRecordingRef.current) return;

        if (audioRecorder.isRecording) {
          try {
            await audioRecorder.stop();
            const uri = audioRecorder.uri;
            if (uri) {
              // Process and send in background so next chunk starts immediately
              processAndSendAudio(uri, verbatimRef.current, languageRef.current);
            }
          } catch (stopErr) {
            console.log('Stop recording error:', stopErr);
          }
        }
      }
    } catch (err) {
      console.log('Recording cycle error:', err);
      setStatus('🟡 Retrying...');
    }

    if (isRecordingRef.current) {
      timeoutRef.current = setTimeout(startRecordingCycle, 100);
    }
  };

  const processAndSendAudio = async (uri, isVerbatim, lang) => {
    try {
      const file = new File(uri);
      const b64 = await file.base64();
      if (ws.current && ws.current.readyState === WebSocket.OPEN && isRecordingRef.current) {
        ws.current.send(JSON.stringify({
          type: 'audio_chunk',
          audio_b64: b64,
          verbatim: isVerbatim,
          language: lang,
        }));
      }
    } catch (err) {
      console.log('Error processing audio chunk:', err);
    }
  };

  const handleStop = async () => {
    setIsRecording(false);
    setIsFinalizing(true);
    setStatus('Finalizing Summary...');

    try {
      const res = await stopConsultation(consultationId);
      if (res.data?.consultation) {
        navigation.replace('ConsultationDetail', { consultation: res.data.consultation });
      } else {
        navigation.goBack();
      }
    } catch (err) {
      Alert.alert('Error', 'Failed to generate summary.');
      navigation.goBack();
    } finally {
      setIsFinalizing(false);
    }
  };

  const cycleLanguage = () => {
    const idx = LANGUAGES.indexOf(language);
    const next = LANGUAGES[(idx + 1) % LANGUAGES.length];
    setLanguage(next);
  };

  return (
    <View style={styles.container}>
      {/* ── Header ── */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <ChevronLeft color={Colors.textPrimary} size={24} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Smart Transcriber</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* ── Status ── */}
      <View style={styles.statusSection}>
        <Text style={[
          styles.statusText,
          status.includes('Live') || status.includes('Recording')
            ? { color: Colors.emerald }
            : { color: Colors.rose }
        ]}>
          {status}
        </Text>
        {isRecording && <View style={styles.recordingDot} />}
      </View>

      {/* ── Mode Controls ── */}
      <View style={styles.controlsBar}>
        {/* Verbatim Toggle */}
        <View style={styles.controlGroup}>
          {verbatim
            ? <Zap size={14} color={Colors.emerald} style={styles.modeIcon} />
            : <Brain size={14} color={Colors.indigo} style={styles.modeIcon} />
          }
          <Text style={styles.controlLabel}>
            {verbatim ? 'Recorder Mode' : 'Medical Mode'}
          </Text>
          <Switch
            value={verbatim}
            onValueChange={setVerbatim}
            trackColor={{ false: Colors.indigo, true: Colors.emerald }}
            thumbColor="#fff"
            style={{ transform: [{ scaleX: 0.8 }, { scaleY: 0.8 }] }}
          />
        </View>

        {/* Language Picker */}
        <TouchableOpacity style={styles.langBtn} onPress={cycleLanguage}>
          <Text style={styles.langBtnText}>{language}</Text>
        </TouchableOpacity>
      </View>

      {/* Mode description */}
      <Text style={styles.modeHint}>
        {verbatim
          ? '⚡ Recorder mode: captures every word exactly as spoken'
          : '🧠 Medical mode: identifies speakers & standardizes terms'}
      </Text>

      {/* ── Transcript Area ── */}
      <ScrollView
        ref={scrollRef}
        style={styles.transcriptArea}
        contentContainerStyle={{ paddingBottom: 20 }}
      >
        {transcript.length === 0 && (
          <Text style={styles.placeholderText}>Waiting for conversation to start...</Text>
        )}
        {transcript.map((item, index) => (
          <View key={index} style={[
            styles.line,
            item.verbatim ? styles.lineVerbatim : styles.lineMedical
          ]}>
            <Text style={item.speaker === 'Doctor' ? styles.doctorLabel : styles.speakerLabel}>
              {item.speaker}:
            </Text>
            <Text style={styles.lineText}>{item.text}</Text>
          </View>
        ))}
      </ScrollView>

      {/* ── Footer ── */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.stopBtn, isFinalizing && styles.disabledBtn]}
          onPress={handleStop}
          disabled={isFinalizing}
        >
          {isFinalizing ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <MicOff color="#fff" size={20} />
              <Text style={styles.stopBtnText}>Stop & Summarize</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a14', paddingTop: 60 },

  // Header
  header: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', paddingHorizontal: 20, marginBottom: 12
  },
  headerTitle: { color: '#fff', fontSize: 20, fontWeight: 'bold' },
  backBtn: { padding: 5 },

  // Status
  statusSection: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center', marginBottom: 12, gap: 8
  },
  statusText: { fontSize: 13, fontWeight: '600' },
  recordingDot: {
    width: 8, height: 8, borderRadius: 4,
    backgroundColor: Colors.rose
  },

  // Mode controls bar
  controlsBar: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', paddingHorizontal: 20,
    marginBottom: 6,
    backgroundColor: 'rgba(255,255,255,0.04)',
    paddingVertical: 10, borderRadius: 14,
    marginHorizontal: 16,
  },
  controlGroup: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  modeIcon: { marginRight: 2 },
  controlLabel: { color: '#ccc', fontSize: 13, fontWeight: '600' },
  langBtn: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 14, paddingVertical: 6,
    borderRadius: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)'
  },
  langBtnText: { color: '#fff', fontSize: 13, fontWeight: '700' },

  // Mode hint
  modeHint: {
    color: '#555', fontSize: 12, textAlign: 'center',
    marginBottom: 12, paddingHorizontal: 20
  },

  // Transcript
  transcriptArea: { flex: 1, paddingHorizontal: 16 },
  placeholderText: {
    color: '#555', textAlign: 'center',
    fontStyle: 'italic', marginTop: 50
  },
  line: {
    marginBottom: 12, padding: 12,
    borderRadius: 12, borderWidth: 1,
  },
  lineVerbatim: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderColor: 'rgba(255,255,255,0.06)'
  },
  lineMedical: {
    backgroundColor: 'rgba(99,102,241,0.06)',
    borderColor: 'rgba(99,102,241,0.15)'
  },
  doctorLabel: { color: Colors.indigo, fontSize: 12, fontWeight: 'bold', marginBottom: 4 },
  speakerLabel: { color: Colors.emerald, fontSize: 12, fontWeight: 'bold', marginBottom: 4 },
  lineText: { color: '#eee', fontSize: 15, lineHeight: 22 },

  // Footer
  footer: { padding: 20, paddingBottom: 40 },
  stopBtn: {
    backgroundColor: Colors.rose, flexDirection: 'row',
    alignItems: 'center', justifyContent: 'center',
    padding: 16, borderRadius: 16, gap: 10, ...Shadows.glow
  },
  stopBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  disabledBtn: { opacity: 0.5 },
});

export default TranscriberScreen;
