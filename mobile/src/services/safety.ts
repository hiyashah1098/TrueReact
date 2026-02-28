/**
 * TrueReact - Safety & Crisis Prevention Service
 * 
 * Manages emergency contacts, detects crisis patterns,
 * and provides quick-access safety resources.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { Linking, Platform } from 'react-native';

const SAFETY_CONTACTS_KEY = '@truereact_safety_contacts';
const SAFETY_PLAN_KEY = '@truereact_safety_plan';
const CRISIS_HISTORY_KEY = '@truereact_crisis_history';

export type EmergencyContact = {
  id: string;
  name: string;
  relationship: string;
  phone: string;
  isICE: boolean; // In Case of Emergency primary contact
  canReceiveAlerts: boolean;
  notes?: string;
};

export type CrisisResource = {
  id: string;
  name: string;
  description: string;
  phone?: string;
  url?: string;
  available: string; // e.g., "24/7", "9am-5pm"
  type: 'hotline' | 'text' | 'chat' | 'app' | 'local';
  icon: string;
  color: string;
};

export type SafetyPlanItem = {
  id: string;
  category: 'warning_signs' | 'coping_strategies' | 'distractions' | 'reasons_to_live' | 'professional_support';
  content: string;
  order: number;
};

export type SafetyPlan = {
  warningsSigns: string[];
  copingStrategies: string[];
  distractions: string[];
  reasonsToLive: string[];
  safeEnvironmentSteps: string[];
  professionalContacts: string[];
  lastUpdated: string;
};

export type CrisisEvent = {
  id: string;
  timestamp: string;
  severity: 'low' | 'moderate' | 'high';
  trigger?: string;
  copingUsed: string[];
  outcome: 'managed' | 'reached_out' | 'crisis_line' | 'emergency';
  notes?: string;
};

// Default crisis resources
export const CRISIS_RESOURCES: CrisisResource[] = [
  {
    id: 'suicide_lifeline',
    name: '988 Suicide & Crisis Lifeline',
    description: 'Free, confidential 24/7 support',
    phone: '988',
    available: '24/7',
    type: 'hotline',
    icon: 'call-outline',
    color: '#E74C3C',
  },
  {
    id: 'crisis_text',
    name: 'Crisis Text Line',
    description: 'Text HOME to 741741',
    phone: '741741',
    available: '24/7',
    type: 'text',
    icon: 'chatbubble-outline',
    color: '#3498DB',
  },
  {
    id: 'trevor_project',
    name: 'Trevor Project',
    description: 'LGBTQ+ youth crisis support',
    phone: '1-866-488-7386',
    available: '24/7',
    type: 'hotline',
    icon: 'heart-outline',
    color: '#9B59B6',
  },
  {
    id: 'samhsa',
    name: 'SAMHSA Helpline',
    description: 'Substance abuse and mental health',
    phone: '1-800-662-4357',
    available: '24/7',
    type: 'hotline',
    icon: 'medical-outline',
    color: '#27AE60',
  },
  {
    id: 'veterans_crisis',
    name: 'Veterans Crisis Line',
    description: 'For veterans and their families',
    phone: '988',
    available: '24/7, press 1',
    type: 'hotline',
    icon: 'flag-outline',
    color: '#2C3E50',
  },
  {
    id: 'nami',
    name: 'NAMI Helpline',
    description: 'Mental health information and support',
    phone: '1-800-950-6264',
    available: 'Mon-Fri 10am-10pm ET',
    type: 'hotline',
    icon: 'information-circle-outline',
    color: '#4ECDC4',
  },
];

// Grounding exercises for crisis moments
export const CRISIS_GROUNDING = [
  {
    id: 'breathe',
    name: 'Slow Breathing',
    description: 'Take 5 deep breaths. In for 4, hold for 4, out for 4.',
    icon: 'leaf-outline',
    color: '#4ECDC4',
  },
  {
    id: 'senses',
    name: '5-4-3-2-1 Senses',
    description: '5 things you see, 4 hear, 3 touch, 2 smell, 1 taste.',
    icon: 'hand-left-outline',
    color: '#7BC67E',
  },
  {
    id: 'cold_water',
    name: 'Cold Water',
    description: 'Run cold water on your wrists or splash your face.',
    icon: 'water-outline',
    color: '#3498DB',
  },
  {
    id: 'hold_ice',
    name: 'Hold Ice',
    description: 'Hold an ice cube. Focus on the cold sensation.',
    icon: 'snow-outline',
    color: '#45B7D1',
  },
  {
    id: 'name_objects',
    name: 'Name Objects',
    description: 'Name 10 blue things you see around you.',
    icon: 'eye-outline',
    color: '#6B8DD6',
  },
  {
    id: 'feet_floor',
    name: 'Feet on Floor',
    description: 'Press feet firmly into the ground. Feel the stability.',
    icon: 'footsteps-outline',
    color: '#8B7355',
  },
];

// Load emergency contacts
export async function getEmergencyContacts(): Promise<EmergencyContact[]> {
  try {
    const data = await AsyncStorage.getItem(SAFETY_CONTACTS_KEY);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('Failed to load emergency contacts:', error);
    return [];
  }
}

// Save emergency contacts
async function saveEmergencyContacts(contacts: EmergencyContact[]): Promise<void> {
  try {
    await AsyncStorage.setItem(SAFETY_CONTACTS_KEY, JSON.stringify(contacts));
  } catch (error) {
    console.error('Failed to save emergency contacts:', error);
  }
}

// Add emergency contact
export async function addEmergencyContact(contact: Omit<EmergencyContact, 'id'>): Promise<EmergencyContact> {
  const contacts = await getEmergencyContacts();
  
  const newContact: EmergencyContact = {
    ...contact,
    id: `contact_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
  };
  
  // If this is ICE, remove ICE from others
  if (newContact.isICE) {
    contacts.forEach(c => c.isICE = false);
  }
  
  contacts.push(newContact);
  await saveEmergencyContacts(contacts);
  return newContact;
}

// Update emergency contact
export async function updateEmergencyContact(
  id: string,
  updates: Partial<EmergencyContact>
): Promise<EmergencyContact | null> {
  const contacts = await getEmergencyContacts();
  const index = contacts.findIndex(c => c.id === id);
  
  if (index === -1) return null;
  
  // If setting as ICE, remove ICE from others
  if (updates.isICE) {
    contacts.forEach(c => c.isICE = false);
  }
  
  contacts[index] = { ...contacts[index], ...updates };
  await saveEmergencyContacts(contacts);
  return contacts[index];
}

// Delete emergency contact
export async function deleteEmergencyContact(id: string): Promise<boolean> {
  const contacts = await getEmergencyContacts();
  const filtered = contacts.filter(c => c.id !== id);
  
  if (filtered.length === contacts.length) return false;
  
  await saveEmergencyContacts(filtered);
  return true;
}

// Get ICE contact
export async function getICEContact(): Promise<EmergencyContact | null> {
  const contacts = await getEmergencyContacts();
  return contacts.find(c => c.isICE) || contacts[0] || null;
}

// Load safety plan
export async function getSafetyPlan(): Promise<SafetyPlan> {
  try {
    const data = await AsyncStorage.getItem(SAFETY_PLAN_KEY);
    if (data) return JSON.parse(data);
  } catch (error) {
    console.error('Failed to load safety plan:', error);
  }
  
  // Default empty plan
  return {
    warningsSigns: [],
    copingStrategies: [],
    distractions: [],
    reasonsToLive: [],
    safeEnvironmentSteps: [],
    professionalContacts: [],
    lastUpdated: new Date().toISOString(),
  };
}

// Save safety plan
export async function saveSafetyPlan(plan: SafetyPlan): Promise<void> {
  try {
    await AsyncStorage.setItem(SAFETY_PLAN_KEY, JSON.stringify({
      ...plan,
      lastUpdated: new Date().toISOString(),
    }));
  } catch (error) {
    console.error('Failed to save safety plan:', error);
  }
}

// Load crisis history
export async function getCrisisHistory(): Promise<CrisisEvent[]> {
  try {
    const data = await AsyncStorage.getItem(CRISIS_HISTORY_KEY);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('Failed to load crisis history:', error);
    return [];
  }
}

// Log crisis event
export async function logCrisisEvent(event: Omit<CrisisEvent, 'id' | 'timestamp'>): Promise<CrisisEvent> {
  const history = await getCrisisHistory();
  
  const newEvent: CrisisEvent = {
    ...event,
    id: `crisis_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    timestamp: new Date().toISOString(),
  };
  
  history.unshift(newEvent);
  
  try {
    await AsyncStorage.setItem(CRISIS_HISTORY_KEY, JSON.stringify(history.slice(0, 100)));
  } catch (error) {
    console.error('Failed to save crisis event:', error);
  }
  
  return newEvent;
}

// Call emergency contact
export async function callEmergencyContact(contact: EmergencyContact): Promise<void> {
  const phoneUrl = Platform.select({
    ios: `tel:${contact.phone}`,
    android: `tel:${contact.phone}`,
  });
  
  if (phoneUrl) {
    const canOpen = await Linking.canOpenURL(phoneUrl);
    if (canOpen) {
      await Linking.openURL(phoneUrl);
    }
  }
}

// Call crisis resource
export async function callCrisisResource(resource: CrisisResource): Promise<void> {
  if (!resource.phone) return;
  
  const phoneUrl = Platform.select({
    ios: `tel:${resource.phone}`,
    android: `tel:${resource.phone}`,
  });
  
  if (phoneUrl) {
    const canOpen = await Linking.canOpenURL(phoneUrl);
    if (canOpen) {
      await Linking.openURL(phoneUrl);
    }
  }
}

// Text crisis line
export async function textCrisisLine(): Promise<void> {
  const smsUrl = Platform.select({
    ios: 'sms:741741&body=HOME',
    android: 'sms:741741?body=HOME',
  });
  
  if (smsUrl) {
    const canOpen = await Linking.canOpenURL(smsUrl);
    if (canOpen) {
      await Linking.openURL(smsUrl);
    }
  }
}

// Analyze patterns for early warning
export async function analyzeCrisisPatterns(): Promise<{
  recentEvents: number;
  averageSeverity: number;
  commonTriggers: string[];
  effectiveCoping: string[];
  riskLevel: 'low' | 'moderate' | 'elevated' | 'high';
  recommendation: string;
}> {
  const history = await getCrisisHistory();
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  
  const recentEvents = history.filter(e => 
    new Date(e.timestamp) >= thirtyDaysAgo
  );
  
  if (recentEvents.length === 0) {
    return {
      recentEvents: 0,
      averageSeverity: 0,
      commonTriggers: [],
      effectiveCoping: [],
      riskLevel: 'low',
      recommendation: 'Keep building your coping toolkit and safety plan.',
    };
  }
  
  // Calculate average severity
  const severityMap = { low: 1, moderate: 2, high: 3 };
  const avgSeverity = recentEvents.reduce(
    (sum, e) => sum + severityMap[e.severity],
    0
  ) / recentEvents.length;
  
  // Find common triggers
  const triggerCounts: Record<string, number> = {};
  recentEvents.forEach(e => {
    if (e.trigger) {
      triggerCounts[e.trigger] = (triggerCounts[e.trigger] || 0) + 1;
    }
  });
  const commonTriggers = Object.entries(triggerCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([trigger]) => trigger);
  
  // Find effective coping
  const copingCounts: Record<string, { used: number; successful: number }> = {};
  recentEvents.forEach(e => {
    const wasSuccessful = e.outcome === 'managed';
    e.copingUsed.forEach(coping => {
      if (!copingCounts[coping]) {
        copingCounts[coping] = { used: 0, successful: 0 };
      }
      copingCounts[coping].used++;
      if (wasSuccessful) {
        copingCounts[coping].successful++;
      }
    });
  });
  
  const effectiveCoping = Object.entries(copingCounts)
    .filter(([_, stats]) => stats.successful / stats.used > 0.5)
    .slice(0, 3)
    .map(([coping]) => coping);
  
  // Determine risk level
  let riskLevel: 'low' | 'moderate' | 'elevated' | 'high' = 'low';
  let recommendation = 'Keep using your coping strategies.';
  
  if (recentEvents.length > 10 || avgSeverity > 2.5) {
    riskLevel = 'high';
    recommendation = 'Consider reaching out to a mental health professional.';
  } else if (recentEvents.length > 5 || avgSeverity > 2) {
    riskLevel = 'elevated';
    recommendation = 'You might benefit from additional support. Consider talking to someone.';
  } else if (recentEvents.length > 2 || avgSeverity > 1.5) {
    riskLevel = 'moderate';
    recommendation = 'Stay connected with your support network.';
  }
  
  return {
    recentEvents: recentEvents.length,
    averageSeverity: Math.round(avgSeverity * 10) / 10,
    commonTriggers,
    effectiveCoping,
    riskLevel,
    recommendation,
  };
}

// Quick check-in questions
export const SAFETY_CHECKIN_QUESTIONS = [
  {
    id: 'self_harm',
    question: 'Are you having thoughts of hurting yourself?',
    severity: 'high',
  },
  {
    id: 'hopeless',
    question: 'Are you feeling hopeless about the future?',
    severity: 'moderate',
  },
  {
    id: 'alone',
    question: 'Do you feel like you have no one to turn to?',
    severity: 'moderate',
  },
  {
    id: 'overwhelmed',
    question: 'Do you feel completely overwhelmed right now?',
    severity: 'low',
  },
];

// Get quick safety recommendation based on check-in
export function getQuickSafetyRecommendation(answers: Record<string, boolean>): {
  urgency: 'immediate' | 'soon' | 'self_care';
  action: string;
  resource?: CrisisResource;
} {
  if (answers.self_harm) {
    return {
      urgency: 'immediate',
      action: 'Please reach out to a crisis line right now. You deserve support.',
      resource: CRISIS_RESOURCES[0], // 988 Lifeline
    };
  }
  
  if (answers.hopeless || answers.alone) {
    return {
      urgency: 'soon',
      action: 'It sounds like you could use some support. Consider reaching out to someone.',
      resource: CRISIS_RESOURCES[1], // Crisis Text Line
    };
  }
  
  return {
    urgency: 'self_care',
    action: 'Try some grounding exercises and check in with yourself.',
  };
}
