/**
 * TrueReact - Firebase Configuration
 * 
 * Initializes Firebase for authentication, session history storage,
 * and push notifications.
 */

import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getAuth, 
  GoogleAuthProvider,
  signInWithCredential,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  User
} from 'firebase/auth';
import { 
  getFirestore, 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  limit,
  addDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  Timestamp,
  DocumentData
} from 'firebase/firestore';

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBHp6HCmXyMKMjQfi7p4JJTO-GOnpNYYYw",
  authDomain: "truereact-c7d0e.firebaseapp.com",
  projectId: "truereact-c7d0e",
  storageBucket: "truereact-c7d0e.firebasestorage.app",
  messagingSenderId: "146130381910",
  appId: "1:146130381910:web:2e0c06310c8073ca4d9ff7",
  measurementId: "G-7C5ZW1Z6H6"
};

// Initialize Firebase (only if not already initialized)
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Initialize Auth
const auth = getAuth(app);

// Initialize Firestore
const db = getFirestore(app);

// Export instances
export { app, auth, db };

// ==================== AUTH FUNCTIONS ====================

export async function signInWithEmail(email: string, password: string): Promise<User> {
  const userCredential = await signInWithEmailAndPassword(auth, email, password);
  return userCredential.user;
}

export async function signUpWithEmail(email: string, password: string): Promise<User> {
  const userCredential = await createUserWithEmailAndPassword(auth, email, password);
  
  // Create user profile in Firestore
  await createUserProfile(userCredential.user);
  
  return userCredential.user;
}

export async function signOut(): Promise<void> {
  await firebaseSignOut(auth);
}

export function subscribeToAuthChanges(callback: (user: User | null) => void): () => void {
  return onAuthStateChanged(auth, callback);
}

// ==================== USER PROFILE ====================

export interface UserProfile {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  createdAt: Date;
  settings: {
    hapticEnabled: boolean;
    voiceCoaching: boolean;
    safeStateEnabled: boolean;
    crisisResourcesLocation: string;
  };
  stats: {
    totalSessions: number;
    totalCoachingMoments: number;
    lastSessionAt: Date | null;
  };
}

export async function createUserProfile(user: User): Promise<void> {
  const userRef = doc(db, 'users', user.uid);
  const userSnap = await getDoc(userRef);
  
  if (!userSnap.exists()) {
    const profile: UserProfile = {
      uid: user.uid,
      email: user.email,
      displayName: user.displayName,
      photoURL: user.photoURL,
      createdAt: new Date(),
      settings: {
        hapticEnabled: true,
        voiceCoaching: true,
        safeStateEnabled: true,
        crisisResourcesLocation: 'US',
      },
      stats: {
        totalSessions: 0,
        totalCoachingMoments: 0,
        lastSessionAt: null,
      },
    };
    
    await setDoc(userRef, {
      ...profile,
      createdAt: Timestamp.fromDate(profile.createdAt),
    });
  }
}

export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  const userRef = doc(db, 'users', uid);
  const userSnap = await getDoc(userRef);
  
  if (userSnap.exists()) {
    const data = userSnap.data();
    return {
      ...data,
      createdAt: data.createdAt?.toDate() || new Date(),
      stats: {
        ...data.stats,
        lastSessionAt: data.stats?.lastSessionAt?.toDate() || null,
      },
    } as UserProfile;
  }
  
  return null;
}

export async function updateUserSettings(uid: string, settings: Partial<UserProfile['settings']>): Promise<void> {
  const userRef = doc(db, 'users', uid);
  await updateDoc(userRef, {
    settings: settings,
  });
}

// ==================== SESSION HISTORY ====================

export interface CoachingSession {
  id?: string;
  odId: string;
  startedAt: Date;
  endedAt: Date | null;
  duration: number; // in seconds
  feedbackCount: number;
  feedback: CoachingFeedbackEntry[];
  calibrationMetrics: any;
  safeStateTriggered: boolean;
}

export interface CoachingFeedbackEntry {
  timestamp: Date;
  category: 'expression' | 'voice' | 'posture' | 'general';
  observation: string;
  suggestion: string;
  urgency: 'low' | 'normal' | 'high';
}

