/**
 * TrueReact - Help & Resources Screen
 * 
 * Comprehensive information about the app, the science behind it,
 * and critical mental health resources including crisis hotlines.
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Linking,
  Alert,
  Modal,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

interface HelpScreenProps {
  navigation: any;
}

interface HelplineResource {
  name: string;
  description: string;
  phone?: string;
  text?: string;
  website?: string;
  available: string;
  icon: string;
  color: string;
}

interface ResearchReference {
  title: string;
  authors: string;
  journal: string;
  year: number;
  summary: string;
}

const crisisHotlines: HelplineResource[] = [
  {
    name: '988 Suicide & Crisis Lifeline',
    description: 'Free, confidential support for people in distress, prevention and crisis resources',
    phone: '988',
    text: '988',
    website: 'https://988lifeline.org',
    available: '24/7',
    icon: 'heart',
    color: '#ef4444',
  },
  {
    name: 'Crisis Text Line',
    description: 'Free, 24/7 support via text message. Text HOME to connect with a trained crisis counselor',
    text: 'HOME to 741741',
    website: 'https://www.crisistextline.org',
    available: '24/7',
    icon: 'chatbubble-ellipses',
    color: '#8b5cf6',
  },
  {
    name: 'SAMHSA National Helpline',
    description: 'Free, confidential treatment referral and information service for mental health and substance use disorders',
    phone: '1-800-662-4357',
    website: 'https://www.samhsa.gov/find-help/national-helpline',
    available: '24/7, 365 days',
    icon: 'medical',
    color: '#3b82f6',
  },
  {
    name: 'NAMI Helpline',
    description: 'National Alliance on Mental Illness provides information, resource referrals, and support',
    phone: '1-800-950-6264',
    text: 'NAMI to 741741',
    website: 'https://www.nami.org/help',
    available: 'Mon-Fri 10am-10pm ET',
    icon: 'people',
    color: '#10b981',
  },
  {
    name: 'Trevor Project',
    description: 'Crisis intervention and suicide prevention for LGBTQ+ young people',
    phone: '1-866-488-7386',
    text: 'START to 678-678',
    website: 'https://www.thetrevorproject.org',
    available: '24/7',
    icon: 'rainbow',
    color: '#f59e0b',
  },
  {
    name: 'Veterans Crisis Line',
    description: 'Connects veterans and their families with qualified responders',
    phone: '988, then Press 1',
    text: '838255',
    website: 'https://www.veteranscrisisline.net',
    available: '24/7',
    icon: 'shield',
    color: '#059669',
  },
  {
    name: 'National Domestic Violence Hotline',
    description: 'Support for those experiencing domestic violence, abuse, or unhealthy relationships',
    phone: '1-800-799-7233',
    text: 'START to 88788',
    website: 'https://www.thehotline.org',
    available: '24/7',
    icon: 'home',
    color: '#dc2626',
  },
];

const therapyResources: HelplineResource[] = [
  {
    name: 'Psychology Today Therapist Finder',
    description: 'Search for therapists, psychiatrists, and counselors in your area',
    website: 'https://www.psychologytoday.com/us/therapists',
    available: 'Online directory',
    icon: 'search',
    color: '#6366f1',
  },
  {
    name: 'BetterHelp',
    description: 'Online therapy with licensed counselors via text, phone, or video',
    website: 'https://www.betterhelp.com',
    available: 'Online therapy',
    icon: 'videocam',
    color: '#22c55e',
  },
  {
    name: 'Open Path Collective',
    description: 'Affordable therapy sessions ($30-$80) for those with financial barriers',
    website: 'https://openpathcollective.org',
    available: 'Sliding scale',
    icon: 'wallet',
    color: '#f97316',
  },
  {
    name: 'ADAA Therapist Directory',
    description: 'Find therapists specializing in anxiety, depression, OCD, PTSD, and related disorders',
    website: 'https://members.adaa.org/search/custom.asp?id=4685',
    available: 'Online directory',
    icon: 'list',
    color: '#0ea5e9',
  },
];

const researchReferences: ResearchReference[] = [
  {
    title: 'Cognitive Behavioral Therapy for Emotion Regulation',
    authors: 'Aldao, A., Nolen-Hoeksema, S., & Schweizer, S.',
    journal: 'Clinical Psychology Review',
    year: 2010,
    summary: 'Meta-analysis showing emotion regulation strategies are linked to mental health outcomes. Adaptive strategies like cognitive reappraisal correlate with lower psychopathology.',
  },
  {
    title: 'Dialectical Behavior Therapy: A Meta-Analysis',
    authors: 'DeCou, C. R., Comtois, K. A., & Landes, S. J.',
    journal: 'JAMA Psychiatry',
    year: 2019,
    summary: 'DBT significantly reduces self-harm and suicidal ideation, with effects maintained at follow-up. Supports real-time skill coaching approaches.',
  },
  {
    title: 'Real-Time Intervention and Detection in Social Context',
    authors: 'Mohr, D. C., Zhang, M., & Schueller, S. M.',
    journal: 'Annual Review of Clinical Psychology',
    year: 2017,
    summary: 'Digital mental health interventions can provide just-in-time adaptive support, improving outcomes through real-time monitoring and feedback.',
  },
  {
    title: 'Multimodal Emotion Recognition: Current State and Future Directions',
    authors: 'Poria, S., Cambria, E., & Gelbukh, A.',
    journal: 'Information Fusion',
    year: 2017,
    summary: 'Combining facial, vocal, and textual cues improves emotion recognition accuracy. Multimodal approaches better capture complex emotional states.',
  },
  {
    title: 'Autism and Social-Emotional Communication',
    authors: 'Uljarevic, M., & Hamilton, A.',
    journal: 'Journal of Autism and Developmental Disorders',
    year: 2013,
    summary: 'Individuals with autism may have difficulty expressing emotions in ways others recognize. Coaching can bridge this communication gap.',
  },
  {
    title: 'Social Anxiety and Expressive Behavior',
    authors: 'Heiser, N. A., Turner, S. M., & Beidel, D. C.',
    journal: 'Behaviour Research and Therapy',
    year: 2003,
    summary: 'Social anxiety affects non-verbal communication. Real-time feedback can help individuals align intended emotions with outward expressions.',
  },
];

type SectionType = 'about' | 'science' | 'crisis' | 'therapy' | 'research';

export default function HelpScreen({ navigation }: HelpScreenProps) {
  const [expandedSection, setExpandedSection] = useState<SectionType | null>('about');
  const [show911Modal, setShow911Modal] = useState(false);
  const [confirmationStep, setConfirmationStep] = useState(0);

  const handleCall = (phone: string) => {
    Alert.alert(
      'Call Helpline',
      `Do you want to call ${phone}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Call', onPress: () => Linking.openURL(`tel:${phone.replace(/[^0-9]/g, '')}`) },
      ]
    );
  };

  const handleText = (textInfo: string) => {
    // Parse text instructions like "HOME to 741741"
    const match = textInfo.match(/(\w+)\s+to\s+(\d+)/i);
    if (match) {
      const [, message, number] = match;
      Linking.openURL(`sms:${number}?body=${message}`);
    } else {
      Linking.openURL(`sms:${textInfo}`);
    }
  };

  const handleWebsite = (url: string) => {
    Linking.openURL(url);
  };

  const open911Modal = () => {
    setConfirmationStep(0);
    setShow911Modal(true);
  };

  const close911Modal = () => {
    setShow911Modal(false);
    setConfirmationStep(0);
  };

  const advanceConfirmation = () => {
    if (confirmationStep < 2) {
      setConfirmationStep(prev => prev + 1);
    } else {
      // Final confirmation - make the call
      close911Modal();
      Linking.openURL('tel:911');
    }
  };

  const render911Modal = () => (
    <Modal
      visible={show911Modal}
      animationType="fade"
      transparent={true}
      onRequestClose={close911Modal}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modal911Container}>
          {/* Step 0: Initial Warning */}
          {confirmationStep === 0 && (
            <>
              <View style={styles.modal911Icon}>
                <Ionicons name="warning" size={48} color="#dc2626" />
              </View>
              <Text style={styles.modal911Title}>Emergency Call</Text>
              <Text style={styles.modal911Description}>
                You are about to call 911.{"\n\n"}
                This should only be used for life-threatening emergencies requiring immediate police, fire, or medical response.
              </Text>
              <Text style={styles.modal911Note}>
                For mental health crises, consider calling 988 instead.
              </Text>
              <View style={styles.modal911Actions}>
                <TouchableOpacity style={styles.modal911CancelButton} onPress={close911Modal}>
                  <Text style={styles.modal911CancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.modal911ContinueButton} onPress={advanceConfirmation}>
                  <Text style={styles.modal911ContinueText}>I Understand</Text>
                </TouchableOpacity>
              </View>
            </>
          )}

          {/* Step 1: Confirm Emergency */}
          {confirmationStep === 1 && (
            <>
              <View style={[styles.modal911Icon, { backgroundColor: '#f59e0b20' }]}>
                <Ionicons name="alert-circle" size={48} color="#f59e0b" />
              </View>
              <Text style={styles.modal911Title}>Confirm Emergency</Text>
              <Text style={styles.modal911Description}>
                Is this a real emergency?{"\n\n"}
                Misuse of 911 can delay help for people with actual emergencies and may be illegal.
              </Text>
              <View style={styles.modal911Checklist}>
                <Text style={styles.modal911CheckItem}>✓ Someone's life is in danger</Text>
                <Text style={styles.modal911CheckItem}>✓ A crime is in progress</Text>
                <Text style={styles.modal911CheckItem}>✓ There is a fire or medical emergency</Text>
              </View>
              <View style={styles.modal911Actions}>
                <TouchableOpacity style={styles.modal911CancelButton} onPress={close911Modal}>
                  <Text style={styles.modal911CancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.modal911ContinueButton} onPress={advanceConfirmation}>
                  <Text style={styles.modal911ContinueText}>Yes, Emergency</Text>
                </TouchableOpacity>
              </View>
            </>
          )}

          {/* Step 2: Final Confirmation */}
          {confirmationStep === 2 && (
            <>
              <View style={[styles.modal911Icon, { backgroundColor: '#dc262620' }]}>
                <Ionicons name="call" size={48} color="#dc2626" />
              </View>
              <Text style={styles.modal911Title}>Final Confirmation</Text>
              <Text style={styles.modal911Description}>
                Pressing the button below will immediately dial 911.{"\n\n"}
                Stay calm and be ready to provide your location and describe the emergency.
              </Text>
              <View style={styles.modal911Actions}>
                <TouchableOpacity style={styles.modal911CancelButton} onPress={close911Modal}>
                  <Text style={styles.modal911CancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.modal911ContinueButton, styles.modal911CallButton]} 
                  onPress={advanceConfirmation}
                >
                  <Ionicons name="call" size={20} color="#fff" />
                  <Text style={styles.modal911CallText}>Call 911 Now</Text>
                </TouchableOpacity>
              </View>
            </>
          )}

          {/* Progress Indicator */}
          <View style={styles.modal911Progress}>
            {[0, 1, 2].map(step => (
              <View 
                key={step}
                style={[
                  styles.modal911ProgressDot,
                  confirmationStep >= step && styles.modal911ProgressDotActive
                ]}
              />
            ))}
          </View>
        </View>
      </View>
    </Modal>
  );

  const toggleSection = (section: SectionType) => {
    setExpandedSection(expandedSection === section ? null : section);
  };

  const renderHelpline = (resource: HelplineResource, index: number) => (
    <View key={index} style={styles.resourceCard}>
      <View style={styles.resourceHeader}>
        <View style={[styles.resourceIcon, { backgroundColor: resource.color + '20' }]}>
          <Ionicons name={resource.icon as any} size={24} color={resource.color} />
        </View>
        <View style={styles.resourceInfo}>
          <Text style={styles.resourceName}>{resource.name}</Text>
          <Text style={styles.resourceAvailable}>{resource.available}</Text>
        </View>
      </View>
      
      <Text style={styles.resourceDescription}>{resource.description}</Text>
      
      <View style={styles.resourceActions}>
        {resource.phone && (
          <TouchableOpacity 
            style={[styles.actionButton, { backgroundColor: '#22c55e20' }]}
            onPress={() => handleCall(resource.phone!)}
          >
            <Ionicons name="call" size={18} color="#22c55e" />
            <Text style={[styles.actionText, { color: '#22c55e' }]}>Call</Text>
          </TouchableOpacity>
        )}
        
        {resource.text && (
          <TouchableOpacity 
            style={[styles.actionButton, { backgroundColor: '#3b82f620' }]}
            onPress={() => handleText(resource.text!)}
          >
            <Ionicons name="chatbubble" size={18} color="#3b82f6" />
            <Text style={[styles.actionText, { color: '#3b82f6' }]}>Text</Text>
          </TouchableOpacity>
        )}
        
        {resource.website && (
          <TouchableOpacity 
            style={[styles.actionButton, { backgroundColor: '#8b5cf620' }]}
            onPress={() => handleWebsite(resource.website!)}
          >
            <Ionicons name="globe" size={18} color="#8b5cf6" />
            <Text style={[styles.actionText, { color: '#8b5cf6' }]}>Website</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  const renderResearch = (research: ResearchReference, index: number) => (
    <View key={index} style={styles.researchCard}>
      <Text style={styles.researchTitle}>{research.title}</Text>
      <Text style={styles.researchAuthors}>{research.authors}</Text>
      <Text style={styles.researchJournal}>{research.journal}, {research.year}</Text>
      <Text style={styles.researchSummary}>{research.summary}</Text>
    </View>
  );

  const renderSectionHeader = (
    section: SectionType, 
    title: string, 
    icon: string, 
    color: string
  ) => (
    <TouchableOpacity 
      style={styles.sectionHeader}
      onPress={() => toggleSection(section)}
    >
      <View style={[styles.sectionIcon, { backgroundColor: color + '20' }]}>
        <Ionicons name={icon as any} size={20} color={color} />
      </View>
      <Text style={styles.sectionTitle}>{title}</Text>
      <Ionicons 
        name={expandedSection === section ? 'chevron-up' : 'chevron-down'} 
        size={20} 
        color="#8b8b8b" 
      />
    </TouchableOpacity>
  );

  return (
    <LinearGradient colors={['#1a1a2e', '#16213e']} style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Help & Resources</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView 
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* About Section */}
        {renderSectionHeader('about', 'About TrueReact', 'information-circle', '#e94560')}
        {expandedSection === 'about' && (
          <View style={styles.sectionContent}>
            <Text style={styles.aboutTitle}>What is TrueReact?</Text>
            <Text style={styles.aboutText}>
              TrueReact is a real-time social-emotional coaching app designed to help you align 
              your internal emotional intent with your external social signals. Using advanced 
              AI analysis of facial expressions, voice tone, and body language, TrueReact 
              provides gentle, non-intrusive coaching to help you communicate more effectively.
            </Text>

            <Text style={styles.aboutTitle}>Who is it for?</Text>
            <Text style={styles.aboutText}>
              TrueReact was created with several communities in mind:
            </Text>
            <View style={styles.bulletList}>
              <Text style={styles.bulletItem}>
                • <Text style={styles.bulletBold}>Individuals with autism</Text> who may express 
                emotions differently than neurotypical expectations
              </Text>
              <Text style={styles.bulletItem}>
                • <Text style={styles.bulletBold}>People with social anxiety</Text> who want to 
                reduce discrepancies between felt and shown emotions
              </Text>
              <Text style={styles.bulletItem}>
                • <Text style={styles.bulletBold}>Anyone</Text> who wants to improve their 
                social communication and emotional expression
              </Text>
              <Text style={styles.bulletItem}>
                • <Text style={styles.bulletBold}>Professionals</Text> looking to enhance 
                communication in high-stakes situations
              </Text>
            </View>

            <Text style={styles.aboutTitle}>How does it work?</Text>
            <Text style={styles.aboutText}>
              During a session, TrueReact analyzes multiple signals:
            </Text>
            <View style={styles.featureGrid}>
              <View style={styles.featureItem}>
                <Ionicons name="happy-outline" size={28} color="#f59e0b" />
                <Text style={styles.featureLabel}>Facial Expressions</Text>
              </View>
              <View style={styles.featureItem}>
                <Ionicons name="mic-outline" size={28} color="#8b5cf6" />
                <Text style={styles.featureLabel}>Voice Tone</Text>
              </View>
              <View style={styles.featureItem}>
                <Ionicons name="body-outline" size={28} color="#10b981" />
                <Text style={styles.featureLabel}>Body Language</Text>
              </View>
              <View style={styles.featureItem}>
                <Ionicons name="chatbubble-outline" size={28} color="#3b82f6" />
                <Text style={styles.featureLabel}>Real-time Feedback</Text>
              </View>
            </View>

            <Text style={styles.aboutText}>
              Based on this analysis, you receive gentle coaching suggestions to help align your 
              external expression with your intended message. You can also "barge in" at any time 
              to ask the AI coach questions about how you're coming across.
            </Text>

            <Text style={styles.aboutTitle}>Privacy & Safety</Text>
            <Text style={styles.aboutText}>
              TrueReact prioritizes your privacy. Video and audio are processed in real-time and 
              never stored on external servers. Your session data is encrypted and only accessible 
              to you. The app includes a "safe state" feature that can be triggered if stress 
              levels become too high, providing immediate access to grounding techniques and 
              crisis resources.
            </Text>
          </View>
        )}

        {/* Science Section */}
        {renderSectionHeader('science', 'The Science Behind It', 'flask', '#22c55e')}
        {expandedSection === 'science' && (
          <View style={styles.sectionContent}>
            <Text style={styles.aboutText}>
              TrueReact is built on decades of evidence-based psychological research:
            </Text>

            <View style={styles.scienceCard}>
              <Text style={styles.scienceTitle}>Cognitive Behavioral Therapy (CBT)</Text>
              <Text style={styles.scienceText}>
                CBT helps identify and change unhelpful thought patterns. TrueReact uses CBT 
                principles to help you recognize when internal states don't match external 
                expressions, and provides strategies to bridge that gap.
              </Text>
            </View>

            <View style={styles.scienceCard}>
              <Text style={styles.scienceTitle}>Dialectical Behavior Therapy (DBT)</Text>
              <Text style={styles.scienceText}>
                DBT teaches skills for emotional regulation, distress tolerance, and interpersonal 
                effectiveness. The STOP, TIPP, and DEAR MAN techniques in our library come directly 
                from DBT research.
              </Text>
            </View>

            <View style={styles.scienceCard}>
              <Text style={styles.scienceTitle}>Multimodal Emotion Recognition</Text>
              <Text style={styles.scienceText}>
                Research shows that combining facial, vocal, and behavioral cues leads to more 
                accurate emotion understanding. TrueReact uses this multimodal approach for 
                more nuanced coaching.
              </Text>
            </View>

            <View style={styles.scienceCard}>
              <Text style={styles.scienceTitle}>Just-In-Time Adaptive Interventions</Text>
              <Text style={styles.scienceText}>
                Studies show that providing support at the moment it's needed is more effective 
                than delayed feedback. TrueReact's real-time coaching follows this principle.
              </Text>
            </View>

            <View style={styles.scienceCard}>
              <Text style={styles.scienceTitle}>Neurodiversity Affirming Approach</Text>
              <Text style={styles.scienceText}>
                We don't aim to make you "normal" — we help you express your authentic emotions 
                in ways others can understand. This approach respects different ways of being 
                while facilitating communication.
              </Text>
            </View>
          </View>
        )}

        {/* Crisis Resources */}
        {renderSectionHeader('crisis', 'Crisis Hotlines', 'call', '#ef4444')}
        {expandedSection === 'crisis' && (
          <View style={styles.sectionContent}>
            <Text style={styles.aboutText}>
              If you or someone you know is in crisis, help is available 24/7. These services 
              are free and confidential.
            </Text>
            {crisisHotlines.map((resource, index) => renderHelpline(resource, index))}
          </View>
        )}

        {/* Therapy Resources */}
        {renderSectionHeader('therapy', 'Find a Therapist', 'person', '#3b82f6')}
        {expandedSection === 'therapy' && (
          <View style={styles.sectionContent}>
            <Text style={styles.aboutText}>
              Working with a licensed therapist can provide deeper support. These resources 
              can help you find professional help.
            </Text>
            {therapyResources.map((resource, index) => renderHelpline(resource, index))}
          </View>
        )}

        {/* Research References */}
        {renderSectionHeader('research', 'Research & References', 'library', '#8b5cf6')}
        {expandedSection === 'research' && (
          <View style={styles.sectionContent}>
            <Text style={styles.aboutText}>
              TrueReact is informed by peer-reviewed research in psychology, neuroscience, 
              and digital mental health.
            </Text>
            {researchReferences.map((research, index) => renderResearch(research, index))}
          </View>
        )}

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            TrueReact is not a substitute for professional mental health treatment. 
            If you are experiencing a mental health crisis, please contact a crisis hotline 
            or seek immediate professional help.
          </Text>
        </View>
      </ScrollView>

      {/* 911 Emergency Button */}
      <TouchableOpacity 
        style={styles.emergency911Button}
        onPress={open911Modal}
      >
        <View style={styles.emergency911Icon}>
          <Ionicons name="medkit" size={20} color="#dc2626" />
        </View>
        <Text style={styles.emergency911Text}>Call 911 (Life-Threatening Emergency)</Text>
        <Ionicons name="chevron-forward" size={20} color="#dc2626" />
      </TouchableOpacity>

      {/* Emergency Banner */}
      <TouchableOpacity 
        style={styles.emergencyBanner}
        onPress={() => handleCall('988')}
      >
        <Ionicons name="warning" size={24} color="#fff" />
        <View style={styles.emergencyText}>
          <Text style={styles.emergencyTitle}>In Crisis? Call or Text 988</Text>
          <Text style={styles.emergencySubtitle}>24/7 Suicide & Crisis Lifeline</Text>
        </View>
        <Ionicons name="call" size={24} color="#fff" />
      </TouchableOpacity>

      {render911Modal()}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  emergencyBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#dc2626',
    marginHorizontal: 20,
    padding: 16,
    borderRadius: 12,
    marginBottom: 40,
  },
  emergencyText: {
    flex: 1,
    marginLeft: 12,
  },
  emergencyTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  emergencySubtitle: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 12,
    marginTop: 2,
  },
  emergency911Button: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(220, 38, 38, 0.1)',
    marginHorizontal: 20,
    padding: 14,
    borderRadius: 12,
    marginTop: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(220, 38, 38, 0.3)',
  },
  emergency911Icon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(220, 38, 38, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  emergency911Text: {
    flex: 1,
    color: '#dc2626',
    fontSize: 14,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modal911Container: {
    backgroundColor: '#1a1a2e',
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 340,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(220, 38, 38, 0.3)',
  },
  modal911Icon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(220, 38, 38, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  modal911Title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 12,
    textAlign: 'center',
  },
  modal911Description: {
    fontSize: 15,
    color: '#ccc',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 16,
  },
  modal911Note: {
    fontSize: 13,
    color: '#f59e0b',
    textAlign: 'center',
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    padding: 12,
    borderRadius: 8,
    marginBottom: 20,
  },
  modal911Checklist: {
    alignSelf: 'stretch',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
  },
  modal911CheckItem: {
    color: '#22c55e',
    fontSize: 14,
    marginBottom: 8,
  },
  modal911Actions: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  modal911CancelButton: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
  },
  modal911CancelText: {
    color: '#8b8b8b',
    fontSize: 16,
    fontWeight: '600',
  },
  modal911ContinueButton: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#f59e0b',
    alignItems: 'center',
  },
  modal911ContinueText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  modal911CallButton: {
    backgroundColor: '#dc2626',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  modal911CallText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  modal911Progress: {
    flexDirection: 'row',
    marginTop: 20,
    gap: 8,
  },
  modal911ProgressDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  modal911ProgressDotActive: {
    backgroundColor: '#dc2626',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
    paddingBottom: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
  },
  sectionIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  sectionTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  sectionContent: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  aboutTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 16,
    marginBottom: 8,
  },
  aboutText: {
    fontSize: 14,
    color: '#ccc',
    lineHeight: 22,
    marginBottom: 8,
  },
  bulletList: {
    marginBottom: 16,
  },
  bulletItem: {
    fontSize: 14,
    color: '#ccc',
    lineHeight: 24,
    marginLeft: 8,
  },
  bulletBold: {
    fontWeight: '600',
    color: '#fff',
  },
  featureGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginVertical: 16,
  },
  featureItem: {
    width: '48%',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
  },
  featureLabel: {
    color: '#ccc',
    fontSize: 12,
    marginTop: 8,
    textAlign: 'center',
  },
  scienceCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderLeftWidth: 3,
    borderLeftColor: '#22c55e',
  },
  scienceTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  scienceText: {
    fontSize: 13,
    color: '#ccc',
    lineHeight: 20,
  },
  resourceCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  resourceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  resourceIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  resourceInfo: {
    flex: 1,
  },
  resourceName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 2,
  },
  resourceAvailable: {
    fontSize: 12,
    color: '#22c55e',
    fontWeight: '500',
  },
  resourceDescription: {
    fontSize: 13,
    color: '#ccc',
    lineHeight: 20,
    marginBottom: 12,
  },
  resourceActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
  },
  actionText: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
  },
  researchCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  researchTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  researchAuthors: {
    fontSize: 12,
    color: '#8b8b8b',
    marginBottom: 2,
  },
  researchJournal: {
    fontSize: 12,
    color: '#8b5cf6',
    fontStyle: 'italic',
    marginBottom: 8,
  },
  researchSummary: {
    fontSize: 13,
    color: '#ccc',
    lineHeight: 20,
  },
  footer: {
    marginTop: 24,
    padding: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  footerText: {
    fontSize: 12,
    color: '#8b8b8b',
    lineHeight: 18,
    textAlign: 'center',
  },
});
