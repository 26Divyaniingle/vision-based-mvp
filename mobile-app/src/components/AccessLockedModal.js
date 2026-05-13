import React from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, Linking } from 'react-native';
import { Lock, Mail, ChevronLeft } from 'lucide-react-native';
import { Colors, Shadows } from '../theme';
import GlassCard from './GlassCard';
import PrimaryButton from './PrimaryButton';

const AccessLockedModal = ({ visible, onBack }) => {
  const adminEmail = 'medsense.ai@gmail.com';

  const handleContactAdmin = () => {
    Linking.openURL(`mailto:${adminEmail}`);
  };

  return (
    <Modal
      transparent
      visible={visible}
      animationType="fade"
    >
      <View style={styles.overlay}>
        <GlassCard style={styles.modal}>
          <View style={styles.iconContainer}>
            <Lock color={Colors.rose} size={40} />
          </View>
          
          <Text style={styles.title}>Access Locked</Text>
          
          <Text style={styles.message}>
            You have used all free MedSense AI sessions.
          </Text>
          
          <Text style={styles.subMessage}>
            To continue using the platform, please contact the administrator.
          </Text>

          <TouchableOpacity 
            style={styles.emailContainer}
            onPress={handleContactAdmin}
          >
            <Mail color={Colors.indigo} size={18} />
            <Text style={styles.emailText}>{adminEmail}</Text>
          </TouchableOpacity>

          <View style={styles.buttonContainer}>
            <PrimaryButton 
              title="Contact Admin" 
              onPress={handleContactAdmin}
              style={styles.primaryBtn}
            />
            
            <TouchableOpacity 
              style={styles.backBtn}
              onPress={onBack}
            >
              <ChevronLeft color={Colors.textSecondary} size={18} />
              <Text style={styles.backBtnText}>Back to Dashboard</Text>
            </TouchableOpacity>
          </View>
        </GlassCard>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modal: {
    padding: 32,
    width: '100%',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(244,63,94,0.3)',
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(244,63,94,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: '#fff',
    marginBottom: 16,
    textAlign: 'center',
  },
  message: {
    fontSize: 16,
    color: '#fff',
    textAlign: 'center',
    marginBottom: 8,
    lineHeight: 24,
    fontWeight: '600',
  },
  subMessage: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  emailContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(99,102,241,0.08)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    marginBottom: 32,
    borderWidth: 1,
    borderColor: 'rgba(99,102,241,0.2)',
  },
  emailText: {
    color: Colors.indigo,
    fontWeight: '700',
    fontSize: 15,
  },
  buttonContainer: {
    width: '100%',
    gap: 16,
  },
  primaryBtn: {
    width: '100%',
    ...Shadows.glow,
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 4,
  },
  backBtnText: {
    color: Colors.textSecondary,
    fontSize: 14,
    fontWeight: '600',
  },
});

export default AccessLockedModal;