export async function saveSession(uid: string, session: Omit<CoachingSession, 'id'>): Promise<string> {
  const sessionsRef = collection(db, 'users', uid, 'sessions');
  
  const docRef = await addDoc(sessionsRef, {
    ...session,
    startedAt: Timestamp.fromDate(session.startedAt),
    endedAt: session.endedAt ? Timestamp.fromDate(session.endedAt) : null,
    feedback: session.feedback.map(f => ({
      ...f,
      timestamp: Timestamp.fromDate(f.timestamp),
    })),
  });
  
  // Update user stats
  const userRef = doc(db, 'users', uid);
  const userSnap = await getDoc(userRef);
  
  if (userSnap.exists()) {
    const userData = userSnap.data();
    await updateDoc(userRef, {
      'stats.totalSessions': (userData.stats?.totalSessions || 0) + 1,
      'stats.totalCoachingMoments': (userData.stats?.totalCoachingMoments || 0) + session.feedbackCount,
      'stats.lastSessionAt': Timestamp.fromDate(session.endedAt || new Date()),
    });
  }
  
  return docRef.id;
}

export async function getSessionHistory(uid: string, limitCount: number = 10): Promise<CoachingSession[]> {
  const sessionsRef = collection(db, 'users', uid, 'sessions');
  const q = query(sessionsRef, orderBy('startedAt', 'desc'), limit(limitCount));
  
  const querySnapshot = await getDocs(q);
  const sessions: CoachingSession[] = [];
  
  querySnapshot.forEach((doc) => {
    const data = doc.data();
    sessions.push({
      id: doc.id,
      odId: data.odId,
      startedAt: data.startedAt?.toDate() || new Date(),
      endedAt: data.endedAt?.toDate() || null,
      duration: data.duration || 0,
      feedbackCount: data.feedbackCount || 0,
      feedback: (data.feedback || []).map((f: any) => ({
        ...f,
        timestamp: f.timestamp?.toDate() || new Date(),
      })),
      calibrationMetrics: data.calibrationMetrics,
      safeStateTriggered: data.safeStateTriggered || false,
    });
  });
  
  return sessions;
}

export async function getSession(uid: string, sessionId: string): Promise<CoachingSession | null> {
  const sessionRef = doc(db, 'users', uid, 'sessions', sessionId);
  const sessionSnap = await getDoc(sessionRef);
  
  if (sessionSnap.exists()) {
    const data = sessionSnap.data();
    return {
      id: sessionSnap.id,
      odId: data.odId,
      startedAt: data.startedAt?.toDate() || new Date(),
      endedAt: data.endedAt?.toDate() || null,
      duration: data.duration || 0,
      feedbackCount: data.feedbackCount || 0,
      feedback: (data.feedback || []).map((f: any) => ({
        ...f,
        timestamp: f.timestamp?.toDate() || new Date(),
      })),
      calibrationMetrics: data.calibrationMetrics,
      safeStateTriggered: data.safeStateTriggered || false,
    };
  }
  
  return null;
}

// ==================== PUSH NOTIFICATIONS ====================

export async function savePushToken(uid: string, token: string): Promise<void> {
  const userRef = doc(db, 'users', uid);
  await updateDoc(userRef, {
    pushToken: token,
    pushTokenUpdatedAt: Timestamp.now(),
  });
}

// ==================== COMMUNITY & MESSAGING ====================

export interface CommunityUser {
  uid: string;
  displayName: string;
  email: string;
  photoURL?: string;
  bio?: string;
  isOnline?: boolean;
  lastSeen?: Date;
  stats?: {
    totalSessions: number;
    totalCoachingMoments: number;
  };
}

export interface Connection {
  id?: string;
  userId: string;
  connectedUserId: string;
  status: 'pending' | 'accepted' | 'blocked';
  createdAt: Date;
  updatedAt: Date;
}

