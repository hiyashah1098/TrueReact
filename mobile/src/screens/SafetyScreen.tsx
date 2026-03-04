/**
 * TrueReact - Safety & Crisis Prevention Screen
 * 
 * Emergency contacts, crisis resources, safety plan,
 * and quick-access grounding exercises.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
  Linking,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  EmergencyContact,
  SafetyPlan,
  CRISIS_RESOURCES,
  CRISIS_GROUNDING,
  getEmergencyContacts,
  addEmergencyContact,
  updateEmergencyContact,
  deleteEmergencyContact,
  getICEContact,
  getSafetyPlan,
  saveSafetyPlan,
  callEmergencyContact,
  callCrisisResource,
  textCrisisLine,
  analyzeCrisisPatterns,
} from '../services/safety';
import { useTheme } from '../context/ThemeContext';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

type ViewMode = 'home' | 'contacts' | 'plan' | 'resources';

export default function SafetyScreen({ navigation }: any) {
  const { colors, isDark } = useTheme();
  const [viewMode, setViewMode] = useState<ViewMode>('home');
  const [contacts, setContacts] = useState<EmergencyContact[]>([]);
  const [safetyPlan, setSafetyPlan] = useState<SafetyPlan | null>(null);
  const [patternAnalysis, setPatternAnalysis] = useState<any>(null);
  const [showContactModal, setShowContactModal] = useState(false);
  const [editingContact, setEditingContact] = useState<EmergencyContact | null>(null);
  const [showGroundingModal, setShowGroundingModal] = useState(false);
  const [selectedGrounding, setSelectedGrounding] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  // Contact form state
  const [contactName, setContactName] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [contactRelationship, setContactRelationship] = useState('');
  const [contactIsICE, setContactIsICE] = useState(false);
  const [contactCanAlert, setContactCanAlert] = useState(true);
  
  const loadData = useCallback(async () => {
    try {
      const [contactsData, planData, patterns] = await Promise.all([
        getEmergencyContacts(),
        getSafetyPlan(),
        analyzeCrisisPatterns(),
      ]);
      setContacts(contactsData);
      setSafetyPlan(planData);
      setPatternAnalysis(patterns);
    } catch (error) {
      console.error('Failed to load safety data:', error);
    } finally {
      setLoading(false);
    }
  }, []);
  
  useEffect(() => {
    loadData();
  }, [loadData]);
  
  const resetContactForm = () => {
    setContactName('');
    setContactPhone('');
    setContactRelationship('');
    setContactIsICE(false);
    setContactCanAlert(true);
    setEditingContact(null);
  };
  
  const handleSaveContact = async () => {
    if (!contactName.trim() || !contactPhone.trim()) {
      Alert.alert('Required', 'Please enter name and phone number');
      return;
    }
    
    try {
      if (editingContact) {
        await updateEmergencyContact(editingContact.id, {
          name: contactName,
          phone: contactPhone,
          relationship: contactRelationship,
          isICE: contactIsICE,
          canReceiveAlerts: contactCanAlert,
        });
      } else {
        await addEmergencyContact({
          name: contactName,
          phone: contactPhone,
          relationship: contactRelationship,
          isICE: contactIsICE,
          canReceiveAlerts: contactCanAlert,
        });
      }
      
      setShowContactModal(false);
      resetContactForm();
      loadData();
    } catch (error) {
      Alert.alert('Error', 'Failed to save contact');
    }
  };
  
  const handleDeleteContact = async (id: string) => {
    Alert.alert(
      'Delete Contact',
      'Are you sure you want to remove this contact?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await deleteEmergencyContact(id);
            loadData();
          },
        },
      ]
    );
  };
  
  const handleEditContact = (contact: EmergencyContact) => {
    setEditingContact(contact);
    setContactName(contact.name);
    setContactPhone(contact.phone);
    setContactRelationship(contact.relationship);
    setContactIsICE(contact.isICE);
    setContactCanAlert(contact.canReceiveAlerts);
    setShowContactModal(true);
  };
  
  const handleCallContact = async (contact: EmergencyContact) => {
    Alert.alert(
      `Call ${contact.name}?`,
      contact.phone,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Call',
          onPress: () => callEmergencyContact(contact),
        },
      ]
    );
  };

  // Dynamic styles based on theme
  const cardBg = isDark ? 'rgba(45, 40, 69, 0.6)' : '#FFFFFF';
  const cardBorder = isDark ? 'rgba(155, 126, 198, 0.15)' : 'rgba(0,0,0,0.05)';
  
  const renderHomeView = () => {
    const iceContact = contacts.find(c => c.isICE) || contacts[0];
    
    return (
      <ScrollView style={styles.homeContainer}>
        {/* Quick Actions */}
        <View style={styles.quickActions}>
          {/* Emergency Call */}
          <TouchableOpacity
            style={styles.emergencyButton}
            onPress={() => callCrisisResource(CRISIS_RESOURCES[0])}
          >
            <LinearGradient
              colors={['#E74C3C', '#C0392B']}
              style={styles.emergencyGradient}
            >
              <Ionicons name="call" size={32} color="#FFFFFF" />
              <Text style={styles.emergencyText}>Call 988</Text>
              <Text style={styles.emergencySubtext}>Suicide & Crisis Lifeline</Text>
            </LinearGradient>
          </TouchableOpacity>
          
          {/* Quick ICE Contact */}
          {iceContact && (
            <TouchableOpacity
              style={[styles.iceButton, { backgroundColor: cardBg, borderColor: cardBorder, borderWidth: 1 }]}
              onPress={() => handleCallContact(iceContact)}
            >
              <View style={styles.iceContent}>
                <Ionicons name="person-circle-outline" size={28} color={colors.secondary} />
                <View style={styles.iceInfo}>
                  <Text style={[styles.iceName, { color: colors.text }]}>{iceContact.name}</Text>
                  <Text style={[styles.iceLabel, { color: colors.secondary }]}>Emergency Contact</Text>
                </View>
                <Ionicons name="call-outline" size={24} color={colors.secondary} />
              </View>
            </TouchableOpacity>
          )}
          
          {/* Text Crisis Line */}
          <TouchableOpacity
            style={[styles.textButton, { backgroundColor: cardBg, borderColor: colors.calm }]}
            onPress={textCrisisLine}
          >
            <Ionicons name="chatbubble-outline" size={24} color={colors.calm} />
            <Text style={[styles.textButtonLabel, { color: colors.calm }]}>Text HOME to 741741</Text>
          </TouchableOpacity>
        </View>
        
        {/* Grounding Exercises */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Ground Yourself Now</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.groundingRow}>
              {CRISIS_GROUNDING.map((exercise) => (
                <TouchableOpacity
                  key={exercise.id}
                  style={[styles.groundingCard, { backgroundColor: cardBg }]}
                  onPress={() => {
                    setSelectedGrounding(exercise);
                    setShowGroundingModal(true);
                  }}
                >
                  <View style={[styles.groundingIcon, { backgroundColor: exercise.color + '20' }]}>
                    <Ionicons name={exercise.icon as any} size={24} color={exercise.color} />
                  </View>
                  <Text style={[styles.groundingName, { color: colors.text }]}>{exercise.name}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        </View>
        
        {/* Quick Navigation */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Safety Tools</Text>
          <View style={styles.navGrid}>
            <TouchableOpacity
              style={[styles.navCard, { backgroundColor: cardBg }]}
              onPress={() => setViewMode('contacts')}
            >
              <Ionicons name="people-outline" size={28} color={colors.secondary} />
              <Text style={[styles.navLabel, { color: colors.text }]}>Contacts</Text>
              <Text style={[styles.navCount, { color: colors.textMuted }]}>{contacts.length}</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.navCard, { backgroundColor: cardBg }]}
              onPress={() => setViewMode('plan')}
            >
              <Ionicons name="shield-checkmark-outline" size={28} color={colors.success} />
              <Text style={[styles.navLabel, { color: colors.text }]}>Safety Plan</Text>
              <Text style={[styles.navCount, { color: colors.textMuted }]}>
                {safetyPlan ? 
                  Object.values(safetyPlan).filter(Array.isArray).flat().length : 0
                } items
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.navCard, { backgroundColor: cardBg }]}
              onPress={() => setViewMode('resources')}
            >
              <Ionicons name="heart-outline" size={28} color={colors.error} />
              <Text style={[styles.navLabel, { color: colors.text }]}>Resources</Text>
              <Text style={[styles.navCount, { color: colors.textMuted }]}>{CRISIS_RESOURCES.length}</Text>
            </TouchableOpacity>
          </View>
        </View>
        
        {/* Pattern Insights */}
        {patternAnalysis && patternAnalysis.recentEvents > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Your Insights</Text>
            <View style={[styles.insightCard, { backgroundColor: cardBg }]}>
              <Text style={[styles.insightText, { color: colors.text }]}>{patternAnalysis.recommendation}</Text>
              
              {patternAnalysis.effectiveCoping.length > 0 && (
                <View style={[styles.insightRow, { borderTopColor: colors.border }]}>
                  <Text style={[styles.insightLabel, { color: colors.textMuted }]}>What's helped:</Text>
                  <Text style={[styles.insightValue, { color: colors.secondary }]}>
                    {patternAnalysis.effectiveCoping.join(', ')}
                  </Text>
                </View>
              )}
            </View>
          </View>
        )}
        
        <View style={styles.bottomPadding} />
      </ScrollView>
    );
  };
  
  const renderContactsView = () => (
    <ScrollView style={styles.contactsContainer}>
      <View style={styles.contactsHeader}>
        <Text style={[styles.contactsTitle, { color: colors.text }]}>Emergency Contacts</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => {
            resetContactForm();
            setShowContactModal(true);
          }}
        >
          <Ionicons name="add" size={24} color="#FFFFFF" />
        </TouchableOpacity>
      </View>
      
      {contacts.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="people-outline" size={64} color={colors.textSecondary} />
          <Text style={[styles.emptyTitle, { color: colors.text }]}>No Emergency Contacts</Text>
          <Text style={[styles.emptySubtitle, { color: colors.textMuted }]}>
            Add people you can reach out to in a crisis
          </Text>
        </View>
      ) : (
        contacts.map((contact) => (
          <View key={contact.id} style={styles.contactCard}>
            <View style={styles.contactInfo}>
              <View style={styles.contactHeader}>
                <Text style={styles.contactName}>{contact.name}</Text>
                {contact.isICE && (
                  <View style={styles.iceBadge}>
                    <Text style={styles.iceBadgeText}>ICE</Text>
                  </View>
                )}
              </View>
              <Text style={styles.contactRel}>{contact.relationship}</Text>
              <Text style={styles.contactPhone}>{contact.phone}</Text>
            </View>
            
            <View style={styles.contactActions}>
              <TouchableOpacity
                style={styles.contactAction}
                onPress={() => handleCallContact(contact)}
              >
                <Ionicons name="call-outline" size={20} color="#7BC67E" />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.contactAction}
                onPress={() => handleEditContact(contact)}
              >
                <Ionicons name="create-outline" size={20} color="#9B7EC6" />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.contactAction}
                onPress={() => handleDeleteContact(contact.id)}
              >
                <Ionicons name="trash-outline" size={20} color="#E74C3C" />
              </TouchableOpacity>
            </View>
          </View>
        ))
      )}
      
      <View style={styles.bottomPadding} />
    </ScrollView>
  );
  
  const renderSafetyPlanView = () => {
    if (!safetyPlan) return null;
    
    const sections = [
      { key: 'warningsSigns', title: 'Warning Signs', icon: 'warning-outline', color: '#E67E22' },
      { key: 'copingStrategies', title: 'Coping Strategies', icon: 'shield-outline', color: '#9B7EC6' },
      { key: 'distractions', title: 'Healthy Distractions', icon: 'color-wand-outline', color: '#3498DB' },
      { key: 'reasonsToLive', title: 'Reasons to Keep Going', icon: 'heart-outline', color: '#E91E63' },
      { key: 'safeEnvironmentSteps', title: 'Making Space Safe', icon: 'home-outline', color: '#7BC67E' },
    ];
    
    const handleAddItem = async (key: string) => {
      // Alert.prompt is iOS-only, using optional chaining for safety
      if (Alert.prompt) {
        Alert.prompt(
          'Add Item',
          `Add to your ${sections.find(s => s.key === key)?.title}`,
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Add',
              onPress: (text?: string) => {
                if (text?.trim()) {
                  const newPlan = {
                    ...safetyPlan,
                    [key]: [...(safetyPlan[key as keyof SafetyPlan] as string[] || []), text.trim()],
                  };
                  saveSafetyPlan(newPlan).then(loadData);
                }
              },
            },
          ],
          'plain-text'
        );
      }
    };
    
    const handleRemoveItem = async (key: string, index: number) => {
      const items = safetyPlan[key as keyof SafetyPlan] as string[];
      const newItems = items.filter((_, i) => i !== index);
      const newPlan = { ...safetyPlan, [key]: newItems };
      await saveSafetyPlan(newPlan);
      loadData();
    };
    
    return (
      <ScrollView style={styles.planContainer}>
        {sections.map((section) => {
          const items = safetyPlan[section.key as keyof SafetyPlan] as string[] || [];
          
          return (
            <View key={section.key} style={styles.planSection}>
              <View style={styles.planSectionHeader}>
                <View style={[styles.planIcon, { backgroundColor: section.color + '20' }]}>
                  <Ionicons name={section.icon as any} size={20} color={section.color} />
                </View>
                <Text style={styles.planSectionTitle}>{section.title}</Text>
                <TouchableOpacity onPress={() => handleAddItem(section.key)}>
                  <Ionicons name="add-circle-outline" size={24} color="#9B7EC6" />
                </TouchableOpacity>
              </View>
              
              {items.length === 0 ? (
                <Text style={styles.planEmpty}>Tap + to add items</Text>
              ) : (
                items.map((item, i) => (
                  <View key={i} style={styles.planItem}>
                    <Text style={styles.planItemText}>{item}</Text>
                    <TouchableOpacity onPress={() => handleRemoveItem(section.key, i)}>
                      <Ionicons name="close-circle-outline" size={18} color="#B8B0C8" />
                    </TouchableOpacity>
                  </View>
                ))
              )}
            </View>
          );
        })}
        
        <View style={styles.bottomPadding} />
      </ScrollView>
    );
  };
  
  const renderResourcesView = () => (
    <ScrollView style={styles.resourcesContainer}>
      <Text style={styles.resourcesIntro}>
        These resources are available 24/7. You don't have to face this alone.
      </Text>
      
      {CRISIS_RESOURCES.map((resource) => (
        <TouchableOpacity
          key={resource.id}
          style={styles.resourceCard}
          onPress={() => {
            if (resource.phone) {
              Alert.alert(
                resource.name,
                `Call ${resource.phone}?`,
                [
                  { text: 'Cancel', style: 'cancel' },
                  { text: 'Call', onPress: () => callCrisisResource(resource) },
                ]
              );
            }
          }}
        >
          <View style={[styles.resourceIcon, { backgroundColor: resource.color + '20' }]}>
            <Ionicons name={resource.icon as any} size={24} color={resource.color} />
          </View>
          <View style={styles.resourceInfo}>
            <Text style={styles.resourceName}>{resource.name}</Text>
            <Text style={styles.resourceDesc}>{resource.description}</Text>
            <View style={styles.resourceMeta}>
              {resource.phone && (
                <Text style={styles.resourcePhone}>{resource.phone}</Text>
              )}
              <Text style={styles.resourceAvailable}>{resource.available}</Text>
            </View>
          </View>
          <Ionicons name="call" size={20} color={resource.color} />
        </TouchableOpacity>
      ))}
      
      <View style={styles.bottomPadding} />
    </ScrollView>
  );
  
  const renderContactModal = () => (
    <Modal
      visible={showContactModal}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={() => setShowContactModal(false)}
    >
      <SafeAreaView style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <TouchableOpacity onPress={() => {
            setShowContactModal(false);
            resetContactForm();
          }}>
            <Text style={styles.modalCancel}>Cancel</Text>
          </TouchableOpacity>
          <Text style={styles.modalTitle}>
            {editingContact ? 'Edit Contact' : 'Add Contact'}
          </Text>
          <TouchableOpacity onPress={handleSaveContact}>
            <Text style={styles.modalSave}>Save</Text>
          </TouchableOpacity>
        </View>
        
        <ScrollView style={styles.modalContent}>
          <Text style={styles.inputLabel}>Name *</Text>
          <TextInput
            style={styles.input}
            value={contactName}
            onChangeText={setContactName}
            placeholder="Contact name"
            placeholderTextColor="#B8B0C8"
          />
          
          <Text style={styles.inputLabel}>Phone Number *</Text>
          <TextInput
            style={styles.input}
            value={contactPhone}
            onChangeText={setContactPhone}
            placeholder="Phone number"
            placeholderTextColor="#B8B0C8"
            keyboardType="phone-pad"
          />
          
          <Text style={styles.inputLabel}>Relationship</Text>
          <TextInput
            style={styles.input}
            value={contactRelationship}
            onChangeText={setContactRelationship}
            placeholder="e.g., Friend, Therapist, Parent"
            placeholderTextColor="#B8B0C8"
          />
          
          <View style={styles.toggleRow}>
            <View>
              <Text style={styles.toggleLabel}>Primary ICE Contact</Text>
              <Text style={styles.toggleHint}>Shows first in emergencies</Text>
            </View>
            <TouchableOpacity
              style={[styles.toggle, contactIsICE && styles.toggleOn]}
              onPress={() => setContactIsICE(!contactIsICE)}
            >
              <View style={[styles.toggleKnob, contactIsICE && styles.toggleKnobOn]} />
            </TouchableOpacity>
          </View>
          
          <View style={styles.toggleRow}>
            <View>
              <Text style={styles.toggleLabel}>Can Receive Alerts</Text>
              <Text style={styles.toggleHint}>Get notified if I'm in crisis</Text>
            </View>
            <TouchableOpacity
              style={[styles.toggle, contactCanAlert && styles.toggleOn]}
              onPress={() => setContactCanAlert(!contactCanAlert)}
            >
              <View style={[styles.toggleKnob, contactCanAlert && styles.toggleKnobOn]} />
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
  
  const renderGroundingModal = () => {
    if (!selectedGrounding) return null;
    
    return (
      <Modal
        visible={showGroundingModal}
        animationType="fade"
        transparent
        onRequestClose={() => setShowGroundingModal(false)}
      >
        <View style={styles.groundingModalOverlay}>
          <View style={styles.groundingModalContent}>
            <View style={[styles.groundingModalIcon, { backgroundColor: selectedGrounding.color + '20' }]}>
              <Ionicons name={selectedGrounding.icon} size={48} color={selectedGrounding.color} />
            </View>
            <Text style={styles.groundingModalTitle}>{selectedGrounding.name}</Text>
            <Text style={styles.groundingModalDesc}>{selectedGrounding.description}</Text>
            
            <TouchableOpacity
              style={[styles.groundingModalButton, { backgroundColor: selectedGrounding.color }]}
              onPress={() => setShowGroundingModal(false)}
            >
              <Text style={styles.groundingModalButtonText}>I'm Ready</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.groundingModalClose}
              onPress={() => setShowGroundingModal(false)}
            >
              <Text style={styles.groundingModalCloseText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    );
  };
  
  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <Ionicons name="shield-checkmark-outline" size={48} color={colors.secondary} />
        <Text style={[styles.loadingText, { color: colors.textMuted }]}>Loading safety tools...</Text>
      </View>
    );
  }
  
  return (
    <LinearGradient colors={colors.gradient as [string, string, ...string[]]} style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        {/* Header */}
        <View style={styles.header}>
          {viewMode !== 'home' ? (
            <TouchableOpacity onPress={() => setViewMode('home')}>
              <Ionicons name="arrow-back" size={24} color={colors.text} />
            </TouchableOpacity>
          ) : (
            <View style={{ width: 24 }} />
          )}
          <Text style={[styles.title, { color: colors.text }]}>
            {viewMode === 'contacts' ? 'Emergency Contacts' :
             viewMode === 'plan' ? 'Safety Plan' :
             viewMode === 'resources' ? 'Crisis Resources' :
             'Safety & Support'}
          </Text>
          <View style={{ width: 24 }} />
        </View>
        
        {viewMode === 'home' && renderHomeView()}
        {viewMode === 'contacts' && renderContactsView()}
        {viewMode === 'plan' && renderSafetyPlanView()}
        {viewMode === 'resources' && renderResourcesView()}
        
        {renderContactModal()}
        {renderGroundingModal()}
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8F7FC',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6B6B80',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#2D2D44',
  },
  
  // Home View
  homeContainer: {
    flex: 1,
    paddingHorizontal: 20,
  },
  quickActions: {
    marginBottom: 20,
  },
  emergencyButton: {
    marginBottom: 12,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#E74C3C',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  emergencyGradient: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  emergencyText: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
    marginTop: 8,
  },
  emergencySubtext: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.9)',
    marginTop: 4,
  },
  iceButton: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  iceContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iceInfo: {
    flex: 1,
    marginLeft: 12,
  },
  iceName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2D2D44',
  },
  iceLabel: {
    fontSize: 12,
    color: '#9B7EC6',
  },
  textButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    gap: 10,
    borderWidth: 2,
    borderColor: '#3498DB',
  },
  textButtonLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#3498DB',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2D2D44',
    marginBottom: 12,
  },
  groundingRow: {
    flexDirection: 'row',
    gap: 12,
  },
  groundingCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    width: 100,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  groundingIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  groundingName: {
    fontSize: 12,
    fontWeight: '500',
    color: '#2D2D44',
    textAlign: 'center',
  },
  navGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  navCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  navLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2D2D44',
    marginTop: 8,
  },
  navCount: {
    fontSize: 12,
    color: '#6B6B80',
    marginTop: 2,
  },
  insightCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  insightText: {
    fontSize: 14,
    color: '#2D2D44',
    lineHeight: 20,
  },
  insightRow: {
    flexDirection: 'row',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  insightLabel: {
    fontSize: 12,
    color: '#6B6B80',
    marginRight: 8,
  },
  insightValue: {
    fontSize: 12,
    color: '#9B7EC6',
    fontWeight: '500',
    flex: 1,
  },
  
  // Contacts View
  contactsContainer: {
    flex: 1,
    paddingHorizontal: 20,
  },
  contactsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  contactsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2D2D44',
  },
  addButton: {
    backgroundColor: '#9B7EC6',
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyState: {
    alignItems: 'center',
    paddingTop: 60,
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2D2D44',
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#6B6B80',
    textAlign: 'center',
    marginTop: 8,
  },
  contactCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  contactInfo: {
    flex: 1,
  },
  contactHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  contactName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2D2D44',
  },
  iceBadge: {
    backgroundColor: '#E74C3C',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  iceBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  contactRel: {
    fontSize: 13,
    color: '#9B7EC6',
    marginTop: 2,
  },
  contactPhone: {
    fontSize: 14,
    color: '#6B6B80',
    marginTop: 4,
  },
  contactActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  contactAction: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F8F7FC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  
  // Safety Plan View
  planContainer: {
    flex: 1,
    paddingHorizontal: 20,
  },
  planSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  planSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  planIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  planSectionTitle: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: '#2D2D44',
  },
  planEmpty: {
    fontSize: 13,
    color: '#B8B0C8',
    fontStyle: 'italic',
  },
  planItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  planItemText: {
    flex: 1,
    fontSize: 14,
    color: '#2D2D44',
  },
  
  // Resources View
  resourcesContainer: {
    flex: 1,
    paddingHorizontal: 20,
  },
  resourcesIntro: {
    fontSize: 14,
    color: '#6B6B80',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 20,
  },
  resourceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  resourceIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  resourceInfo: {
    flex: 1,
  },
  resourceName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#2D2D44',
  },
  resourceDesc: {
    fontSize: 13,
    color: '#6B6B80',
    marginTop: 2,
  },
  resourceMeta: {
    flexDirection: 'row',
    marginTop: 4,
    gap: 8,
  },
  resourcePhone: {
    fontSize: 13,
    fontWeight: '600',
    color: '#9B7EC6',
  },
  resourceAvailable: {
    fontSize: 12,
    color: '#B8B0C8',
  },
  
  // Contact Modal
  modalContainer: {
    flex: 1,
    backgroundColor: '#F8F7FC',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  modalCancel: {
    fontSize: 16,
    color: '#6B6B80',
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#2D2D44',
  },
  modalSave: {
    fontSize: 16,
    fontWeight: '600',
    color: '#9B7EC6',
  },
  modalContent: {
    flex: 1,
    padding: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2D2D44',
    marginBottom: 8,
    marginTop: 16,
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#2D2D44',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
  },
  toggleLabel: {
    fontSize: 15,
    fontWeight: '500',
    color: '#2D2D44',
  },
  toggleHint: {
    fontSize: 12,
    color: '#6B6B80',
    marginTop: 2,
  },
  toggle: {
    width: 50,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#E0E0E0',
    padding: 2,
  },
  toggleOn: {
    backgroundColor: '#9B7EC6',
  },
  toggleKnob: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
  },
  toggleKnobOn: {
    marginLeft: 22,
  },
  
  // Grounding Modal
  groundingModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  groundingModalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 32,
    alignItems: 'center',
    width: '100%',
    maxWidth: 320,
  },
  groundingModalIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  groundingModalTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#2D2D44',
    marginBottom: 8,
  },
  groundingModalDesc: {
    fontSize: 16,
    color: '#6B6B80',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
  },
  groundingModalButton: {
    paddingVertical: 14,
    paddingHorizontal: 40,
    borderRadius: 12,
    marginBottom: 12,
  },
  groundingModalButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  groundingModalClose: {
    padding: 8,
  },
  groundingModalCloseText: {
    fontSize: 14,
    color: '#6B6B80',
  },
  
  bottomPadding: {
    height: 40,
  },
});
