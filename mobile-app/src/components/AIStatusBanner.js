import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Animated, Easing } from 'react-native';
import { Colors } from '../theme';

// ─── Phase message pools ──────────────────────────────────────────────────────
const PHASE_MESSAGES = {
  processing: [
    '🔬 Analysing your response…',
    '🧠 AI is thinking…',
    '📋 Mapping clinical markers…',
    '🔍 Cross-referencing symptoms…',
    '💡 Generating follow-up question…',
    '⚕️ Evaluating medical context…',
    '🩺 Processing clinical data…',
  ],
  listening: [
    '🎙️ Listening carefully…',
    '👂 Capturing your symptoms…',
    '📝 Transcribing your voice…',
  ],
  speaking: [
    '🔊 AI is responding…',
    '💬 Delivering clinical insight…',
    '🗣️ Please listen…',
  ],
  finalizing: [
    '📊 Compiling your diagnosis…',
    '🩻 Reviewing all findings…',
    '✅ Preparing your results…',
    '🏥 Finalizing report…',
  ],
  reconnecting: [
    '🔌 Reconnecting securely…',
    '📡 Restoring session…',
    '⏳ Please wait…',
  ],
};

// Label + accent colour per phase
const PHASE_META = {
  processing: { label: 'AI PROCESSING', color: Colors.indigo },
  listening:  { label: 'RECORDING',      color: Colors.emerald },
  speaking:   { label: 'AI SPEAKING',    color: Colors.purple },
  finalizing: { label: 'FINALIZING',     color: Colors.amber },
  reconnecting: { label: 'RECONNECTING', color: Colors.rose },
};

// ─── Dot pulse ────────────────────────────────────────────────────────────────
const PulseDots = ({ color }) => {
  const dots = [useRef(new Animated.Value(0.3)).current,
                useRef(new Animated.Value(0.3)).current,
                useRef(new Animated.Value(0.3)).current];

  useEffect(() => {
    const anims = dots.map((dot, i) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(i * 180),
          Animated.timing(dot, { toValue: 1,   duration: 300, useNativeDriver: true }),
          Animated.timing(dot, { toValue: 0.3, duration: 300, useNativeDriver: true }),
        ])
      )
    );
    anims.forEach(a => a.start());
    return () => anims.forEach(a => a.stop());
  }, []);

  return (
    <View style={dotStyles.row}>
      {dots.map((dot, i) => (
        <Animated.View
          key={i}
          style={[dotStyles.dot, { backgroundColor: color, opacity: dot }]}
        />
      ))}
    </View>
  );
};

const dotStyles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  dot: { width: 6, height: 6, borderRadius: 3 },
});

// ─── Progress bar ─────────────────────────────────────────────────────────────
const ShimmerBar = ({ color }) => {
  const shimmer = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.timing(shimmer, {
        toValue: 1,
        duration: 1600,
        easing: Easing.linear,
        useNativeDriver: false,
      })
    ).start();
  }, []);

  const translateX = shimmer.interpolate({
    inputRange: [0, 1],
    outputRange: ['-100%', '200%'],
  });

  return (
    <View style={[barStyles.track, { backgroundColor: `${color}22` }]}>
      <Animated.View
        style={[barStyles.shimmer, { backgroundColor: color, transform: [{ translateX }] }]}
      />
    </View>
  );
};

const barStyles = StyleSheet.create({
  track: { height: 3, borderRadius: 2, overflow: 'hidden', width: '100%', marginTop: 10 },
  shimmer: { height: '100%', width: '40%', borderRadius: 2, opacity: 0.85 },
});

// ─── Main Banner ──────────────────────────────────────────────────────────────
/**
 * AIStatusBanner
 * Props:
 *   phase  — 'processing' | 'listening' | 'speaking' | 'finalizing' | 'reconnecting' | null
 */
const AIStatusBanner = ({ phase }) => {
  const [msgIndex, setMsgIndex] = useState(0);
  const fadeAnim  = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;
  const bannerFade = useRef(new Animated.Value(0)).current;

  const messages = PHASE_MESSAGES[phase] ?? [];
  const meta     = PHASE_META[phase] ?? { label: '', color: Colors.indigo };

  // Fade banner in/out on phase change
  useEffect(() => {
    if (phase) {
      Animated.timing(bannerFade, { toValue: 1, duration: 300, useNativeDriver: true }).start();
    } else {
      Animated.timing(bannerFade, { toValue: 0, duration: 200, useNativeDriver: true }).start();
    }
  }, [phase]);

  // Rotate messages every 2.5s
  useEffect(() => {
    if (!phase || messages.length === 0) return;
    setMsgIndex(0);

    const interval = setInterval(() => {
      // Fade + slide out
      Animated.parallel([
        Animated.timing(fadeAnim,  { toValue: 0, duration: 200, useNativeDriver: true }),
        Animated.timing(slideAnim, { toValue: -8, duration: 200, useNativeDriver: true }),
      ]).start(() => {
        setMsgIndex(prev => (prev + 1) % messages.length);
        slideAnim.setValue(8);
        // Fade + slide in
        Animated.parallel([
          Animated.timing(fadeAnim,  { toValue: 1, duration: 250, useNativeDriver: true }),
          Animated.timing(slideAnim, { toValue: 0, duration: 250, useNativeDriver: true }),
        ]).start();
      });
    }, 2500);

    return () => clearInterval(interval);
  }, [phase]);

  if (!phase) return null;

  return (
    <Animated.View style={[styles.wrapper, { opacity: bannerFade }]}>
      <View style={[styles.banner, { borderColor: `${meta.color}40`, backgroundColor: `${meta.color}12` }]}>
        {/* Top row: label + dots */}
        <View style={styles.topRow}>
          <View style={[styles.labelPill, { backgroundColor: `${meta.color}22` }]}>
            <Text style={[styles.labelText, { color: meta.color }]}>{meta.label}</Text>
          </View>
          <PulseDots color={meta.color} />
        </View>

        {/* Rotating message */}
        <Animated.Text
          style={[
            styles.message,
            { opacity: fadeAnim, transform: [{ translateY: slideAnim }], color: Colors.textPrimary },
          ]}
        >
          {messages[msgIndex]}
        </Animated.Text>

        {/* Shimmer progress bar */}
        <ShimmerBar color={meta.color} />
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    paddingHorizontal: 20,
    paddingBottom: 6,
  },
  banner: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  labelPill: {
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  labelText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  message: {
    fontSize: 14,
    fontWeight: '500',
    lineHeight: 20,
  },
});

export default React.memo(AIStatusBanner);