export interface Conversation {
  id?: string;
  participants: string[];
  lastMessage?: {
    text: string;
    senderId: string;
    timestamp: Date;
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface Message {
  id?: string;
  conversationId: string;
  senderId: string;
  text: string;
  type: 'text' | 'call_request' | 'video_request' | 'system';
  timestamp: Date;
  read: boolean;
}

// Search for users by display name or email
export async function searchUsers(searchTerm: string, currentUserId: string): Promise<CommunityUser[]> {
  const usersRef = collection(db, 'users');
  const searchLower = searchTerm.toLowerCase();
  
  // Get all users (in production, use proper indexing/search)
  const snapshot = await getDocs(usersRef);
  const users: CommunityUser[] = [];
  
  snapshot.forEach((docSnap) => {
    const data = docSnap.data();
    if (docSnap.id !== currentUserId) {
      const displayName = (data.displayName || '').toLowerCase();
      const email = (data.email || '').toLowerCase();
      
      if (displayName.includes(searchLower) || email.includes(searchLower)) {
        users.push({
          uid: docSnap.id,
          displayName: data.displayName || 'Anonymous',
          email: data.email || '',
          photoURL: data.photoURL,
          bio: data.bio,
          isOnline: data.isOnline,
          lastSeen: data.lastSeen?.toDate(),
          stats: data.stats,
        });
      }
    }
  });
  
  return users.slice(0, 20); // Limit results
}

// Send a connection request
export async function sendConnectionRequest(fromUserId: string, toUserId: string): Promise<string> {
  const connectionsRef = collection(db, 'connections');
  
  // Check if connection already exists
  const existingQuery = query(
    connectionsRef,
    where('userId', '==', fromUserId),
    where('connectedUserId', '==', toUserId)
  );
  const existing = await getDocs(existingQuery);
  
  if (!existing.empty) {
    throw new Error('Connection request already exists');
  }
  
  const docRef = await addDoc(connectionsRef, {
    userId: fromUserId,
    connectedUserId: toUserId,
    status: 'pending',
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  });
  
  return docRef.id;
}

// Accept a connection request
export async function acceptConnectionRequest(connectionId: string): Promise<void> {
  const connectionRef = doc(db, 'connections', connectionId);
  await updateDoc(connectionRef, {
    status: 'accepted',
    updatedAt: Timestamp.now(),
  });
}

// Get pending connection requests
export async function getPendingRequests(userId: string): Promise<Connection[]> {
  const connectionsRef = collection(db, 'connections');
  const q = query(
    connectionsRef,
    where('connectedUserId', '==', userId),
    where('status', '==', 'pending')
  );
  
  const snapshot = await getDocs(q);
  const connections: Connection[] = [];
  
  snapshot.forEach((docSnap) => {
    const data = docSnap.data();
    connections.push({
      id: docSnap.id,
      userId: data.userId,
      connectedUserId: data.connectedUserId,
      status: data.status,
      createdAt: data.createdAt?.toDate() || new Date(),
      updatedAt: data.updatedAt?.toDate() || new Date(),
    });
  });
  
  return connections;
}

// Get user's connections
export async function getConnections(userId: string): Promise<CommunityUser[]> {
  const connectionsRef = collection(db, 'connections');
  
  // Get connections where user is either sender or receiver
  const q1 = query(
    connectionsRef,
    where('userId', '==', userId),
    where('status', '==', 'accepted')
  );
  const q2 = query(
    connectionsRef,
    where('connectedUserId', '==', userId),
    where('status', '==', 'accepted')
  );
  
  const [snapshot1, snapshot2] = await Promise.all([getDocs(q1), getDocs(q2)]);
  
  const connectedUserIds: string[] = [];
  snapshot1.forEach((docSnap) => {
    connectedUserIds.push(docSnap.data().connectedUserId);
  });
  snapshot2.forEach((docSnap) => {
    connectedUserIds.push(docSnap.data().userId);
  });
  
  // Get user profiles
  const users: CommunityUser[] = [];
  for (const uid of connectedUserIds) {
    const userDoc = await getDoc(doc(db, 'users', uid));
    if (userDoc.exists()) {
      const data = userDoc.data();
      users.push({
        uid: userDoc.id,
        displayName: data.displayName || 'Anonymous',
        email: data.email || '',
        photoURL: data.photoURL,
        bio: data.bio,
        isOnline: data.isOnline,
        lastSeen: data.lastSeen?.toDate(),
        stats: data.stats,
      });
    }
  }
  
  return users;
}

// Get or create conversation between two users
export async function getOrCreateConversation(userId1: string, userId2: string): Promise<string> {
  const conversationsRef = collection(db, 'conversations');
  
  // Check for existing conversation
  const participants = [userId1, userId2].sort();
  const q = query(conversationsRef, where('participants', '==', participants));
  const snapshot = await getDocs(q);
  
  if (!snapshot.empty) {
    return snapshot.docs[0].id;
  }
  
  // Create new conversation
  const docRef = await addDoc(conversationsRef, {
    participants,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  });
  
  return docRef.id;
}

// Get user's conversations
export async function getConversations(userId: string): Promise<Conversation[]> {
  const conversationsRef = collection(db, 'conversations');
  const q = query(
    conversationsRef,
    where('participants', 'array-contains', userId),
    orderBy('updatedAt', 'desc'),
    limit(50)
  );
  
  const snapshot = await getDocs(q);
  const conversations: Conversation[] = [];
  
  snapshot.forEach((docSnap) => {
    const data = docSnap.data();
    conversations.push({
      id: docSnap.id,
      participants: data.participants,
      lastMessage: data.lastMessage ? {
        text: data.lastMessage.text,
        senderId: data.lastMessage.senderId,
        timestamp: data.lastMessage.timestamp?.toDate() || new Date(),
      } : undefined,
      createdAt: data.createdAt?.toDate() || new Date(),
      updatedAt: data.updatedAt?.toDate() || new Date(),
    });
  });
  
  return conversations;
}

// Send a message
export async function sendMessage(conversationId: string, senderId: string, text: string, type: Message['type'] = 'text'): Promise<string> {
  const messagesRef = collection(db, 'conversations', conversationId, 'messages');
  
  const docRef = await addDoc(messagesRef, {
    senderId,
    text,
    type,
    timestamp: Timestamp.now(),
    read: false,
  });
  
  // Update conversation's last message
  const conversationRef = doc(db, 'conversations', conversationId);
  await updateDoc(conversationRef, {
    lastMessage: {
      text: type === 'text' ? text : (type === 'call_request' ? '📞 Call request' : '📹 Video call request'),
      senderId,
      timestamp: Timestamp.now(),
    },
    updatedAt: Timestamp.now(),
  });
  
  return docRef.id;
}

// Get messages for a conversation
export async function getMessages(conversationId: string, limitCount: number = 50): Promise<Message[]> {
  const messagesRef = collection(db, 'conversations', conversationId, 'messages');
  const q = query(messagesRef, orderBy('timestamp', 'desc'), limit(limitCount));
  
  const snapshot = await getDocs(q);
  const messages: Message[] = [];
  
  snapshot.forEach((docSnap) => {
    const data = docSnap.data();
    messages.push({
      id: docSnap.id,
      conversationId,
      senderId: data.senderId,
      text: data.text,
      type: data.type || 'text',
      timestamp: data.timestamp?.toDate() || new Date(),
      read: data.read || false,
    });
  });
  
  return messages.reverse(); // Return in chronological order
}

// Subscribe to messages (real-time)
export function subscribeToMessages(
  conversationId: string, 
  callback: (messages: Message[]) => void
): () => void {
  const messagesRef = collection(db, 'conversations', conversationId, 'messages');
  const q = query(messagesRef, orderBy('timestamp', 'asc'));
  
  return onSnapshot(q, (snapshot) => {
    const messages: Message[] = [];
    snapshot.forEach((docSnap) => {
      const data = docSnap.data();
      messages.push({
        id: docSnap.id,
        conversationId,
        senderId: data.senderId,
        text: data.text,
        type: data.type || 'text',
        timestamp: data.timestamp?.toDate() || new Date(),
        read: data.read || false,
      });
    });
    callback(messages);
  });
}

// Update user's online status
export async function updateOnlineStatus(userId: string, isOnline: boolean): Promise<void> {
  const userRef = doc(db, 'users', userId);
  await updateDoc(userRef, {
    isOnline,
    lastSeen: Timestamp.now(),
  });
}

// Update user's profile bio
export async function updateUserBio(userId: string, bio: string): Promise<void> {
  const userRef = doc(db, 'users', userId);
  await updateDoc(userRef, {
    bio,
  });
}

export default {
  app,
  auth,
  db,
  signInWithEmail,
  signUpWithEmail,
  signOut,
  subscribeToAuthChanges,
  getUserProfile,
  updateUserSettings,
  saveSession,
  getSessionHistory,
  savePushToken,
  // Community & Messaging
  searchUsers,
  sendConnectionRequest,
  acceptConnectionRequest,
  getPendingRequests,
  getConnections,
  getOrCreateConversation,
  getConversations,
  sendMessage,
  getMessages,
  subscribeToMessages,
  updateOnlineStatus,
  updateUserBio,
};
