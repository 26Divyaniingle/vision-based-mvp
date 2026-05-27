import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions,
  StatusBar,
  Easing,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Shield, Sparkles, Video, Mic, Volume2, VolumeX, ArrowRight } from 'lucide-react-native';
import { Colors, Shadows } from '../../theme';
import Svg, { Rect, Circle, Ellipse, Path, Defs, LinearGradient as SvgGradient, Stop } from 'react-native-svg';
import * as Speech from 'expo-speech';

const { width: SCREEN_W } = Dimensions.get('window');

const getMessages = (lang, name) => {
  const formattedName = name || '';
  switch (lang) {
    case 'Hindi':
      return [
        `नमस्ते ${formattedName || 'जी'}! मैं मेडसेंस हूँ, आपका सुरक्षित एआई क्लीनिकल सहायक। 🤖`,
        "हम आपकी निजी परामर्श की तैयारी कर रहे हैं। मैं आपके लक्षणों की जांच करूँगा और एक विस्तृत रिपोर्ट तैयार करने के लिए आपके भावनात्मक स्वास्थ्य का विश्लेषण करूँगा।",
        "आपकी गोपनीयता हमारी प्राथमिकता है। सभी ऑडियो और चेहरे की निगरानी एन्क्रिप्टेड है और सुरक्षित रूप से संग्रहीत की जाती है।",
        "कृपया सुनिश्चित करें कि आप एक शांत और अच्छी रोशनी वाले कमरे में हैं, और जब आप तैयार हों तो चलिए शुरू करते हैं! ✨"
      ];
    case 'Marathi':
      return [
        `नमस्कार ${formattedName}! मी मेडसेन्स आहे, तुमचा सुरक्षित एआय क्लिनिकल सहाय्यक. 🤖`,
        "आम्ही तुमची खाजगी सल्लामसलत सेट करत आहोत. मी तुमच्या लक्षणांची तपासणी करेन आणि तपशीलवार अहवाल तयार करण्यासाठी तुमच्या भावनिक आरोग्याचे विश्लेषण करेन.",
        "तुमची गोपनीयता ही आमची प्राथमिकता आहे. सर्व ऑडिओ आणि चेहऱ्याचे मॉनिटरिंग एन्क्रिप्टेड आहे आणि सुरक्षितपणे साठवले जाते.",
        "कृपया खात्री करा की तुम्ही शांत आणि चांगल्या प्रकाश असलेल्या खोलीत आहात, आणि तुम्ही तयार असाल तेव्हा आपण सुरू करूया! ✨"
      ];
    case 'Hinglish':
      return [
        `Hello ${formattedName}! Main MedSense hoon, aapka secure AI Clinical Assistant. 🤖`,
        "Hum aapki private consultation set up kar rahe hain. Main aapke symptoms ko scan karunga aur emotional vitals ko analyze karke ek detailed report taiyar karunga.",
        "Aapki privacy hamari priority hai. Sabhi audio aur facial monitoring encrypted hain aur surakshit tarike se store kiye jaate hain.",
        "Please ensure karein ki aap ek shant aur achhi roshni wale kamre mein hain, aur jab aap ready hon toh chaliye shuru karte hain! ✨"
      ];
    case 'English':
    default:
      return [
        `Hello ${formattedName || 'there'}! I'm MedSense, your secure AI Clinical Assistant. 🤖`,
        "We are setting up your private consultation. I will scan your symptoms and analyze your emotional vitals to compile a comprehensive report.",
        "Your privacy is our priority. All audio and facial monitoring is encrypted and stored securely.",
        "Please make sure you are in a quiet, well-lit room, and let's begin when you are ready! ✨"
      ];
  }
};

