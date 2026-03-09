/**
 * TrueReact - Calibration Screen
 * 
 * Guides users through initial calibration to establish baseline metrics.
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions,
} from 'react-native';
import { Camera, CameraView, useCameraPermissions } from 'expo-camera';
import { Audio } from 'expo-av';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../App';
const AnimatedView = Animated.View as unknown as React.ComponentType<any>;
const { width, height } = Dimensions.get('window');

type CalibrationScreenProps = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Calibration'>;
};

type CalibrationStep = {
  id: number;
  title: string;
  instruction: string;
  duration: number; // in seconds
};

const CALIBRATION_STEPS: CalibrationStep[] = [
  {
    id: 1,
    title: 'Neutral Expression',
    instruction: 'Look at the camera with a relaxed, neutral expression',
    duration: 5,
  },
  {
    id: 2,
    title: 'Natural Speech',
    instruction: 'Say: "Hello, my name is..." at your normal pace',
    duration: 8,
  },
  {
    id: 3,
    title: 'Genuine Smile',
    instruction: 'Think of something that makes you happy and smile naturally',
    duration: 5,
  },
  {
    id: 4,
    title: 'Engaged Listening',
    instruction: 'Show your "listening" expression - as if someone is talking to you',
    duration: 5,
  },
];

export default function CalibrationScreen({ navigation }: CalibrationScreenProps) {
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [audioPermission, setAudioPermission] = useState<boolean>(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [isCalibrating, setIsCalibrating] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [isComplete, setIsComplete] = useState(false);
  
  const progressAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const cameraRef = useRef<CameraView>(null);

  useEffect(() => {
    requestPermissions();
  }, []);

  useEffect(() => {
    // Pulse animation for recording indicator
    if (isCalibrating) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.2,
            duration: 500,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      pulseAnim.setValue(1);
    }
  }, [isCalibrating]);

  const requestPermissions = async () => {
    const cameraResult = await requestCameraPermission();
    const audioResult = await Audio.requestPermissionsAsync();
    setAudioPermission(audioResult.granted);
  };

  const startCalibration = async () => {
    setIsCalibrating(true);
    setCurrentStep(0);
    
    for (let i = 0; i < CALIBRATION_STEPS.length; i++) {
      setCurrentStep(i);
      const step = CALIBRATION_STEPS[i];
      
      // Countdown for this step
      for (let j = step.duration; j > 0; j--) {
        setCountdown(j);
        await new Promise<void>(resolve => setTimeout(resolve, 1000));
      }
      
      // Update progress
      Animated.timing(progressAnim, {
        toValue: (i + 1) / CALIBRATION_STEPS.length,
        duration: 300,
        useNativeDriver: false,
      }).start();
    }
    
    setIsCalibrating(false);
    setIsComplete(true);
  };

  const proceedToSession = () => {
    navigation.replace('Session', {});
  };

  if (!cameraPermission?.granted || !audioPermission) {
    return (
      <LinearGradient colors={['#1A1625', '#252136']} style={styles.container}>
        <View style={styles.permissionContainer}>
          <Ionicons name="camera-outline" size={64} color="#F5A623" />
          <Text style={styles.permissionTitle}>Permissions Required</Text>
          <Text style={styles.permissionText}>
            TrueReact needs camera and microphone access to analyze your expressions and voice.
          </Text>
          <TouchableOpacity style={styles.permissionButton} onPress={requestPermissions}>
            <Text style={styles.permissionButtonText}>Grant Permissions</Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>
    );
  }

  if (isComplete) {
    return (
      <LinearGradient colors={['#1A1625', '#252136']} style={styles.container}>
        <View style={styles.completeContainer}>
          <View style={styles.checkCircle}>
            <Ionicons name="checkmark" size={64} color="#7BC67E" />
          </View>
          <Text style={styles.completeTitle}>Calibration Complete!</Text>
          <Text style={styles.completeText}>
            Your baseline has been established. TrueReact is ready to coach you.
          </Text>
          <TouchableOpacity style={styles.proceedButton} onPress={proceedToSession}>
            <LinearGradient
              colors={['#F5A623', '#D4920D']}
              style={styles.proceedButtonGradient}
            >
              <Text style={styles.proceedButtonText}>Start Coaching</Text>
              <Ionicons name="arrow-forward" size={20} color="#fff" />
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </LinearGradient>
    );
  }

  return (
    <View style={styles.container}>
      {/* Camera Preview */}
      <CameraView
        ref={cameraRef}
        style={styles.camera}
        facing="front"
      >
        {/* Overlay */}
        <LinearGradient
          colors={['rgba(26, 22, 37, 0.3)', 'rgba(26, 22, 37, 0.7)']}
          style={styles.overlay}
        >
          {/* Face Guide */}
          <View style={styles.faceGuide}>
            <View style={styles.faceGuideInner} />
          </View>

          {/* Recording Indicator */}
          {isCalibrating && (
            <View style={styles.recordingContainer}>
              <AnimatedView style={[styles.recordingDot, { transform: [{ scale: pulseAnim }] }]} />
                style={[
                  styles.recordingDot,
                  { transform: [{ scale: pulseAnim }] },
                ]}
              
              <Text style={styles.recordingText}>Recording</Text>
            </View>
          )}

          {/* Progress Bar */}
          <View style={styles.progressContainer}>
            <AnimatedView style={[styles.progressBar, { width: progressAnim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }) }]} />
              style={[
                styles.progressBar,
                {
                  width: progressAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: ['0%', '100%'],
                  }),
                },
              ]}
            
          </View>

          {/* Instruction Card */}
          <View style={styles.instructionCard}>
            {isCalibrating ? (
              <>
                <Text style={styles.stepIndicator}>
                  Step {currentStep + 1} of {CALIBRATION_STEPS.length}
                </Text>
                <Text style={styles.instructionTitle}>
                  {CALIBRATION_STEPS[currentStep].title}
                </Text>
                <Text style={styles.instructionText}>
                  {CALIBRATION_STEPS[currentStep].instruction}
                </Text>
                <View style={styles.countdownContainer}>
                  <Text style={styles.countdown}>{countdown}</Text>
                </View>
              </>
            ) : (
              <>
                <Text style={styles.instructionTitle}>Ready to Calibrate</Text>
                <Text style={styles.instructionText}>
                  Position your face in the frame and we'll establish your baseline
                  expressions and voice patterns.
                </Text>
                <TouchableOpacity
                  style={styles.startCalibrationButton}
                  onPress={startCalibration}
                >
                  <LinearGradient
                    colors={['#F5A623', '#D4920D']}
                    style={styles.startCalibrationGradient}
                  >
                    <Ionicons name="play" size={20} color="#fff" />
                    <Text style={styles.startCalibrationText}>Begin Calibration</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </>
            )}
          </View>
        </LinearGradient>
      </CameraView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1A1625',
  },
  camera: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    justifyContent: 'space-between',
    padding: 24,
  },
  faceGuide: {
    alignSelf: 'center',
    marginTop: 60,
    width: width * 0.6,
    height: width * 0.8,
    borderWidth: 2,
    borderColor: 'rgba(233, 69, 96, 0.5)',
    borderRadius: width * 0.3,
    justifyContent: 'center',
    alignItems: 'center',
  },
  faceGuideInner: {
    width: width * 0.55,
    height: width * 0.75,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: width * 0.275,
    borderStyle: 'dashed',
  },
  recordingContainer: {
    position: 'absolute',
    top: 50,
    right: 24,
    flexDirection: 'row',
    alignItems: 'center',
  },
  recordingDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#F5A623',
    marginRight: 8,
  },
  recordingText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  progressContainer: {
    position: 'absolute',
    top: 100,
    left: 24,
    right: 24,
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 2,
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#F5A623',
    borderRadius: 2,
  },
  instructionCard: {
    backgroundColor: 'rgba(26, 22, 37, 0.9)',
    borderRadius: 16,
    padding: 24,
    marginBottom: 24,
  },
  stepIndicator: {
    color: '#9B7EC6',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  instructionTitle: {
    color: '#F5F0E8',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  instructionText: {
    color: '#B8B0C8',
    fontSize: 14,
    lineHeight: 22,
  },
  countdownContainer: {
    alignItems: 'center',
    marginTop: 16,
  },
  countdown: {
    color: '#F5A623',
    fontSize: 48,
    fontWeight: 'bold',
  },
  startCalibrationButton: {
    marginTop: 16,
    borderRadius: 12,
    overflow: 'hidden',
  },
  startCalibrationGradient: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 14,
  },
  startCalibrationText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  permissionTitle: {
    color: '#F5F0E8',
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 24,
    marginBottom: 12,
  },
  permissionText: {
    color: '#B8B0C8',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 24,
  },
  permissionButton: {
    backgroundColor: '#F5A623',
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 12,
  },
  permissionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  completeContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  checkCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(74, 222, 128, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  completeTitle: {
    color: '#F5F0E8',
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  completeText: {
    color: '#B8B0C8',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 32,
  },
  proceedButton: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  proceedButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 32,
  },
  proceedButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginRight: 8,
  },
});
