import { useRef, useState, useCallback } from 'react';
import { Audio } from 'expo-av';

export type RecordingState = 'idle' | 'recording' | 'processing';

interface UseAudioRecorderReturn {
    recordingState: RecordingState;
    startRecording: () => Promise<void>;
    stopAndGetBase64: () => Promise<string | null>;
    cancelRecording: () => Promise<void>;
}

/**
 * A clean hook for managing audio recording via expo-av.
 * Returns base64-encoded audio bytes ready to send over WebSocket.
 */
export function useAudioRecorder(): UseAudioRecorderReturn {
    const recordingRef = useRef<Audio.Recording | null>(null);
    const [recordingState, setRecordingState] = useState<RecordingState>('idle');

    const startRecording = useCallback(async () => {
        try {
            // Request permissions
            const { granted } = await Audio.requestPermissionsAsync();
            if (!granted) throw new Error('Microphone permission denied.');

            // Set audio mode for recording
            await Audio.setAudioModeAsync({
                allowsRecordingIOS: true,
                playsInSilentModeIOS: true,
            });

            // Create and start recording
            const { recording } = await Audio.Recording.createAsync(
                Audio.RecordingOptionsPresets.HIGH_QUALITY
            );

            recordingRef.current = recording;
            setRecordingState('recording');
        } catch (e) {
            console.error('Failed to start recording:', e);
            setRecordingState('idle');
        }
    }, []);

    const stopAndGetBase64 = useCallback(async (): Promise<string | null> => {
        if (!recordingRef.current) return null;
        setRecordingState('processing');

        try {
            await recordingRef.current.stopAndUnloadAsync();

            // Reset audio mode to playback
            await Audio.setAudioModeAsync({ allowsRecordingIOS: false });

            const uri = recordingRef.current.getURI();
            if (!uri) return null;

            // Read the recorded file as base64
            const { readAsStringAsync, EncodingType } = await import('expo-file-system');
            const base64 = await readAsStringAsync(uri, { encoding: EncodingType.Base64 });

            recordingRef.current = null;
            setRecordingState('idle');
            return base64;
        } catch (e) {
            console.error('Failed to stop recording:', e);
            setRecordingState('idle');
            return null;
        }
    }, []);

    const cancelRecording = useCallback(async () => {
        if (!recordingRef.current) return;
        try {
            await recordingRef.current.stopAndUnloadAsync();
        } catch (_) { }
        recordingRef.current = null;
        setRecordingState('idle');
    }, []);

    return { recordingState, startRecording, stopAndGetBase64, cancelRecording };
}