const getTranslations = (lang) => {
  switch (lang) {
    case 'Hindi':
      return {
        checkCamera: "पहचान के लिए कैमरा चालू",
        checkMic: "ऑडियो माइक्रोफोन तैयार",
        checkSpeaker: "ध्वनि स्पीकर सक्षम",
        btnProceed: "परामर्श कक्ष में प्रवेश करें",
        btnSkip: "परिचय छोड़ें और आगे बढ़ें",
        tapContinue: "आगे बढ़ने के लिए टैप करें...",
        typing: "लिखा जा रहा है...",
        hipaaBadge: "हिपा (HIPAA) अनुपालन और सुरक्षित",
      };
    case 'Marathi':
      return {
        checkCamera: "ओळख पटवण्यासाठी कॅमेरा सुरू",
        checkMic: "ऑडिओ मायक्रोफोन तयार",
        checkSpeaker: "ध्वनी स्पीकर सक्षम",
        btnProceed: "सल्लामसलत कक्षात प्रवेश करा",
        btnSkip: "परिचय वगळा आणि पुढे जा",
        tapContinue: "पुढे जाण्यासाठी टॅप करा...",
        typing: "टाईप होत आहे...",
        hipaaBadge: "HIPAA सुसंगत आणि सुरक्षित",
      };
    case 'Hinglish':
      return {
        checkCamera: "Identity ke liye Camera On",
        checkMic: "Audio Microphone Ready",
        checkSpeaker: "Sound Speaker Enabled",
        btnProceed: "Consultation Room mein enter karein",
        btnSkip: "Intro Skip karein & Aage badhein",
        tapContinue: "Aage badhne ke liye Tap karein...",
        typing: "Typing...",
        hipaaBadge: "HIPAA COMPLIANT & SECURE",
      };
    case 'English':
    default:
      return {
        checkCamera: "Camera On for Identity",
        checkMic: "Audio Microphone Ready",
        checkSpeaker: "Sound Speaker Enabled",
        btnProceed: "Enter Consultation Room",
        btnSkip: "Skip Intro & Proceed",
        tapContinue: "Tap to continue...",
        typing: "Typing...",
        hipaaBadge: "HIPAA COMPLIANT & SECURE",
      };
  }
};

