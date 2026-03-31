import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import { Colors } from '../theme';

const AnimatedWaveform = ({ active, color = Colors.indigo }) => {
  const bars = [1, 2, 3, 4, 5, 6, 7];
  const animValues = useRef(bars.map(() => new Animated.Value(5))).current;

  useEffect(() => {
    if (active) {
      const animations = animValues.map((anim, i) => {
        return Animated.loop(
          Animated.sequence([
            Animated.timing(anim, {
              toValue: 25 + Math.random() * 20,
              duration: 200 + i * 50,
              useNativeDriver: false,
            }),
            Animated.timing(anim, {
              toValue: 5,
              duration: 200 + i * 50,
              useNativeDriver: false,
            }),
          ])
        );
      });
      animations.forEach(a => a.start());
      return () => animations.forEach(a => a.stop());
    } else {
      animValues.forEach(anim => anim.setValue(5));
    }
  }, [active]);

  return (
    <View style={styles.container}>
      {bars.map((_, i) => (
        <Animated.View
          key={i}
          style={[
            styles.bar,
            { height: animValues[i], backgroundColor: color }
          ]}
        />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 50,
    gap: 4,
  },
  bar: {
    width: 4,
    borderRadius: 2,
  },
});

export default AnimatedWaveform;
