import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { useAudioRecorder, requestRecordingPermissionsAsync, RecordingPresets } from 'expo-audio';
import { File } from 'expo-file-system';
import { Mic, MicOff, LogOut, FileText, User, ChevronLeft } from 'lucide-react-native';
import { Colors, Shadows } from '../../theme';
import GlassCard from '../../components/GlassCard';
import { buildTranscriberWsUrl, stopConsultation } from '../../api/report';

const TranscriberScreen = ({ route, navigation }) => {
  const { consultationId, patientId } = route.params;
  
  const [transcript, setTranscript] = useState([]);
  const [isRecording, setIsRecording] = useState(true);
  const [status, setStatus] = useState('Initializing...');
  const [isFinalizing, setIsFinalizing] = useState(false);
  
  const ws = useRef(null);
  const audioRecorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const timeoutRef = useRef(null);
  const scrollRef = useRef(null);

  useEffect(() => {
    connectWS();
    setupAudio();
    return () => {
        if(ws.current) ws.current.close();
        if(timeoutRef.current) clearTimeout(timeoutRef.current);
        isRecordingRef.current = false;
    }
  }, []);

  useEffect(() => {
    isRecordingRef.current = isRecording;
    if (isRecording) {
        startRecordingCycle();
    } else {
        if(timeoutRef.current) clearTimeout(timeoutRef.current);
    }
  }, [isRecording]);

  const connectWS = () => {
    const url = buildTranscriberWsUrl(consultationId);
    ws.current = new WebSocket(url);

    ws.current.onopen = () => {
      setStatus('🟢 Live Transcription Active');
    };

    ws.current.onmessage = (e) => {
      const data = JSON.parse(e.data);
      if (data.type === 'transcript_update') {
        setTranscript(prev => [...prev, { speaker: data.speaker, text: data.text }]);
        scrollRef.current?.scrollToEnd({ animated: true });
      }
    };

    ws.current.onclose = () => setStatus('🔴 Disconnected');
    ws.current.onerror = (e) => console.log('WS Error', e);
  };

  const setupAudio = async () => {
    const { status } = await requestRecordingPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Audio permissions are required for transcription.');
    }
  };

  const isRecordingRef = useRef(true);

  useEffect(() => {
    isRecordingRef.current = isRecording;
  }, [isRecording]);

  const startRecordingCycle = async () => {
    if (!isRecordingRef.current) return;
    
    try {
      if (ws.current && ws.current.readyState === WebSocket.OPEN) {
        setStatus('🟢 Recording...');
        
        // Ensure recorder is ready
        if (audioRecorder.prepareToRecordAsync && !audioRecorder.isPrepared) {
          await audioRecorder.prepareToRecordAsync();
        }
        
        if (!isRecordingRef.current) return;
        audioRecorder.record();
        
        // Record for 4 seconds (Faster updates than 10s)
        await new Promise(resolve => setTimeout(resolve, 4000));
        
        if (!isRecordingRef.current) return;

        if (audioRecorder.isRecording) {
          try {
            await audioRecorder.stop();
            
            // Immediately start next process to minimize gaps
            const uri = audioRecorder.uri;
            if (uri) {
                // Background the base64 conversion and sending so we can restart faster
                processAndSendAudio(uri);
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
        // Reduced gap to 100ms
        timeoutRef.current = setTimeout(startRecordingCycle, 100); 
    }
  };

  const processAndSendAudio = async (uri) => {
    try {
        const file = new File(uri);
        const b64 = await file.base64();
        if (ws.current && ws.current.readyState === WebSocket.OPEN && isRecordingRef.current) {
            ws.current.send(JSON.stringify({ type: 'audio_chunk', audio_b64: b64 }));
        }
    } catch (err) {
        console.log("Error processing audio chunk:", err);
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
        Alert.alert("Error", "Failed to generate summary.");
        navigation.goBack();
    } finally {
        setIsFinalizing(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <ChevronLeft color={Colors.textPrimary} size={24} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Smart Transcriber</Text>
        <View style={{width: 24}} />
      </View>

      <View style={styles.statusSection}>
        <Text style={[styles.statusText, status.includes('Live') ? {color: Colors.emerald} : {color: Colors.rose}]}>
            {status}
        </Text>
        {isRecording && <View style={styles.recordingDot} />}
      </View>

      <ScrollView 
        ref={scrollRef}
        style={styles.transcriptArea}
        contentContainerStyle={{paddingBottom: 20}}
      >
        {transcript.length === 0 && (
            <Text style={styles.placeholderText}>Waiting for conversation to start...</Text>
        )}
        {transcript.map((item, index) => (
            <View key={index} style={styles.line}>
                <Text style={item.speaker === 'Doctor' ? styles.doctorLabel : styles.patientLabel}>
                    {item.speaker}:
                </Text>
                <Text style={styles.lineText}>{item.text}</Text>
            </View>
        ))}
      </ScrollView>

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
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, marginBottom: 20 },
  headerTitle: { color: '#fff', fontSize: 20, fontWeight: 'bold' },
  backBtn: { padding: 5 },
  statusSection: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 20, gap: 10 },
  statusText: { fontSize: 14, fontWeight: '600' },
  recordingDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.rose },
  transcriptArea: { flex: 1, paddingHorizontal: 20 },
  placeholderText: { color: '#555', textAlign: 'center', fontStyle: 'italic', marginTop: 50 },
  line: { marginBottom: 15, backgroundColor: 'rgba(255,255,255,0.03)', padding: 12, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  doctorLabel: { color: Colors.indigo, fontSize: 13, fontWeight: 'bold', marginBottom: 4 },
  patientLabel: { color: Colors.emerald, fontSize: 13, fontWeight: 'bold', marginBottom: 4 },
  lineText: { color: '#eee', fontSize: 15, lineHeight: 22 },
  footer: { padding: 20, paddingBottom: 40 },
  stopBtn: { backgroundColor: Colors.rose, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 16, borderRadius: 16, gap: 10, ...Shadows.glow },
  stopBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  disabledBtn: { opacity: 0.5 }
});

export default TranscriberScreen;