const ConsultationIntroScreen = ({ route, navigation }) => {
  const { sessionId, language, patient } = route.params;

  // Animation values
  const floatAnim = useRef(new Animated.Value(0)).current;      // Floating robot
  const tiltAnim = useRef(new Animated.Value(0)).current;       // 3D Tilt Y rotation
  const pitchAnim = useRef(new Animated.Value(0)).current;      // 3D Tilt X rotation
  const blinkAnim = useRef(new Animated.Value(1)).current;      // Eye height scaling
  const waveAnim = useRef(new Animated.Value(0)).current;       // Right arm waving rotation
  const chestPulse = useRef(new Animated.Value(0.4)).current;    // Chest light opacity
  const shadowScale = useRef(new Animated.Value(1)).current;    // Floating shadow scaling
  const textOpacity = useRef(new Animated.Value(0)).current;    // Greeting text fade
  const btnAnim = useRef(new Animated.Value(0)).current;        // Button fade/slide
  const mouthAnim = useRef(new Animated.Value(1)).current;      // Mouth wiggling animation

  const [messageIndex, setMessageIndex] = useState(0);
  const [typedText, setTypedText] = useState('');
  const [isTypingDone, setIsTypingDone] = useState(false);
  const [isMuted, setIsMuted] = useState(false);

  const messages = getMessages(language, patient?.name);
  const trans = getTranslations(language);

  // Helper to read the current instruction aloud
  const speakCurrentMessage = (index, forceSpeak = false) => {
    if (isMuted && !forceSpeak) return;

    Speech.stop();

    const fullText = messages[index];
    // Remove emojis for cleaner text-to-speech reading
    const cleanText = fullText.replace(/[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD10-\uDDFF]/g, '');

    let speechLanguage = 'en-US';
    if (language === 'Hindi') {
      speechLanguage = 'hi-IN';
    } else if (language === 'Marathi') {
      speechLanguage = 'mr-IN';
    } else if (language === 'Hinglish') {
      speechLanguage = 'en-IN';
    }

    Speech.speak(cleanText, {
      language: speechLanguage,
      pitch: 1.0,
      rate: 0.95,
    });
  };

  const toggleMute = () => {
    if (!isMuted) {
      Speech.stop();
      setIsMuted(true);
    } else {
      setIsMuted(false);
      speakCurrentMessage(messageIndex, true);
    }
  };

  // Mouth wiggling animation loop while typing/speaking is in progress
  useEffect(() => {
    let animation;
    if (!isTypingDone) {
      animation = Animated.loop(
        Animated.sequence([
          Animated.timing(mouthAnim, {
            toValue: 3.5, // scale height up
            duration: 120,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(mouthAnim, {
            toValue: 1.0, // scale height down
            duration: 120,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ])
      );
      animation.start();
    } else {
      Animated.timing(mouthAnim, {
        toValue: 1.0,
        duration: 150,
        useNativeDriver: true,
      }).start();
    }
    return () => {
      if (animation) animation.stop();
    };
  }, [isTypingDone]);

  // Clean up Speech when component unmounts
  useEffect(() => {
    return () => {
      Speech.stop();
    };
  }, []);

  // 1. Robot movement loops
  useEffect(() => {
    // Floating Loop
    Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(floatAnim, {
            toValue: -15,
            duration: 2000,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(shadowScale, {
            toValue: 0.8,
            duration: 2000,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ]),
        Animated.parallel([
          Animated.timing(floatAnim, {
            toValue: 0,
            duration: 2000,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(shadowScale, {
            toValue: 1.0,
            duration: 2000,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ]),
      ])
    ).start();

    // 3D Tilt (Orbiting rotation)
    Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(tiltAnim, {
            toValue: 1, // tilt right
            duration: 3000,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(pitchAnim, {
            toValue: 1, // tilt down
            duration: 3000,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ]),
        Animated.parallel([
          Animated.timing(tiltAnim, {
            toValue: -1, // tilt left
            duration: 3000,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(pitchAnim, {
            toValue: -1, // tilt up
            duration: 3000,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ]),
      ])
    ).start();

    // Chest Light Pulse
    Animated.loop(
      Animated.sequence([
        Animated.timing(chestPulse, {
          toValue: 1.0,
          duration: 1200,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(chestPulse, {
          toValue: 0.3,
          duration: 1200,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Periodic Waving
    const triggerWave = () => {
      Animated.sequence([
        Animated.timing(waveAnim, {
          toValue: 1,
          duration: 350,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(waveAnim, {
          toValue: -0.3,
          duration: 300,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(waveAnim, {
          toValue: 0.6,
          duration: 300,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(waveAnim, {
          toValue: 0,
          duration: 400,
          easing: Easing.in(Easing.ease),
          useNativeDriver: true,
        }),
      ]).start();
    };

    // Wave every 6 seconds
    const waveInterval = setInterval(triggerWave, 6000);
    // Initial wave after 1s
    setTimeout(triggerWave, 1000);

    // Periodic Eye Blinking
    const blinkInterval = setInterval(() => {
      Animated.sequence([
        Animated.timing(blinkAnim, {
          toValue: 0,
          duration: 100,
          useNativeDriver: true,
        }),
        Animated.timing(blinkAnim, {
          toValue: 1,
          duration: 120,
          useNativeDriver: true,
        }),
      ]).start();
    }, 4500);

    return () => {
      clearInterval(waveInterval);
      clearInterval(blinkInterval);
    };
  }, []);

  // 2. Message Typing Animation & TTS Trigger
  useEffect(() => {
    let index = 0;
    setTypedText('');
    setIsTypingDone(false);
    textOpacity.setValue(1);

    const fullMessage = messages[messageIndex];
    
    // Start speaking the message when typing starts
    speakCurrentMessage(messageIndex);

    const typingInterval = setInterval(() => {
      setTypedText(() => fullMessage.substring(0, index + 1));
      index++;
      if (index >= fullMessage.length) {
        clearInterval(typingInterval);
        setIsTypingDone(true);
        // If it's the last message, reveal the button
        if (messageIndex === messages.length - 1) {
          Animated.timing(btnAnim, {
            toValue: 1,
            duration: 800,
            easing: Easing.out(Easing.back(1.2)),
            useNativeDriver: true,
          }).start();
        }
      }
    }, 30); // 30ms per character typing speed

    return () => clearInterval(typingInterval);
  }, [messageIndex]);

  const handleNextMessage = () => {
    if (!isTypingDone) {
      // Fast forward typing
      setTypedText(messages[messageIndex]);
      setIsTypingDone(true);
      if (messageIndex === messages.length - 1) {
        Animated.timing(btnAnim, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }).start();
      }
      return;
    }

    if (messageIndex < messages.length - 1) {
      // Animate text fading out briefly, then advance
      Animated.timing(textOpacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start(() => {
        setMessageIndex(prev => prev + 1);
      });
    } else {
      // Last message clicked next -> Proceed
      handleProceed();
    }
  };

  const handleProceed = () => {
    Speech.stop();
    navigation.replace('Consultation', { sessionId, language, patient });
  };

  // Interpolating values for 3D illusion
  const rotateY = tiltAnim.interpolate({
    inputRange: [-1, 1],
    outputRange: ['-18deg', '18deg'],
  });

  const rotateX = pitchAnim.interpolate({
    inputRange: [-1, 1],
    outputRange: ['-12deg', '12deg'],
  });

  const bodyRotateY = tiltAnim.interpolate({
    inputRange: [-1, 1],
    outputRange: ['-8deg', '8deg'],
  });

  const armRotation = waveAnim.interpolate({
    inputRange: [-1, 1],
    outputRange: ['-45deg', '120deg'],
  });

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right', 'bottom']}>
      <StatusBar barStyle="light-content" backgroundColor="#05050f" />
      <LinearGradient
        colors={['#05050f', '#0c0b24', '#05050f']}
        style={styles.gradientBg}
      >
        {/* Decorative Grid Lines / Stars */}
        <View style={styles.gridOverlay}>
          <View style={[styles.glowOrb, { top: '15%', left: '10%', backgroundColor: 'rgba(99,102,241,0.12)' }]} />
          <View style={[styles.glowOrb, { bottom: '25%', right: '5%', backgroundColor: 'rgba(168,85,247,0.15)' }]} />
        </View>

        {/* Header bar */}
        <View style={styles.header}>
          <View style={styles.shieldBadge}>
            <Shield size={14} color={Colors.emerald} />
            <Text style={styles.shieldText}>{trans.hipaaBadge}</Text>
          </View>
        </View>

        {/* Main Content Area */}
        <View style={styles.content}>
          {/* Animated 3D Robot Visualizer Container */}
          <View style={styles.robotContainer}>
            {/* Hologram Portal Ring behind / underneath the robot */}
            <View style={styles.portalContainer}>
              <View style={styles.portalRingOuter} />
              <View style={styles.portalRingInner} />
              <Animated.View 
                style={[
                  styles.robotShadow,
                  { transform: [{ scale: shadowScale }] }
                ]} 
              />
            </View>

            {/* Robot character */}
            <Animated.View
              style={[
                styles.robotCharacter,
                {
                  transform: [
                    { translateY: floatAnim },
                    { rotateY: rotateY },
                    { rotateX: rotateX },
                  ]
                }
              ]}
            >
              {/* Floating Head */}
              <Animated.View style={styles.headContainer}>
                {/* Antenna */}
                <View style={styles.antennaPole} />
                <Animated.View style={[styles.antennaTip, { opacity: chestPulse }]} />

                {/* Ears */}
                <View style={styles.earLeft} />
                <View style={styles.earRight} />

                {/* Head Shell */}
                <LinearGradient
                  colors={['#ffffff', '#cbd5e1', '#94a3b8']}
                  style={styles.headShell}
                >
                  {/* Glossy Black Faceplate */}
                  <View style={styles.faceplate}>
                    {/* Glowing LED Eyes */}
                    <View style={styles.eyesRow}>
                      <Animated.View 
                        style={[
                          styles.eye, 
                          { transform: [{ scaleY: blinkAnim }] }
                        ]} 
                      />
                      <Animated.View 
                        style={[
                          styles.eye, 
                          { transform: [{ scaleY: blinkAnim }] }
                        ]} 
                      />
                    </View>
                    {/* Subtle Mouth Line */}
                    <Animated.View style={[styles.mouth, { transform: [{ scaleY: mouthAnim }] }]} />
                  </View>
                </LinearGradient>
              </Animated.View>

              {/* Robot Body / Neck Joint */}
              <View style={styles.neckJoint} />

              <Animated.View
                style={[
                  styles.bodyContainer,
                  { transform: [{ rotateY: bodyRotateY }] }
                ]}
              >
                {/* Right Arm (Waving) */}
                <Animated.View 
                  style={[
                    styles.armRight,
                    { 
                      transform: [{ rotate: armRotation }],
                      transformOrigin: 'top',
                    }
                  ]}
                >
                  <LinearGradient
                    colors={['#ffffff', '#cbd5e1']}
                    style={styles.armSegment}
                  />
                  <View style={styles.glowingHand} />
                </Animated.View>

                {/* Left Arm (Floating Idle) */}
                <View style={styles.armLeft}>
                  <LinearGradient
                    colors={['#ffffff', '#cbd5e1']}
                    style={styles.armSegment}
                  />
                  <View style={styles.glowingHand} />
                </View>

                {/* Torso Shell */}
                <LinearGradient
                  colors={['#ffffff', '#e2e8f0', '#cbd5e1']}
                  style={styles.torsoShell}
                >
                  {/* Glowing Core Power Plate */}
                  <LinearGradient
                    colors={['#6366f1', '#a855f7']}
                    style={styles.corePlate}
                  >
                    <Animated.View 
                      style={[
                        styles.coreGlow, 
                        { opacity: chestPulse, transform: [{ scale: chestPulse }] }
                      ]} 
                    />
                    <Sparkles size={12} color="#fff" style={styles.coreIcon} />
                  </LinearGradient>

                  {/* Glass panel markings */}
                  <View style={styles.torsoLine} />
                </LinearGradient>
              </Animated.View>
            </Animated.View>
          </View>

          {/* Interactive Speech bubble */}
          <TouchableOpacity 
            activeOpacity={0.9} 
            onPress={handleNextMessage}
            style={styles.bubbleContainer}
          >
            <View style={styles.bubbleArrow} />
            <Animated.View style={[styles.bubbleCard, { opacity: textOpacity }]}>
              <View style={styles.botTitleRow}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <View style={styles.botBadge}>
                    <Text style={styles.botBadgeText}>MEDSENSE AI</Text>
                  </View>
                  <TouchableOpacity
                    onPress={toggleMute}
                    activeOpacity={0.7}
                    style={styles.speakerBtn}
                  >
                    {isMuted ? (
                      <VolumeX size={14} color="rgba(255,255,255,0.4)" />
                    ) : (
                      <Volume2 size={14} color="#818cf8" />
                    )}
                  </TouchableOpacity>
                </View>
                <View style={styles.pageIndicator}>
                  {messages.map((_, idx) => (
                    <View 
                      key={idx} 
                      style={[
                        styles.dot, 
                        messageIndex === idx ? styles.activeDot : null
                      ]} 
                    />
                  ))}
                </View>
              </View>

              <Text style={styles.typedText}>
                {typedText}
                {!isTypingDone && <Text style={styles.cursor}>|</Text>}
              </Text>

              <View style={styles.bubbleFooter}>
                <Text style={styles.bubbleTip}>
                  {isTypingDone ? trans.tapContinue : trans.typing}
                </Text>
              </View>
            </Animated.View>
          </TouchableOpacity>

          {/* Quick Pre-Check Checklist */}
          <View style={styles.checklist}>
            <View style={styles.checkItem}>
              <View style={styles.checkIconWrapper}>
                <Video size={14} color="#6366f1" />
              </View>
              <Text style={styles.checkText}>{trans.checkCamera}</Text>
            </View>
            <View style={styles.checkItem}>
              <View style={styles.checkIconWrapper}>
                <Mic size={14} color="#a855f7" />
              </View>
              <Text style={styles.checkText}>{trans.checkMic}</Text>
            </View>
            <View style={styles.checkItem}>
              <View style={styles.checkIconWrapper}>
                <Volume2 size={14} color="#10b981" />
              </View>
              <Text style={styles.checkText}>{trans.checkSpeaker}</Text>
            </View>
          </View>
        </View>

        {/* Footer Area - Beautiful Proceed Button */}
        <View style={styles.footer}>
          <Animated.View
            style={[
              styles.btnContainer,
              {
                opacity: btnAnim,
                transform: [
                  { translateY: btnAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [20, 0]
                  })}
                ]
              }
            ]}
          >
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={handleProceed}
              style={styles.proceedButton}
            >
              <LinearGradient
                colors={Colors.gradientPrimary}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.buttonGradient}
              >
                <Text style={styles.proceedText}>{trans.btnProceed}</Text>
                <ArrowRight size={18} color="#fff" />
              </LinearGradient>
            </TouchableOpacity>
          </Animated.View>

          <TouchableOpacity onPress={handleProceed} style={styles.skipBtn}>
            <Text style={styles.skipText}>{trans.btnSkip}</Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#05050f',
  },
  gradientBg: {
    flex: 1,
    justifyContent: 'space-between',
  },
  gridOverlay: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
  },
  glowOrb: {
    position: 'absolute',
    width: 250,
    height: 250,
    borderRadius: 125,
    opacity: 0.5,
    blurRadius: 100, // Conceptually blurry
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 15,
    alignItems: 'center',
  },
  shieldBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.25)',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 12,
    gap: 6,
  },
  shieldText: {
    color: '#10b981',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.2,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  robotContainer: {
    height: 240,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    position: 'relative',
  },
  portalContainer: {
    position: 'absolute',
    bottom: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  portalRingOuter: {
    width: 140,
    height: 40,
    borderRadius: 70 / 20, // oval
    borderWidth: 2,
    borderColor: 'rgba(99, 102, 241, 0.4)',
    transform: [{ scaleX: 3.5 }, { rotateX: '65deg' }],
  },
  portalRingInner: {
    position: 'absolute',
    width: 90,
    height: 26,
    borderRadius: 45 / 13,
    borderWidth: 1.5,
    borderColor: 'rgba(168, 85, 247, 0.5)',
    transform: [{ scaleX: 3.5 }, { rotateX: '65deg' }],
  },
  robotShadow: {
    position: 'absolute',
    width: 80,
    height: 18,
    borderRadius: 40,
    backgroundColor: 'rgba(5, 5, 15, 0.6)',
    transform: [{ scaleX: 1.5 }],
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 15,
    elevation: 8,
  },
  robotCharacter: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 160,
    height: 200,
  },
  headContainer: {
    alignItems: 'center',
    position: 'relative',
    zIndex: 2,
  },
  antennaPole: {
    width: 3,
    height: 14,
    backgroundColor: '#64748b',
    marginBottom: -2,
  },
  antennaTip: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#a855f7',
    position: 'absolute',
    top: -6,
    shadowColor: '#a855f7',
    shadowRadius: 6,
    shadowOpacity: 0.8,
    elevation: 5,
  },
  earLeft: {
    position: 'absolute',
    left: -6,
    top: 25,
    width: 8,
    height: 20,
    borderRadius: 3,
    backgroundColor: '#475569',
  },
  earRight: {
    position: 'absolute',
    right: -6,
    top: 25,
    width: 8,
    height: 20,
    borderRadius: 3,
    backgroundColor: '#475569',
  },
  headShell: {
    width: 86,
    height: 64,
    borderRadius: 22,
    borderWidth: 1.5,
    borderColor: '#cbd5e1',
    padding: 6,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  faceplate: {
    width: '100%',
    height: '100%',
    backgroundColor: '#070712',
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#334155',
  },
  eyesRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 4,
  },
  eye: {
    width: 14,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#00f2fe',
    shadowColor: '#00f2fe',
    shadowRadius: 5,
    shadowOpacity: 0.9,
    elevation: 6,
  },
  mouth: {
    width: 20,
    height: 2,
    backgroundColor: 'rgba(0, 242, 254, 0.4)',
    borderRadius: 1,
  },
  neckJoint: {
    width: 16,
    height: 12,
    backgroundColor: '#334155',
    marginTop: -4,
    borderRadius: 4,
    zIndex: 1,
  },
  bodyContainer: {
    width: 100,
    height: 80,
    position: 'relative',
    alignItems: 'center',
    zIndex: 1,
  },
  torsoShell: {
    width: 84,
    height: 72,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#cbd5e1',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
  },
  corePlate: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  coreGlow: {
    position: 'absolute',
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#00f2fe',
    shadowColor: '#00f2fe',
    shadowRadius: 10,
    shadowOpacity: 0.8,
  },
  coreIcon: {
    zIndex: 2,
  },
  torsoLine: {
    position: 'absolute',
    bottom: 8,
    width: 40,
    height: 2,
    backgroundColor: '#cbd5e1',
    opacity: 0.5,
  },
  armLeft: {
    position: 'absolute',
    left: -14,
    top: 10,
    alignItems: 'center',
    width: 16,
  },
  armRight: {
    position: 'absolute',
    right: -14,
    top: 10,
    alignItems: 'center',
    width: 16,
  },
  armSegment: {
    width: 10,
    height: 45,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: '#cbd5e1',
  },
  glowingHand: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#00f2fe',
    marginTop: -4,
    shadowColor: '#00f2fe',
    shadowRadius: 4,
    shadowOpacity: 0.8,
  },
  bubbleContainer: {
    width: '100%',
    marginTop: 20,
    marginBottom: 20,
    position: 'relative',
    zIndex: 10,
  },
  bubbleArrow: {
    position: 'absolute',
    top: -8,
    left: '50%',
    marginLeft: -8,
    width: 16,
    height: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderLeftWidth: 1,
    borderTopWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    transform: [{ rotate: '45deg' }],
  },
  bubbleCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 20,
    padding: 18,
    minHeight: 120,
    justifyContent: 'space-between',
    ...Shadows.card,
  },
  botTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  botBadge: {
    backgroundColor: 'rgba(99, 102, 241, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  botBadgeText: {
    color: '#818cf8',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  pageIndicator: {
    flexDirection: 'row',
    gap: 4,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  activeDot: {
    backgroundColor: '#6366f1',
    width: 12,
  },
  typedText: {
    color: '#fff',
    fontSize: 14.5,
    lineHeight: 22,
    fontWeight: '500',
    minHeight: 48,
  },
  cursor: {
    color: '#6366f1',
    fontWeight: 'bold',
  },
  bubbleFooter: {
    alignItems: 'flex-end',
    marginTop: 10,
  },
  bubbleTip: {
    color: Colors.textMuted,
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  checklist: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    paddingVertical: 14,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
    marginBottom: 15,
  },
  checkItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  checkIconWrapper: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(255,255,255,0.04)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkText: {
    color: Colors.textSecondary,
    fontSize: 10.5,
    fontWeight: '600',
  },
  footer: {
    width: '100%',
    paddingHorizontal: 24,
    paddingBottom: 25,
    alignItems: 'center',
    gap: 12,
  },
  btnContainer: {
    width: '100%',
  },
  proceedButton: {
    width: '100%',
    borderRadius: 18,
    overflow: 'hidden',
    ...Shadows.glow,
  },
  buttonGradient: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 16,
    gap: 8,
  },
  proceedText: {
    color: '#fff',
    fontSize: 15.5,
    fontWeight: '700',
  },
  skipBtn: {
    paddingVertical: 4,
  },
  skipText: {
    color: Colors.textMuted,
    fontSize: 12,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
  speakerBtn: {
    padding: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default ConsultationIntroScreen;
