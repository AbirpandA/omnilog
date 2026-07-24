import React, { ReactNode } from 'react';
import { StyleSheet, View, ViewStyle, StyleProp } from 'react-native';
import { BlurView } from 'expo-blur';

interface GlassCardProps {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}

export function GlassCard({ children, style }: GlassCardProps) {
  return (
    <View style={[styles.container, style]}>
      <BlurView tint="dark" intensity={40} style={styles.blurView}>
        {children}
      </BlurView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    backgroundColor: 'rgba(0, 0, 0, 0.3)', // Slight fallback background
  },
  blurView: {
    padding: 16,
  }
});
