/**
 * TrueReact - Interrupt Modal Component
 * 
 * Modal for handling "barge-in" interrupts during coaching sessions.
 * Allows users to ask questions like "Did that sound sarcastic?"
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

type Props = {
  visible: boolean;
  onClose: () => void;
  question: string;
  onQuestionChange: (text: string) => void;
  onSubmit: () => void;
  response: string | null;
  isProcessing: boolean;
};

const QUICK_QUESTIONS = [
  "Did that sound sarcastic?",
  "Was I speaking too fast?",
  "Did my expression match my words?",
  "How's my eye contact?",
];

export default function InterruptModal({
  visible,
  onClose,
  question,
  onQuestionChange,
  onSubmit,
  response,
  isProcessing,
}: Props) {
  const handleQuickQuestion = (q: string) => {
    onQuestionChange(q);
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.modalOverlay}
      >
        <TouchableOpacity 
          style={styles.backdrop} 
          activeOpacity={1} 
          onPress={onClose}
        />
        
        <View style={styles.modalContent}>
          <LinearGradient
            colors={['#1a1a2e', '#16213e']}
            style={styles.modalGradient}
          >
            {/* Header */}
            <View style={styles.header}>
              <View style={styles.headerLeft}>
                <Ionicons name="hand-left" size={24} color="#e94560" />
                <Text style={styles.headerTitle}>Quick Question</Text>
              </View>
              <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                <Ionicons name="close" size={24} color="#8b8b8b" />
              </TouchableOpacity>
            </View>

            <ScrollView 
              contentContainerStyle={styles.scrollContent}
              showsVerticalScrollIndicator={false}
            >
              {/* Quick Questions */}
              {!response && (
                <View style={styles.quickQuestionsSection}>
                  <Text style={styles.sectionLabel}>Quick questions:</Text>
                  <View style={styles.quickQuestions}>
                    {QUICK_QUESTIONS.map((q, index) => (
                      <TouchableOpacity
                        key={index}
                        style={[
                          styles.quickQuestionButton,
                          question === q && styles.quickQuestionButtonActive,
                        ]}
                        onPress={() => handleQuickQuestion(q)}
                      >
                        <Text
                          style={[
                            styles.quickQuestionText,
                            question === q && styles.quickQuestionTextActive,
                          ]}
                        >
                          {q}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              )}

              {/* Custom Question Input */}
              {!response && (
                <View style={styles.inputSection}>
                  <Text style={styles.sectionLabel}>Or ask your own:</Text>
                  <TextInput
                    style={styles.textInput}
                    placeholder="What would you like to know about your social signals?"
                    placeholderTextColor="#6b6b8b"
                    value={question}
                    onChangeText={onQuestionChange}
                    multiline
                    maxLength={200}
                  />
                  
                  <TouchableOpacity
                    style={[
                      styles.submitButton,
                      (!question.trim() || isProcessing) && styles.submitButtonDisabled,
                    ]}
                    onPress={onSubmit}
                    disabled={!question.trim() || isProcessing}
                  >
                    {isProcessing ? (
                      <ActivityIndicator color="#fff" size="small" />
                    ) : (
                      <>
                        <Text style={styles.submitButtonText}>Ask TrueReact</Text>
                        <Ionicons name="send" size={18} color="#fff" />
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              )}

              {/* Response */}
              {response && (
                <View style={styles.responseSection}>
                  <View style={styles.responseBubble}>
                    <View style={styles.responseHeader}>
                      <View style={styles.responseAvatar}>
                        <Ionicons name="pulse" size={20} color="#e94560" />
                      </View>
                      <Text style={styles.responseLabel}>TrueReact</Text>
                    </View>
                    
                    <Text style={styles.questionText}>
                      "{question}"
                    </Text>
                    
                    <View style={styles.responseDivider} />
                    
                    <Text style={styles.responseText}>{response}</Text>
                  </View>
                  
                  <View style={styles.responseActions}>
                    <TouchableOpacity
                      style={styles.responseActionButton}
                      onPress={() => {
                        onQuestionChange('');
                        // Clear response to show input again
                      }}
                    >
                      <Ionicons name="chatbubble-outline" size={18} color="#e94560" />
                      <Text style={styles.responseActionText}>Ask another</Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity
                      style={[styles.responseActionButton, styles.responseActionButtonPrimary]}
                      onPress={onClose}
                    >
                      <Text style={styles.responseActionTextPrimary}>Continue session</Text>
                      <Ionicons name="arrow-forward" size={18} color="#fff" />
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </ScrollView>
          </LinearGradient>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    maxHeight: '80%',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: 'hidden',
  },
  modalGradient: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginLeft: 12,
  },
  closeButton: {
    padding: 4,
  },
  scrollContent: {
    padding: 20,
  },
  quickQuestionsSection: {
    marginBottom: 24,
  },
  sectionLabel: {
    fontSize: 14,
    color: '#8b8b8b',
    marginBottom: 12,
  },
  quickQuestions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  quickQuestionButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  quickQuestionButtonActive: {
    backgroundColor: 'rgba(233, 69, 96, 0.15)',
    borderColor: '#e94560',
  },
  quickQuestionText: {
    fontSize: 14,
    color: '#fff',
  },
  quickQuestionTextActive: {
    color: '#e94560',
  },
  inputSection: {
    marginBottom: 20,
  },
  textInput: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 12,
    padding: 16,
    color: '#fff',
    fontSize: 15,
    minHeight: 80,
    textAlignVertical: 'top',
    marginBottom: 16,
  },
  submitButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#e94560',
    borderRadius: 12,
    paddingVertical: 14,
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginRight: 8,
  },
  responseSection: {
    marginTop: 8,
  },
  responseBubble: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
  },
  responseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  responseAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(233, 69, 96, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  responseLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#e94560',
  },
  questionText: {
    fontSize: 14,
    color: '#8b8b8b',
    fontStyle: 'italic',
    marginBottom: 12,
  },
  responseDivider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    marginBottom: 12,
  },
  responseText: {
    fontSize: 15,
    color: '#fff',
    lineHeight: 24,
  },
  responseActions: {
    flexDirection: 'row',
    gap: 12,
  },
  responseActionButton: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(233, 69, 96, 0.5)',
  },
  responseActionButtonPrimary: {
    backgroundColor: '#e94560',
    borderColor: '#e94560',
  },
  responseActionText: {
    fontSize: 14,
    color: '#e94560',
    marginLeft: 6,
  },
  responseActionTextPrimary: {
    fontSize: 14,
    color: '#fff',
    marginRight: 6,
  },
});
