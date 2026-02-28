/**
 * TrueReact - Badge Unlock Notification
 * 
 * Animated celebration modal when user unlocks a new badge.
 */

import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Animated,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Badge } from '../services/gamification';

const { width, height } = Dimensions.get('window');

type BadgeUnlockNotificationProps = {
  badge: Badge | null;
  visible: boolean;
  onDismiss: () => void;
};

export function BadgeUnlockNotification({
  badge,
  visible,
  onDismiss,
}: BadgeUnlockNotificationProps) {
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const confettiAnims = useRef(
    Array.from({ length: 20 }, () => ({
      x: new Animated.Value(0),
      y: new Animated.Value(0),
      rotate: new Animated.Value(0),
      opacity: new Animated.Value(1),
    }))
  ).current;

  useEffect(() => {
    if (visible && badge) {
      // Haptic feedback
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      // Badge entrance animation
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 50,
          friction: 6,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(rotateAnim, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
      ]).start();

      // Confetti animation
      confettiAnims.forEach((anim, i) => {
        const delay = i * 30;
        const randomX = (Math.random() - 0.5) * width;
        const randomRotate = Math.random() * 720 - 360;

        Animated.parallel([
          Animated.sequence([
            Animated.delay(delay),
            Animated.timing(anim.x, {
              toValue: randomX,
              duration: 1500,
              useNativeDriver: true,
            }),
          ]),
          Animated.sequence([
            Animated.delay(delay),
            Animated.timing(anim.y, {
              toValue: height * 0.6,
              duration: 1500,
              useNativeDriver: true,
            }),
          ]),
          Animated.sequence([
            Animated.delay(delay),
            Animated.timing(anim.rotate, {
              toValue: randomRotate,
              duration: 1500,
              useNativeDriver: true,
            }),
          ]),
          Animated.sequence([
            Animated.delay(delay + 1000),
            Animated.timing(anim.opacity, {
              toValue: 0,
              duration: 500,
              useNativeDriver: true,
            }),
          ]),
        ]).start();
      });
    }

    return () => {
      scaleAnim.setValue(0);
      opacityAnim.setValue(0);
      rotateAnim.setValue(0);
      confettiAnims.forEach((anim) => {
        anim.x.setValue(0);
        anim.y.setValue(0);
        anim.rotate.setValue(0);
        anim.opacity.setValue(1);
      });
    };
  }, [visible, badge]);

  const handleDismiss = () => {
    Animated.parallel([
      Animated.timing(scaleAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => onDismiss());
  };

  if (!badge) return null;

  const confettiColors = ['#F5A623', '#9B7EC6', '#4ECDC4', '#FFD166', '#7BC67E', '#E85A5A'];

  return (
    <Modal visible={visible} transparent animationType="none">
      <Animated.View style={[styles.overlay, { opacity: opacityAnim }]}>
        {/* Confetti particles */}
        {confettiAnims.map((anim, i) => (
          <Animated.View
            key={i}
            style={[
              styles.confetti,
              {
                backgroundColor: confettiColors[i % confettiColors.length],
                opacity: anim.opacity,
                transform: [
                  { translateX: anim.x },
                  { translateY: anim.y },
                  {
                    rotate: anim.rotate.interpolate({
                      inputRange: [-360, 360],
                      outputRange: ['-360deg', '360deg'],
                    }),
                  },
                ],
              },
            ]}
          />
        ))}

        <TouchableOpacity
          style={styles.touchableArea}
          activeOpacity={1}
          onPress={handleDismiss}
        >
          <Animated.View
            style={[
              styles.card,
              {
                transform: [
                  { scale: scaleAnim },
                  {
                    rotate: rotateAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: ['10deg', '0deg'],
                    }),
                  },
                ],
              },
            ]}
          >
            <LinearGradient
              colors={['#2D2845', '#1A1625']}
              style={styles.gradient}
            >
              {/* Glow effect */}
              <View
                style={[
                  styles.glow,
                  { backgroundColor: `${badge.color}20` },
                ]}
              />

              {/* Badge icon */}
              <View
                style={[
                  styles.badgeCircle,
                  { backgroundColor: `${badge.color}25` },
                ]}
              >
                <MaterialCommunityIcons
                  name={badge.icon as keyof typeof MaterialCommunityIcons.glyphMap}
                  size={64}
                  color={badge.color}
                />
              </View>

              {/* Title */}
              <Text style={styles.unlockText}>Badge Unlocked!</Text>
              <Text style={styles.badgeName}>{badge.name}</Text>
              <Text style={styles.badgeDescription}>{badge.description}</Text>

              {/* Points earned */}
              <View style={styles.pointsContainer}>
                <MaterialCommunityIcons
                  name="star-four-points"
                  size={18}
                  color="#F5A623"
                />
                <Text style={styles.pointsText}>+{badge.points} points</Text>
              </View>

              {/* Dismiss hint */}
              <Text style={styles.dismissHint}>Tap anywhere to continue</Text>
            </LinearGradient>
          </Animated.View>
        </TouchableOpacity>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  touchableArea: {
    flex: 1,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  confetti: {
    position: 'absolute',
    top: -20,
    left: width / 2 - 5,
    width: 10,
    height: 10,
    borderRadius: 2,
  },
  card: {
    width: width * 0.85,
    maxWidth: 340,
    borderRadius: 28,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(155, 126, 198, 0.3)',
  },
  gradient: {
    padding: 32,
    alignItems: 'center',
    position: 'relative',
  },
  glow: {
    position: 'absolute',
    top: -50,
    left: '50%',
    marginLeft: -100,
    width: 200,
    height: 200,
    borderRadius: 100,
    opacity: 0.5,
  },
  badgeCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  unlockText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#9B7EC6',
    textTransform: 'uppercase',
    letterSpacing: 2,
    marginBottom: 8,
  },
  badgeName: {
    fontSize: 26,
    fontWeight: '800',
    color: '#F5F0E8',
    textAlign: 'center',
    marginBottom: 8,
  },
  badgeDescription: {
    fontSize: 15,
    color: '#B8B0C8',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 20,
  },
  pointsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(245, 166, 35, 0.15)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    marginBottom: 20,
  },
  pointsText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#F5A623',
  },
  dismissHint: {
    fontSize: 12,
    color: '#7A7290',
  },
});

export default BadgeUnlockNotification;
