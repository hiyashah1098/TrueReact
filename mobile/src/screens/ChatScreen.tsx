import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import {
  sendMessage,
  subscribeToMessages,
  Message,
  getUserProfile,
  CommunityUser,
} from '../services/firebase';

interface ChatScreenProps {
  navigation: any;
  route: {
    params: {
      conversationId: string;
      otherUserId: string;
      displayName: string;
    };
  };
}

export default function ChatScreen({ navigation, route }: ChatScreenProps) {
  const { colors, isDark } = useTheme();
  const { user } = useAuth();
  const { conversationId, otherUserId, displayName } = route.params;
  
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [otherUser, setOtherUser] = useState<CommunityUser | null>(null);
  const [sending, setSending] = useState(false);
  
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    // Load other user's profile
    const loadProfile = async () => {
      const profile = await getUserProfile(otherUserId);
      if (profile) {
        setOtherUser({
          uid: profile.uid,
          displayName: profile.displayName || 'Anonymous',
          email: profile.email || '',
          photoURL: profile.photoURL || undefined,
        });
      }
    };
    loadProfile();

    // Subscribe to messages
    const unsubscribe = subscribeToMessages(conversationId, (newMessages) => {
      setMessages(newMessages);
      // Scroll to bottom on new messages
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    });

    return unsubscribe;
  }, [conversationId, otherUserId]);

  const handleSend = async () => {
    if (!newMessage.trim() || !user?.uid || sending) return;
    
    setSending(true);
    try {
      await sendMessage(conversationId, user.uid, newMessage.trim());
      setNewMessage('');
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (error) {
      Alert.alert('Error', 'Failed to send message');
    }
    setSending(false);
  };

  const handleCallRequest = async () => {
    Alert.alert(
      'Voice Call',
      'Would you like to send a call request to ' + displayName + '?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Send Request',
          onPress: async () => {
            if (!user?.uid) return;
            try {
              await sendMessage(conversationId, user.uid, 'Sent a voice call request', 'call_request');
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              Alert.alert('Request Sent', displayName + ' will be notified of your call request.');
            } catch (error) {
              Alert.alert('Error', 'Failed to send call request');
            }
          },
        },
      ]
    );
  };

  const handleVideoRequest = async () => {
    Alert.alert(
      'Video Call',
      'Would you like to send a video call request to ' + displayName + '?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Send Request',
          onPress: async () => {
            if (!user?.uid) return;
            try {
              await sendMessage(conversationId, user.uid, 'Sent a video call request', 'video_request');
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              Alert.alert('Request Sent', displayName + ' will be notified of your video call request.');
            } catch (error) {
              Alert.alert('Error', 'Failed to send video request');
            }
          },
        },
      ]
    );
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  };

  const formatDate = (date: Date) => {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
  };

  const renderMessage = ({ item, index }: { item: Message; index: number }) => {
    const isOwn = item.senderId === user?.uid;
    const showDateHeader = index === 0 || 
      formatDate(item.timestamp) !== formatDate(messages[index - 1].timestamp);

    return (
      <>
        {showDateHeader && (
          <View style={styles.dateHeader}>
            <Text style={[styles.dateHeaderText, { color: colors.textSecondary }]}>
              {formatDate(item.timestamp)}
            </Text>
          </View>
        )}
        <View style={[
          styles.messageContainer,
          isOwn ? styles.ownMessageContainer : styles.otherMessageContainer,
        ]}>
          {item.type === 'call_request' ? (
            <View style={[styles.callBubble, { backgroundColor: '#34C759' }]}>
              <Ionicons name="call" size={20} color="#FFF" />
              <Text style={styles.callText}>
                {isOwn ? 'You sent a call request' : displayName + ' wants to call you'}
              </Text>
            </View>
          ) : item.type === 'video_request' ? (
            <View style={[styles.callBubble, { backgroundColor: '#5856D6' }]}>
              <Ionicons name="videocam" size={20} color="#FFF" />
              <Text style={styles.callText}>
                {isOwn ? 'You sent a video request' : displayName + ' wants to video chat'}
              </Text>
            </View>
          ) : (
            <View style={[
              styles.messageBubble,
              isOwn 
                ? [styles.ownBubble, { backgroundColor: colors.primary }] 
                : [styles.otherBubble, { backgroundColor: isDark ? '#2C2C2E' : '#E9E9EB' }],
            ]}>
              <Text style={[
                styles.messageText,
                { color: isOwn ? '#FFF' : colors.text },
              ]}>
                {item.text}
              </Text>
            </View>
          )}
          <Text style={[styles.messageTime, { color: colors.textSecondary }]}>
            {formatTime(item.timestamp)}
          </Text>
        </View>
      </>
    );
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 16,
      paddingTop: 8,
      borderBottomWidth: 1,
      borderBottomColor: isDark ? '#2C2C2E' : '#E5E5E5',
    },
    backButton: {
      padding: 8,
      marginRight: 8,
    },
    headerInfo: {
      flex: 1,
    },
    headerName: {
      fontSize: 18,
      fontWeight: '600',
      color: colors.text,
    },
    headerStatus: {
      fontSize: 12,
      color: colors.textSecondary,
      marginTop: 2,
    },
    headerActions: {
      flexDirection: 'row',
      gap: 8,
    },
    headerButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: isDark ? '#2C2C2E' : '#F2F2F7',
    },
    messagesList: {
      flex: 1,
      paddingHorizontal: 16,
    },
    dateHeader: {
      alignItems: 'center',
      marginVertical: 16,
    },
    dateHeaderText: {
      fontSize: 12,
      fontWeight: '500',
    },
    messageContainer: {
      marginBottom: 8,
    },
    ownMessageContainer: {
      alignItems: 'flex-end',
    },
    otherMessageContainer: {
      alignItems: 'flex-start',
    },
    messageBubble: {
      maxWidth: '75%',
      paddingHorizontal: 16,
      paddingVertical: 10,
      borderRadius: 20,
    },
    ownBubble: {
      borderBottomRightRadius: 4,
    },
    otherBubble: {
      borderBottomLeftRadius: 4,
    },
    messageText: {
      fontSize: 16,
      lineHeight: 22,
    },
    messageTime: {
      fontSize: 11,
      marginTop: 4,
      marginHorizontal: 4,
    },
    callBubble: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderRadius: 16,
      gap: 8,
    },
    callText: {
      color: '#FFF',
      fontWeight: '500',
      fontSize: 14,
    },
    inputContainer: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      padding: 16,
      paddingBottom: 8,
      borderTopWidth: 1,
      borderTopColor: isDark ? '#2C2C2E' : '#E5E5E5',
    },
    textInputWrapper: {
      flex: 1,
      backgroundColor: isDark ? '#2C2C2E' : '#F2F2F7',
      borderRadius: 24,
      marginRight: 8,
      paddingHorizontal: 16,
      paddingVertical: 8,
      minHeight: 40,
      maxHeight: 100,
    },
    textInput: {
      fontSize: 16,
      color: colors.text,
      paddingVertical: 4,
    },
    sendButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: colors.primary,
      justifyContent: 'center',
      alignItems: 'center',
    },
    sendButtonDisabled: {
      opacity: 0.5,
    },
    emptyContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: 32,
    },
    emptyText: {
      fontSize: 16,
      color: colors.textSecondary,
      textAlign: 'center',
      marginTop: 16,
    },
  });

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <Text style={styles.headerName}>{displayName}</Text>
          <Text style={styles.headerStatus}>
            {otherUser?.isOnline ? 'Online' : 'Offline'}
          </Text>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.headerButton} onPress={handleCallRequest}>
            <Ionicons name="call" size={22} color="#34C759" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerButton} onPress={handleVideoRequest}>
            <Ionicons name="videocam" size={22} color="#5856D6" />
          </TouchableOpacity>
        </View>
      </View>

      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(item) => item.id || item.timestamp.toISOString()}
        renderItem={renderMessage}
        style={styles.messagesList}
        contentContainerStyle={{ paddingBottom: 16 }}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="chatbubbles-outline" size={64} color={colors.textSecondary} />
            <Text style={styles.emptyText}>
              Start a conversation with {displayName}
            </Text>
          </View>
        }
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={90}
      >
        <View style={styles.inputContainer}>
          <View style={styles.textInputWrapper}>
            <TextInput
              style={styles.textInput}
              placeholder="Message..."
              placeholderTextColor={colors.textSecondary}
              value={newMessage}
              onChangeText={setNewMessage}
              multiline
              maxLength={1000}
            />
          </View>
          <TouchableOpacity
            style={[
              styles.sendButton,
              (!newMessage.trim() || sending) && styles.sendButtonDisabled,
            ]}
            onPress={handleSend}
            disabled={!newMessage.trim() || sending}
          >
            <Ionicons name="send" size={20} color="#FFF" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
