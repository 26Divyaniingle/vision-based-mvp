/**
 * AIChatbotScreen.js
 * MedSense AI Assistant – Chat + Report Scanner
 * Fully functional: text chat, camera capture, gallery upload, document upload.
 */
import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Send,
  Camera,
  Image as ImageIcon,
  ChevronLeft,
  Bot,
  Paperclip,
} from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
// Use the legacy API – the new "File/Directory" API is not yet stable in this SDK version
import * as FileSystem from 'expo-file-system/legacy';
import { Colors, Shadows } from '../../theme';
import ChatBubble from '../../components/ChatBubble';
import TypingAnimation from '../../components/TypingAnimation';
import { chatWithAI, analyzeReport } from '../../api/ai_assistant';

// ─── Component ────────────────────────────────────────────────────────────────
const AIChatbotScreen = ({ navigation, route }) => {
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content:
        "Hello! I'm MedSense AI 👋\n\nYou can:\n• Ask me any health question\n• 📎 Attach a report/PDF\n• 📷 Take a photo of a physical report\n• 🖼️ Upload a report image from gallery",
    },
  ]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);

  const scrollViewRef = useRef(null);
  const inputRef = useRef(null);

  // ── Auto-scroll on new message ──
  useEffect(() => {
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 120);
  }, [messages, isTyping]);

  // ── Auto-open gallery if launched via "Scan" shortcut ──
  useEffect(() => {
    if (route?.params?.autoScan) {
      setTimeout(() => pickImage(false), 600);
    }
  }, []);

  // ─────────────────────────────────────────────────────────────────────────────
  // TEXT CHAT
  // ─────────────────────────────────────────────────────────────────────────────
  const handleSend = async () => {
    const text = inputText.trim();
    if (!text) return;

    const userMessage = { role: 'user', content: text };
    const newHistory = [...messages, userMessage];

    setMessages(newHistory);
    setInputText('');
    setIsTyping(true);

    try {
      const response = await chatWithAI(newHistory);
      const reply = response?.data?.reply || 'No response. Please try again.';
      setMessages(prev => [...prev, { role: 'assistant', content: reply }]);
    } catch (err) {
      console.error('Chat error:', err?.message || err);
      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: 'Connection error. Please check your network and try again.',
        },
      ]);
    } finally {
      setIsTyping(false);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // FILE → BASE64 helper
  // ─────────────────────────────────────────────────────────────────────────────
  const readBase64 = async (uri) => {
    const base64 = await FileSystem.readAsStringAsync(uri, { encoding: 'base64' });
    return base64;
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // CAMERA CAPTURE
  // ─────────────────────────────────────────────────────────────────────────────
  const pickImage = async (useCamera = false) => {
    try {
      // Request permission
      const permReq = useCamera
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (permReq.status !== 'granted') {
        Alert.alert(
          'Permission Required',
          useCamera
            ? 'Allow camera access to capture reports.'
            : 'Allow media access to upload reports.'
        );
        return;
      }

      // Launch
      const result = useCamera
        ? await ImagePicker.launchCameraAsync({ allowsEditing: true, quality: 0.6 })
        : await ImagePicker.launchImageLibraryAsync({ allowsEditing: true, quality: 0.6 });

      if (result.canceled || !result.assets?.length) return;

      const asset = result.assets[0];
      const base64 = await readBase64(asset.uri);
      const filename = asset.fileName || `photo_${Date.now()}.jpg`;

      await processFile(base64, filename, '📷 Image');
    } catch (err) {
      console.error('Pick image error:', err?.message || err);
      Alert.alert('Error', 'Could not open camera or gallery.');
    }
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // DOCUMENT PICKER (PDF / image)
  // ─────────────────────────────────────────────────────────────────────────────
  const pickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'image/*'],
        copyToCacheDirectory: true,
      });

      if (result.canceled || !result.assets?.length) return;

      const asset = result.assets[0];
      const base64 = await readBase64(asset.uri);

      await processFile(base64, asset.name || `document_${Date.now()}`, '📄 Document');
    } catch (err) {
      console.error('Pick document error:', err?.message || err);
      Alert.alert('Error', 'Could not open document picker.');
    }
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // PROCESS FILE → SEND TO AI VISION
  // ─────────────────────────────────────────────────────────────────────────────
  const processFile = async (base64, filename, label) => {
    if (!base64) {
      Alert.alert('Error', 'File data is empty. Please try again.');
      return;
    }

    // Strip data-URI prefix if present
    const cleanB64 = base64.includes('base64,')
      ? base64.split('base64,')[1]
      : base64;

    setMessages(prev => [
      ...prev,
      { role: 'user', content: `${label} uploaded: ${filename}\n_Analyzing with AI…_` },
    ]);
    setIsTyping(true);

    try {
      const response = await analyzeReport(cleanB64, filename);
      const data = response?.data;

      if (data?.success) {
        setMessages(prev => [...prev, { role: 'assistant', content: data.analysis }]);
      } else {
        setMessages(prev => [
          ...prev,
          {
            role: 'assistant',
            content:
              data?.error ||
              "I couldn't analyze that file. Please try a clearer image.",
          },
        ]);
      }
    } catch (err) {
      console.error('Analysis error:', err?.message || err);
      const status = err?.response?.status;
      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: `Analysis failed${status ? ` (${status})` : ''}. Please try again.`,
        },
      ]);
    } finally {
      setIsTyping(false);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right', 'bottom']}>
      {/* ── Header ── */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <ChevronLeft color="#fff" size={26} />
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          <View style={styles.botAvatar}>
            <Bot color={Colors.indigo} size={18} />
          </View>
          <View>
            <Text style={styles.botName}>MedSense AI</Text>
            <Text style={styles.botStatus}>● Online</Text>
          </View>
        </View>

        {/* placeholder to centre title */}
        <View style={{ width: 34 }} />
      </View>

      {/* ── Chat + Input ── */}
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 88 : 0}
      >
        {/* Messages / Welcome Grid */}
        <ScrollView
          ref={scrollViewRef}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {messages.length <= 1 ? (
            <View style={styles.welcomeContainer}>
              <View style={styles.welcomeHeader}>
                <View style={styles.welcomeAvatar}>
                  <Bot color={Colors.indigo} size={32} />
                </View>
                <Text style={styles.welcomeTitle}>MedSense AI Assistant</Text>
                <Text style={styles.welcomeDesc}>
                  Your secure AI companion for lab result extraction and medical analysis. Upload a document or type a question below to begin.
                </Text>
              </View>

              <View style={styles.actionGrid}>
                {/* Scan Card */}
                <TouchableOpacity style={styles.actionCard} onPress={() => pickImage(true)}>
                  <View style={[styles.actionCardIcon, { borderColor: Colors.indigo + '40', backgroundColor: Colors.indigo + '15' }]}>
                    <Camera color={Colors.indigo} size={20} />
                  </View>
                  <View style={styles.actionCardContent}>
                    <Text style={styles.actionCardTitle}>Scan Physical Report</Text>
                    <Text style={styles.actionCardSub}>Take a clear camera photo of paper lab findings.</Text>
                  </View>
                </TouchableOpacity>

                {/* Gallery Card */}
                <TouchableOpacity style={styles.actionCard} onPress={() => pickImage(false)}>
                  <View style={[styles.actionCardIcon, { borderColor: Colors.emerald + '40', backgroundColor: Colors.emerald + '15' }]}>
                    <ImageIcon color={Colors.emerald} size={20} />
                  </View>
                  <View style={styles.actionCardContent}>
                    <Text style={styles.actionCardTitle}>Upload Lab Image</Text>
                    <Text style={styles.actionCardSub}>Analyze test reports stored as photos in your library.</Text>
                  </View>
                </TouchableOpacity>

                {/* PDF Card */}
                <TouchableOpacity style={styles.actionCard} onPress={pickDocument}>
                  <View style={[styles.actionCardIcon, { borderColor: Colors.amber + '40', backgroundColor: Colors.amber + '15' }]}>
                    <Paperclip color={Colors.amber} size={20} />
                  </View>
                  <View style={styles.actionCardContent}>
                    <Text style={styles.actionCardTitle}>Attach PDF Document</Text>
                    <Text style={styles.actionCardSub}>Import and extract findings from lab sheets or PDF files.</Text>
                  </View>
                </TouchableOpacity>

                {/* Question Card */}
                <TouchableOpacity style={styles.actionCard} onPress={() => inputRef.current?.focus()}>
                  <View style={[styles.actionCardIcon, { borderColor: Colors.purple + '40', backgroundColor: Colors.purple + '15' }]}>
                    <Bot color={Colors.purple} size={20} />
                  </View>
                  <View style={styles.actionCardContent}>
                    <Text style={styles.actionCardTitle}>Ask a Health Question</Text>
                    <Text style={styles.actionCardSub}>Inquire about medical terms, symptoms, or remedies.</Text>
                  </View>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            messages.map((msg, idx) => (
              <ChatBubble
                key={idx}
                message={msg.content}
                isUser={msg.role === 'user'}
              />
            ))
          )}
          {isTyping && <TypingAnimation />}
        </ScrollView>

        {/* Input bar */}
        <View style={styles.inputBar}>
          {/* Attach file/doc */}
          <TouchableOpacity
            onPress={pickDocument}
            style={styles.iconBtn}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Paperclip color={Colors.textSecondary} size={22} />
          </TouchableOpacity>

          {/* Camera */}
          <TouchableOpacity
            onPress={() => pickImage(true)}
            style={styles.iconBtn}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Camera color={Colors.textSecondary} size={22} />
          </TouchableOpacity>

          {/* Gallery */}
          <TouchableOpacity
            onPress={() => pickImage(false)}
            style={styles.iconBtn}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <ImageIcon color={Colors.textSecondary} size={22} />
          </TouchableOpacity>

          {/* Text input */}
          <TextInput
            ref={inputRef}
            style={styles.input}
            placeholder="Ask anything…"
            placeholderTextColor={Colors.textMuted}
            value={inputText}
            onChangeText={setInputText}
            multiline
            maxLength={600}
            returnKeyType="default"
          />

          {/* Send */}
          <TouchableOpacity
            onPress={handleSend}
            style={[styles.sendBtn, !inputText.trim() && styles.sendBtnDisabled]}
            disabled={!inputText.trim()}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Send color="#fff" size={18} />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: Colors.bg,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingHorizontal: 10,
    paddingTop: Platform.OS === 'android' ? 14 : 4,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    backgroundColor: 'rgba(10,10,20,0.95)',
  },
  backBtn: { padding: 4 },
  headerCenter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  botAvatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(99,102,241,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(99,102,241,0.35)',
  },
  botName: { color: '#fff', fontSize: 15, fontWeight: '700' },
  botStatus: { color: '#10b981', fontSize: 10, fontWeight: '600' },

  // Chat area
  scrollContent: {
    padding: 16,
    paddingBottom: 8,
  },

  // Welcome Board
  welcomeContainer: {
    alignItems: 'center',
    marginTop: 10,
    paddingHorizontal: 4,
  },
  welcomeHeader: {
    alignItems: 'center',
    marginBottom: 24,
  },
  welcomeAvatar: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: 'rgba(99,102,241,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(99,102,241,0.4)',
    marginBottom: 12,
    ...Shadows.glow,
  },
  welcomeTitle: {
    color: '#fff',
    fontSize: 21,
    fontWeight: '800',
    marginBottom: 8,
  },
  welcomeDesc: {
    color: Colors.textSecondary,
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
    paddingHorizontal: 12,
  },
  actionGrid: {
    width: '100%',
    gap: 12,
    marginBottom: 20,
  },
  actionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
    borderRadius: 16,
    padding: 14,
    gap: 14,
  },
  actionCardIcon: {
    width: 42,
    height: 42,
    borderRadius: 12,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionCardContent: {
    flex: 1,
  },
  actionCardTitle: {
    color: '#fff',
    fontSize: 14.5,
    fontWeight: '700',
    marginBottom: 2,
  },
  actionCardSub: {
    color: Colors.textSecondary,
    fontSize: 11,
    lineHeight: 15,
  },

  // Input bar
  inputBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 8,
    paddingBottom: Platform.OS === 'ios' ? 20 : 10,
    backgroundColor: '#0f0f1e',
    borderTopWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
    gap: 4,
  },
  iconBtn: {
    padding: 8,
  },
  input: {
    flex: 1,
    color: '#fff',
    fontSize: 15,
    minHeight: 40,
    maxHeight: 110,
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === 'ios' ? 10 : 6,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    marginHorizontal: 4,
  },
  sendBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: Colors.indigo,
    justifyContent: 'center',
    alignItems: 'center',
    ...Shadows.glow,
  },
  sendBtnDisabled: {
    backgroundColor: 'rgba(99,102,241,0.35)',
    shadowOpacity: 0,
    elevation: 0,
  },
});

export default AIChatbotScreen;
