import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Typography, Radii, Shadows } from '../theme';

const PrimaryButton = ({ title, onPress, style, textStyle, variant = 'primary' }) => {
  const colors = variant === 'emerald' ? Colors.gradientEmerald : Colors.gradientPrimary;

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.8} style={[styles.container, style]}>
      <LinearGradient
        colors={colors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.gradient}
      >
        <Text style={[styles.text, textStyle]}>{title}</Text>
      </LinearGradient>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: Radii.md,
    ...Shadows.glow,
  },
  gradient: {
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: Radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    color: Colors.textPrimary,
    fontSize: Typography.sizes.base,
    fontWeight: Typography.weights.bold,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
});

export default PrimaryButton;
