import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  TextInput,
  Alert,
  ActivityIndicator,
  RefreshControl,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import {
  searchUsers,
  sendConnectionRequest,
  acceptConnectionRequest,
  getPendingRequests,
  getConnections,
  getOrCreateConversation,
  getUserProfile,
  CommunityUser,
  Connection,
} from '../services/firebase';

type Tab = 'connections' | 'requests' | 'search';

export default function CommunityScreen({ navigation }: any) {
  const { colors, isDark } = useTheme();
  const { user } = useAuth();
  
  const [activeTab, setActiveTab] = useState<Tab>('connections');
  const [connections, setConnections] = useState<CommunityUser[]>([]);
  const [pendingRequests, setPendingRequests] = useState<(Connection & { user?: CommunityUser })[]>([]);
  const [searchResults, setSearchResults] = useState<CommunityUser[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const loadConnections = useCallback(async () => {
    if (!user?.uid) return;
    try {
      const conns = await getConnections(user.uid);
      setConnections(conns);
    } catch (error) {
      console.error('Error loading connections:', error);
    }
  }, [user?.uid]);

  const loadPendingRequests = useCallback(async () => {
    if (!user?.uid) return;
    try {
      const requests = await getPendingRequests(user.uid);
      // Load user profiles for each request
      const requestsWithUsers = await Promise.all(
        requests.map(async (req) => {
          const profile = await getUserProfile(req.userId);
          const communityUser: CommunityUser | undefined = profile ? {
            uid: profile.uid,
            displayName: profile.displayName || 'Anonymous',
            email: profile.email || '',
            photoURL: profile.photoURL || undefined,
          } : undefined;
          return { ...req, user: communityUser };
        })
      );
      setPendingRequests(requestsWithUsers);
    } catch (error) {
      console.error('Error loading pending requests:', error);
    }
  }, [user?.uid]);

  const loadData = useCallback(async () => {
    setLoading(true);
    await Promise.all([loadConnections(), loadPendingRequests()]);
    setLoading(false);
  }, [loadConnections, loadPendingRequests]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleSearch = async () => {
    if (!user?.uid || searchQuery.trim().length < 2) return;
    setLoading(true);
    try {
      const results = await searchUsers(searchQuery, user.uid);
      setSearchResults(results);
    } catch (error) {
      console.error('Error searching users:', error);
      Alert.alert('Error', 'Failed to search for users');
    }
    setLoading(false);
  };

  const handleSendRequest = async (toUserId: string) => {
    if (!user?.uid) return;
    try {
      await sendConnectionRequest(user.uid, toUserId);
      Alert.alert('Success', 'Connection request sent!');
      // Remove from search results
      setSearchResults(prev => prev.filter(u => u.uid !== toUserId));
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to send request');
    }
  };

  const handleAcceptRequest = async (connectionId: string) => {
    try {
      await acceptConnectionRequest(connectionId);
      Alert.alert('Success', 'Connection accepted!');
      await loadData();
    } catch (error) {
      Alert.alert('Error', 'Failed to accept request');
    }
  };

  const handleStartChat = async (otherUserId: string, displayName: string) => {
    if (!user?.uid) return;
    try {
      const conversationId = await getOrCreateConversation(user.uid, otherUserId);
      navigation.navigate('Chat', { conversationId, otherUserId, displayName });
    } catch (error) {
      Alert.alert('Error', 'Failed to start chat');
    }
  };

  const handleCall = (phoneNumber?: string, displayName?: string) => {
    Alert.alert(
      'Voice Call',
      `To make a voice call, you'll need to exchange phone numbers through chat first.\n\nWould you like to message ${displayName || 'this user'} instead?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Open Chat', onPress: () => {} },
      ]
    );
  };

  const handleVideoCall = (displayName?: string) => {
    Alert.alert(
      'Video Call',
      'Video calling requires both users to be online and connected. This feature uses peer-to-peer connection.\n\nWould you like to send a video call request through chat?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Send Request', onPress: () => {} },
      ]
    );
  };

  const renderUserCard = (userItem: CommunityUser, type: 'connection' | 'request' | 'search', connectionId?: string) => (
    <View style={[styles.userCard, { backgroundColor: isDark ? '#1E1E1E' : '#FFF' }]}>
      <View style={styles.userAvatarContainer}>
        <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
          <Text style={styles.avatarText}>
            {(userItem.displayName || 'U').charAt(0).toUpperCase()}
          </Text>
        </View>
        {userItem.isOnline && <View style={styles.onlineIndicator} />}
      </View>
      
      <View style={styles.userInfo}>
        <Text style={[styles.userName, { color: colors.text }]}>
          {userItem.displayName || 'Anonymous'}
        </Text>
        {userItem.bio && (
          <Text style={[styles.userBio, { color: colors.textSecondary }]} numberOfLines={1}>
            {userItem.bio}
          </Text>
        )}
        {userItem.stats && (
          <Text style={[styles.userStats, { color: colors.textSecondary }]}>
            {userItem.stats.totalSessions || 0} sessions
          </Text>
        )}
      </View>

      <View style={styles.actionButtons}>
        {type === 'connection' && (
          <>
            <TouchableOpacity
              style={[styles.iconButton, { backgroundColor: colors.primary }]}
              onPress={() => handleStartChat(userItem.uid, userItem.displayName)}
            >
              <Ionicons name="chatbubble" size={18} color="#FFF" />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.iconButton, { backgroundColor: '#34C759' }]}
              onPress={() => handleCall(undefined, userItem.displayName)}
            >
              <Ionicons name="call" size={18} color="#FFF" />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.iconButton, { backgroundColor: '#5856D6' }]}
              onPress={() => handleVideoCall(userItem.displayName)}
            >
              <Ionicons name="videocam" size={18} color="#FFF" />
            </TouchableOpacity>
          </>
        )}
        {type === 'request' && connectionId && (
          <>
            <TouchableOpacity
              style={[styles.acceptButton, { backgroundColor: '#34C759' }]}
              onPress={() => handleAcceptRequest(connectionId)}
            >
              <Text style={styles.buttonText}>Accept</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.iconButton, { backgroundColor: '#FF3B30' }]}
              onPress={() => Alert.alert('Decline', 'This request has been declined')}
            >
              <Ionicons name="close" size={18} color="#FFF" />
            </TouchableOpacity>
          </>
        )}
        {type === 'search' && (
          <TouchableOpacity
            style={[styles.connectButton, { backgroundColor: colors.primary }]}
            onPress={() => handleSendRequest(userItem.uid)}
          >
            <Ionicons name="person-add" size={16} color="#FFF" />
            <Text style={styles.buttonText}>Connect</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

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
    },
    backButton: {
      padding: 8,
      marginRight: 8,
    },
    headerTitle: {
      fontSize: 24,
      fontWeight: 'bold',
      color: colors.text,
    },
    tabContainer: {
      flexDirection: 'row',
      paddingHorizontal: 16,
      marginBottom: 16,
    },
    tab: {
      flex: 1,
      paddingVertical: 12,
      alignItems: 'center',
      borderBottomWidth: 2,
      borderBottomColor: 'transparent',
    },
    activeTab: {
      borderBottomColor: colors.primary,
    },
    tabText: {
      fontSize: 14,
      fontWeight: '500',
      color: colors.textSecondary,
    },
    activeTabText: {
      color: colors.primary,
    },
    badge: {
      position: 'absolute',
      top: 8,
      right: 20,
      backgroundColor: '#FF3B30',
      borderRadius: 10,
      minWidth: 20,
      height: 20,
      justifyContent: 'center',
      alignItems: 'center',
    },
    badgeText: {
      color: '#FFF',
      fontSize: 12,
      fontWeight: 'bold',
    },
    searchContainer: {
      flexDirection: 'row',
      paddingHorizontal: 16,
      marginBottom: 16,
    },
    searchInput: {
      flex: 1,
      backgroundColor: isDark ? '#2C2C2E' : '#F2F2F7',
      borderRadius: 12,
      paddingHorizontal: 16,
      paddingVertical: 12,
      fontSize: 16,
      color: colors.text,
      marginRight: 8,
    },
    searchButton: {
      backgroundColor: colors.primary,
      borderRadius: 12,
      paddingHorizontal: 16,
      justifyContent: 'center',
    },
    listContent: {
      paddingHorizontal: 16,
      paddingBottom: 32,
    },
    userCard: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 16,
      borderRadius: 16,
      marginBottom: 12,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 3,
    },
    userAvatarContainer: {
      position: 'relative',
    },
    avatar: {
      width: 50,
      height: 50,
      borderRadius: 25,
      justifyContent: 'center',
      alignItems: 'center',
    },
    avatarText: {
      fontSize: 20,
      fontWeight: 'bold',
      color: '#FFF',
    },
    onlineIndicator: {
      position: 'absolute',
      bottom: 2,
      right: 2,
      width: 14,
      height: 14,
      borderRadius: 7,
      backgroundColor: '#34C759',
      borderWidth: 2,
      borderColor: '#FFF',
    },
    userInfo: {
      flex: 1,
      marginLeft: 12,
    },
    userName: {
      fontSize: 16,
      fontWeight: '600',
    },
    userBio: {
      fontSize: 13,
      marginTop: 2,
    },
    userStats: {
      fontSize: 12,
      marginTop: 2,
    },
    actionButtons: {
      flexDirection: 'row',
      gap: 8,
    },
    iconButton: {
      width: 36,
      height: 36,
      borderRadius: 18,
      justifyContent: 'center',
      alignItems: 'center',
    },
    acceptButton: {
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 8,
    },
    connectButton: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 8,
      gap: 4,
    },
    buttonText: {
      color: '#FFF',
      fontWeight: '600',
      fontSize: 14,
    },
    emptyContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: 32,
      paddingTop: 60,
    },
    emptyIcon: {
      marginBottom: 16,
    },
    emptyTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: colors.text,
      marginBottom: 8,
      textAlign: 'center',
    },
    emptyText: {
      fontSize: 14,
      color: colors.textSecondary,
      textAlign: 'center',
      lineHeight: 20,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
  });

  const renderEmptyState = () => {
    let icon = 'people-outline';
    let title = '';
    let message = '';

    switch (activeTab) {
      case 'connections':
        icon = 'people-outline';
        title = 'No Connections Yet';
        message = 'Search for other TrueReact users and send them a connection request to start building your support network.';
        break;
      case 'requests':
        icon = 'person-add-outline';
        title = 'No Pending Requests';
        message = 'When other users want to connect with you, their requests will appear here.';
        break;
      case 'search':
        icon = 'search-outline';
        title = 'Find Your Community';
        message = 'Search for other users by their name or email to connect and support each other.';
        break;
    }

    return (
      <View style={styles.emptyContainer}>
        <Ionicons name={icon as any} size={64} color={colors.textSecondary} style={styles.emptyIcon} />
        <Text style={styles.emptyTitle}>{title}</Text>
        <Text style={styles.emptyText}>{message}</Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Community</Text>
      </View>

      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'connections' && styles.activeTab]}
          onPress={() => setActiveTab('connections')}
        >
          <Text style={[styles.tabText, activeTab === 'connections' && styles.activeTabText]}>
            Connections
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'requests' && styles.activeTab]}
          onPress={() => setActiveTab('requests')}
        >
          <Text style={[styles.tabText, activeTab === 'requests' && styles.activeTabText]}>
            Requests
          </Text>
          {pendingRequests.length > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{pendingRequests.length}</Text>
            </View>
          )}
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'search' && styles.activeTab]}
          onPress={() => setActiveTab('search')}
        >
          <Text style={[styles.tabText, activeTab === 'search' && styles.activeTabText]}>
            Find Users
          </Text>
        </TouchableOpacity>
      </View>

      {activeTab === 'search' && (
        <View style={styles.searchContainer}>
          <TextInput
            style={styles.searchInput}
            placeholder="Search by name or email..."
            placeholderTextColor={colors.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
            onSubmitEditing={handleSearch}
            autoCapitalize="none"
          />
          <TouchableOpacity style={styles.searchButton} onPress={handleSearch}>
            <Ionicons name="search" size={24} color="#FFF" />
          </TouchableOpacity>
        </View>
      )}

      {loading && !refreshing ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={
            activeTab === 'connections' 
              ? connections 
              : activeTab === 'requests'
              ? pendingRequests.map(r => r.user).filter(Boolean) as CommunityUser[]
              : searchResults
          }
          keyExtractor={(item) => item.uid}
          renderItem={({ item, index }) => {
            if (activeTab === 'requests') {
              const request = pendingRequests[index];
              return renderUserCard(item, 'request', request?.id);
            }
            return renderUserCard(item, activeTab === 'connections' ? 'connection' : 'search');
          }}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[colors.primary]}
              tintColor={colors.primary}
            />
          }
          ListEmptyComponent={renderEmptyState}
        />
      )}
    </SafeAreaView>
  );
}
