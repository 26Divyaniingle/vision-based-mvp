import { useState, useEffect, useRef, useCallback } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity,
    Alert, ActivityIndicator, Animated, Easing, Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { router, useLocalSearchParams } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useWebSocket } from '../../hooks/useWebSocket';
import { useAudioRecorder } from '../../hooks/useAudioRecorder';
import { SPACING, RADIUS } from '../../constants/theme';

type Message = { role: 'bot' | 'patient' | 'system'; text: string };
type DistressFlags = { stress: boolean; pain: boolean; fatigue: boolean; discomfort: boolean };

export default function InterviewScreen() {
    const { sessionId, patientName, language } = useLocalSearchParams<{
        sessionId: string; patientName: string; language: string;
    }>();

    const [permission, requestPermission] = useCameraPermissions();
    const [messages, setMessages] = useState<Message[]>([]);
    const [visionMetrics, setVisionMetrics] = useState({
        emotion: 'neutral', eyeStrain: 0, lipTension: 0,
        distress: { stress: false, pain: false } as Partial<DistressFlags>,
    });
    const [isComplete, setIsComplete] = useState(false);

    const scrollRef = useRef<ScrollView>(null);
    const cameraRef = useRef<CameraView>(null);
    const frameTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const pulseAnim = useRef(new Animated.Value(1)).current;
    const patientNameVal = patientName ?? 'Patient';
    const languageVal = language ?? 'English';

    // ── Hooks ────────────────────────────────────────────────────────────
    const { recordingState, startRecording, stopAndGetBase64, cancelRecording } = useAudioRecorder();

    const handleWsMessage = useCallback((data: any) => {
        switch (data.type) {
            case 'question':
                addMessage('bot', data.text);
                break;
            case 'transcript':
                addMessage('patient', data.text);
                break;
            case 'processing':
                addMessage('system', `⏳ ${data.text}`);
                break;
            case 'alert':
                addMessage('system', `🚨 ${data.message}`);
                break;
            case 'finalize':
                setIsComplete(true);
                router.replace({
                    pathname: '/results/[sessionId]',
                    params: {
                        sessionId: sessionId!,
                        resultData: JSON.stringify(data),
                        patientName: patientNameVal,
                    },
                });
                break;
        }
    }, [sessionId, patientNameVal]);

    const { status: wsStatus, send, connect, disconnect } = useWebSocket(handleWsMessage);

    // ── Connect + start interview ────────────────────────────────────────
    useEffect(() => {
        if (!permission?.granted) { requestPermission(); return; }
        connect(sessionId!);
        return () => {
            disconnect();
            if (frameTimerRef.current) clearInterval(frameTimerRef.current);
        };
    }, [permission?.granted, sessionId]);

    // Kick off the first question once connected
    useEffect(() => {
        if (wsStatus === 'connected') {
            send({ type: 'start', patient_id: 1, patient_name: patientNameVal, language: languageVal });
            startFrameCapture();
        }
        if (wsStatus === 'error') addMessage('system', '⚠️ Connection error. Please check your network.');
    }, [wsStatus]);

    // ── Mic pulsing animation ────────────────────────────────────────────
    useEffect(() => {
        if (recordingState === 'recording') {
            Animated.loop(
                Animated.sequence([
                    Animated.timing(pulseAnim, { toValue: 1.35, duration: 550, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
                    Animated.timing(pulseAnim, { toValue: 1, duration: 550, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
                ])
            ).start();
        } else {
            Animated.spring(pulseAnim, { toValue: 1, useNativeDriver: true }).start();
        }
    }, [recordingState]);

    // ── Helpers ──────────────────────────────────────────────────────────
    function addMessage(role: Message['role'], text: string) {
        setMessages((prev) => [...prev, { role, text }]);
        setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 120);
    }

    function startFrameCapture() {
        frameTimerRef.current = setInterval(async () => {
            if (cameraRef.current && wsStatus === 'connected') {
                try {
                    const photo = await cameraRef.current.takePictureAsync({ quality: 0.25, base64: true, skipProcessing: true });
                    if (photo?.base64) send({ type: 'video_frame', image_base64: photo.base64 });
                } catch (_) { }
            }
        }, 2500);
    }

    async function handleMicToggle() {
        if (recordingState === 'idle') {
            await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            await startRecording();
        } else if (recordingState === 'recording') {
            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            const base64Audio = await stopAndGetBase64();
            if (base64Audio) {
                send({ type: 'audio_chunk', audio_b64: base64Audio });
            }
        }
    }

    async function handleEndSession() {
        Alert.alert('End Session', 'Are you sure you want to end this consultation?', [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'End Session', style: 'destructive',
                onPress: async () => {
                    await cancelRecording();
                    disconnect();
                    router.back();
                },
            },
        ]);
    }

    // ── Emotion display ──────────────────────────────────────────────────
    const emotionEmoji = (e: string) => {
        if (['sad', 'angry', 'fear', 'disgust'].includes(e)) return '😟';
        if (['happy', 'surprise'].includes(e)) return '😊';
        return '😐';
    };

    const statusColor = {
        connecting: '#f9d423', connected: '#00e676',
        disconnected: 'rgba(255,255,255,0.3)', error: '#ff5252',
    }[wsStatus];

    const micColors: [string, string] = recordingState === 'recording'
        ? ['#ff5252', '#b71c1c']
        : recordingState === 'processing'
            ? ['#f9d423', '#f57f17']
            : ['#00d2ff', '#7b2ff7'];

    const micEmoji = recordingState === 'recording' ? '⏹' : recordingState === 'processing' ? '⏳' : '🎙️';

    // ── Permission gate ──────────────────────────────────────────────────
    if (!permission?.granted) {
        return (
            <LinearGradient colors={['#0f0c29', '#302b63']} style={styles.permScreen}>
                <Text style={styles.permEmoji}>📷</Text>
                <Text style={styles.permTitle}>Camera Access Needed</Text>
                <Text style={styles.permDesc}>The bio-vision analysis module needs your camera to monitor facial expressions during the consultation.</Text>
                <TouchableOpacity onPress={requestPermission} style={styles.permBtn}>
                    <LinearGradient colors={['#00d2ff', '#7b2ff7']} style={styles.permBtnInner} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                        <Text style={styles.permBtnText}>Grant Camera Access</Text>
                    </LinearGradient>
                </TouchableOpacity>
            </LinearGradient>
        );
    }

    return (
        <View style={styles.container}>

            {/* ── Top Bar ── */}
            <LinearGradient colors={['rgba(15,12,41,0.98)', 'rgba(15,12,41,0.8)']} style={styles.topBar}>
                <TouchableOpacity onPress={handleEndSession} style={styles.endBtn}>
                    <Text style={styles.endBtnText}>✕ End</Text>
                </TouchableOpacity>
                <View style={styles.sessionPill}>
                    <View style={[styles.dot, { backgroundColor: statusColor }]} />
                    <Text style={styles.sessionName}>{patientNameVal}</Text>
                    <Text style={styles.langTag}>· {languageVal}</Text>
                </View>
                <View style={styles.recBadge}>
                    {recordingState === 'recording' && (
                        <>
                            <View style={styles.redDot} />
                            <Text style={styles.recText}>REC</Text>
                        </>
                    )}
                </View>
            </LinearGradient>

            {/* ── Camera + Vision Overlay ── */}
            <View style={styles.cameraShell}>
                <CameraView ref={cameraRef} style={styles.camera} facing="front" />

                {/* Scan line animation overlay */}
                <LinearGradient
                    colors={['rgba(0,210,255,0.08)', 'transparent', 'rgba(0,210,255,0.08)']}
                    style={styles.scanOverlay}
                    pointerEvents="none"
                />

                {/* Vision metric badges */}
                <View style={styles.visionRow}>
                    <View style={styles.visionChip}>
                        <Text style={styles.visionChipText}>{emotionEmoji(visionMetrics.emotion)}  {visionMetrics.emotion.toUpperCase()}</Text>
                    </View>
                    <View style={styles.visionChip}>
                        <Text style={styles.visionChipText}>👁  {(visionMetrics.eyeStrain * 100).toFixed(0)}% strain</Text>
                    </View>
                    {visionMetrics.distress.pain && (
                        <View style={[styles.visionChip, { borderColor: '#ff5252' }]}>
                            <Text style={[styles.visionChipText, { color: '#ff5252' }]}>🚨 Pain Detected</Text>
                        </View>
                    )}
                </View>

                {/* Connecting overlay */}
                {wsStatus === 'connecting' && (
                    <View style={styles.connectingOverlay}>
                        <ActivityIndicator color="#00d2ff" size="large" />
                        <Text style={styles.connectingText}>Connecting to MedGemma AI…</Text>
                    </View>
                )}
            </View>

            {/* ── Chat Messages ── */}
            <ScrollView
                ref={scrollRef}
                style={styles.chatArea}
                contentContainerStyle={styles.chatContent}
                showsVerticalScrollIndicator={false}
            >
                {messages.map((msg, i) => (
                    <View key={i} style={[
                        styles.bubble,
                        msg.role === 'bot' && styles.bubbleBot,
                        msg.role === 'patient' && styles.bubblePatient,
                        msg.role === 'system' && styles.bubbleSystem,
                    ]}>
                        {msg.role === 'bot' && (
                            <Text style={styles.bubbleSender}>🤖 MedGemma AI</Text>
                        )}
                        <Text style={[
                            styles.bubbleText,
                            msg.role === 'patient' && { color: '#fff' },
                            msg.role === 'system' && { color: 'rgba(249,212,35,0.9)', fontSize: 12 },
                        ]}>
                            {msg.text}
                        </Text>
                    </View>
                ))}
            </ScrollView>

            {/* ── Mic Controls ── */}
            <LinearGradient colors={['rgba(15,12,41,0.9)', '#0f0c29']} style={styles.controlBar}>
                {/* Helper hint text */}
                <Text style={styles.micHint}>
                    {recordingState === 'idle' && 'Tap mic to speak your symptoms'}
                    {recordingState === 'recording' && '🔴 Recording… Tap to stop'}
                    {recordingState === 'processing' && '⏳ Processing your voice…'}
                </Text>

                <View style={styles.micRow}>
                    {/* Cancel (only when recording) */}
                    <TouchableOpacity
                        onPress={cancelRecording}
                        style={[styles.sideBtn, { opacity: recordingState === 'recording' ? 1 : 0 }]}
                    >
                        <Text style={styles.sideBtnText}>✕ Cancel</Text>
                    </TouchableOpacity>

                    {/* Main mic button */}
                    <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
                        <TouchableOpacity onPress={handleMicToggle} disabled={recordingState === 'processing'} activeOpacity={0.85}>
                            <LinearGradient colors={micColors} style={styles.micBtn} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
                                <Text style={styles.micEmoji}>{micEmoji}</Text>
                            </LinearGradient>
                        </TouchableOpacity>
                    </Animated.View>

                    {/* Spacer to balance layout */}
                    <View style={styles.sideBtn} />
                </View>
            </LinearGradient>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#0f0c29' },
    // Permission screen
    permScreen: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: SPACING.lg, gap: 14 },
    permEmoji: { fontSize: 56 },
    permTitle: { color: '#fff', fontSize: 22, fontWeight: '800' },
    permDesc: { color: 'rgba(255,255,255,0.55)', fontSize: 14, textAlign: 'center', lineHeight: 20 },
    permBtn: {},
    permBtnInner: { borderRadius: RADIUS.md, paddingHorizontal: SPACING.xl, paddingVertical: 14 },
    permBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
    // Top bar
    topBar: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingTop: Platform.OS === 'ios' ? 52 : 36,
        paddingBottom: SPACING.sm, paddingHorizontal: SPACING.md,
    },
    endBtn: {
        backgroundColor: 'rgba(255,82,82,0.15)', borderRadius: RADIUS.full,
        paddingHorizontal: 12, paddingVertical: 6,
        borderWidth: 1, borderColor: 'rgba(255,82,82,0.35)',
    },
    endBtnText: { color: '#ff5252', fontWeight: '700', fontSize: 12 },
    sessionPill: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    dot: { width: 7, height: 7, borderRadius: 4 },
    sessionName: { color: '#fff', fontWeight: '700', fontSize: 14 },
    langTag: { color: 'rgba(255,255,255,0.4)', fontSize: 12 },
    recBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, width: 54, justifyContent: 'flex-end' },
    redDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#ff5252' },
    recText: { color: '#ff5252', fontWeight: '700', fontSize: 11 },
    // Camera
    cameraShell: { height: 210, position: 'relative', overflow: 'hidden' },
    camera: { flex: 1 },
    scanOverlay: { ...StyleSheet.absoluteFillObject },
    visionRow: {
        position: 'absolute', bottom: 8, left: 8, flexDirection: 'row', gap: 6, flexWrap: 'wrap',
    },
    visionChip: {
        backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: RADIUS.full,
        paddingHorizontal: 10, paddingVertical: 4,
        borderWidth: 1, borderColor: 'rgba(0,210,255,0.35)',
    },
    visionChipText: { color: '#00d2ff', fontSize: 11, fontWeight: '600' },
    connectingOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.7)',
        alignItems: 'center', justifyContent: 'center', gap: 12,
    },
    connectingText: { color: '#00d2ff', fontWeight: '600', fontSize: 14 },
    // Chat
    chatArea: { flex: 1 },
    chatContent: { padding: SPACING.md, gap: 10, paddingBottom: 12 },
    bubble: { maxWidth: '82%', borderRadius: RADIUS.lg, padding: 12 },
    bubbleBot: {
        backgroundColor: 'rgba(0,210,255,0.1)',
        borderWidth: 1, borderColor: 'rgba(0,210,255,0.2)',
        alignSelf: 'flex-start',
    },
    bubblePatient: { backgroundColor: '#5c3aaa', alignSelf: 'flex-end' },
    bubbleSystem: {
        backgroundColor: 'rgba(249,212,35,0.08)',
        borderWidth: 1, borderColor: 'rgba(249,212,35,0.25)',
        alignSelf: 'center', maxWidth: '94%',
    },
    bubbleSender: { color: '#00d2ff', fontSize: 10, fontWeight: '700', marginBottom: 4 },
    bubbleText: { color: 'rgba(255,255,255,0.88)', fontSize: 14, lineHeight: 21 },
    // Controls
    controlBar: { paddingBottom: 28, paddingTop: SPACING.md, alignItems: 'center', gap: 10 },
    micHint: { color: 'rgba(255,255,255,0.4)', fontSize: 12 },
    micRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.lg },
    sideBtn: { width: 72, alignItems: 'center' },
    sideBtnText: { color: '#ff5252', fontSize: 12, fontWeight: '600' },
    micBtn: {
        width: 76, height: 76, borderRadius: 38,
        alignItems: 'center', justifyContent: 'center',
        shadowColor: '#00d2ff', shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.75, shadowRadius: 22, elevation: 18,
    },
    micEmoji: { fontSize: 34 },
});
