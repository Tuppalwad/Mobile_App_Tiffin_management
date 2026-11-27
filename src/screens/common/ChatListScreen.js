/**
 * Chat List & Contacts Screen
 * - Owner: sees delivered customers + groups, can create groups & add users.
 * - Customer: sees all active tiffin owners + groups, can chat directly with any owner.
 */

import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Modal,
  TextInput,
  Platform,
} from 'react-native';
import { CustomAlert } from "../../components/CustomAlert";
import {
  Users,
  User,
  UtensilsCrossed,
  ArrowLeft,
  MessageCircle,
  Package,
  X,
  Check,
  ArrowRight,
} from 'lucide-react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import { KeyboardModalView } from '../../components/KeyboardModalView';
import { COLORS, SIZES, FONTS } from '../../constants/theme';
import { chatApi } from '../../api/chatApi';
import { chatSocketService } from '../../services/chatSocketService';
import { useNotificationAutoRefresh } from '../../services/notificationEvents';

const formatListDateTime = (isoStr) => {
  if (!isoStr) return '';
  const d = new Date(isoStr);
  if (Number.isNaN(d.getTime())) return '';

  const now = new Date();
  const isToday = d.toDateString() === now.toDateString();
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const isYesterday = d.toDateString() === yesterday.toDateString();

  const timeStr = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  if (isToday) return timeStr;
  if (isYesterday) return `Yesterday`;
  return d.toLocaleDateString([], { day: '2-digit', month: 'short' });
};

export const ChatListScreen = ({ navigation }) => {
  const { user } = useSelector((state) => state.auth);
  const isOwner = user?.role === 'owner';

  const [activeTab, setActiveTab] = useState('chats'); // 'chats' | 'contacts'
  const [conversations, setConversations] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Owner-only Group Creation Modal
  const [groupModalVisible, setGroupModalVisible] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [groupDesc, setGroupDesc] = useState('');
  const [selectedMemberIds, setSelectedMemberIds] = useState([]);
  const [creatingGroup, setCreatingGroup] = useState(false);

  const fetchChatData = useCallback(async () => {
    try {
      const [convRes, contactRes] = await Promise.all([
        chatApi.getConversations().catch(() => ({ data: [] })),
        chatApi.getContacts().catch(() => ({ data: [] })),
      ]);
      setConversations(convRes?.data || []);
      setContacts(contactRes?.data || []);
    } catch (err) {
      console.warn('Chat fetch error:', err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchChatData();
      chatSocketService.connect();
    }, [fetchChatData])
  );

  // Real-time Socket.IO updates for conversation list & online status
  useEffect(() => {
    let unsubConv = () => {};
    let unsubPresence = () => {};

    const setupListeners = async () => {
      await chatSocketService.connect();
      unsubConv = chatSocketService.on('conversation:updated', () => {
        fetchChatData();
      });
      unsubPresence = chatSocketService.on('presence:update', ({ userId, isOnline }) => {
        setConversations((prev) =>
          prev.map((c) =>
            c.peer && c.peer.id === userId ? { ...c, peer: { ...c.peer, isOnline } } : c
          )
        );
        setContacts((prev) =>
          prev.map((ct) => (ct.id === userId ? { ...ct, isOnline } : ct))
        );
      });
    };

    setupListeners();
    return () => {
      unsubConv();
      unsubPresence();
    };
  }, [fetchChatData]);

  useNotificationAutoRefresh(['chat', 'NEW_CHAT_MESSAGE'], fetchChatData);

  const onRefresh = () => {
    setRefreshing(true);
    fetchChatData();
  };

  const openConversation = (conv) => {
    navigation.navigate('ChatRoom', {
      conversationId: conv.id,
      title: conv.name || conv.peer?.displayName || 'Chat',
      type: conv.type,
      peer: conv.peer,
      participants: conv.participants || [],
    });
  };

  const handleContactPress = async (contact) => {
    try {
      const res = await chatApi.startDirectChat(contact.id);
      const conv = res?.data;
      if (conv?.id) {
        navigation.navigate('ChatRoom', {
          conversationId: conv.id,
          title: contact.displayName || contact.name,
          type: 'direct',
          peer: contact,
          participants: conv.participants || [],
        });
      }
    } catch (err) {
      CustomAlert.alert('Chat Error', err.message || 'Could not start chat');
    }
  };

  const toggleMemberSelection = (memberId) => {
    setSelectedMemberIds((prev) =>
      prev.includes(memberId) ? prev.filter((id) => id !== memberId) : [...prev, memberId]
    );
  };

  const handleCreateGroup = async () => {
    if (!groupName.trim()) {
      CustomAlert.alert('Group Name Required', 'Please enter a name for the group.');
      return;
    }
    if (selectedMemberIds.length === 0) {
      CustomAlert.alert('Select Members', 'Please select at least one customer to add.');
      return;
    }

    setCreatingGroup(true);
    try {
      const res = await chatApi.createGroup({
        name: groupName.trim(),
        description: groupDesc.trim(),
        memberIds: selectedMemberIds,
      });
      setCreatingGroup(false);
      setGroupModalVisible(false);
      setGroupName('');
      setGroupDesc('');
      setSelectedMemberIds([]);
      fetchChatData();
      if (res?.data?.id) {
        openConversation(res.data);
      }
    } catch (err) {
      setCreatingGroup(false);
      CustomAlert.alert('Error', err.message || 'Failed to create group');
    }
  };

  const filteredConversations = conversations.filter((c) =>
    (c.name || '').toLowerCase().includes(searchQuery.trim().toLowerCase())
  );

  const filteredContacts = contacts.filter((ct) =>
    `${ct.displayName || ''} ${ct.name || ''} ${ct.phone || ''}`
      .toLowerCase()
      .includes(searchQuery.trim().toLowerCase())
  );

  const renderConversationItem = ({ item }) => {
    const isGroup = item.type === 'group';
    const isOnline = !isGroup && item.peer?.isOnline;

    return (
      <TouchableOpacity
        style={styles.rowCard}
        activeOpacity={0.85}
        onPress={() => openConversation(item)}
      >
        <View style={styles.avatarContainer}>
          <View style={[styles.avatar, isGroup && styles.groupAvatar]}>
            {isGroup ? (
              <Users size={22} color={COLORS.primary} />
            ) : isOwner ? (
              <User size={22} color={COLORS.primary} />
            ) : (
              <UtensilsCrossed size={22} color={COLORS.primary} />
            )}
          </View>
          {isOnline && <View style={styles.onlineDot} />}
        </View>

        <View style={styles.rowBody}>
          <View style={styles.rowTop}>
            <Text style={styles.rowTitle} numberOfLines={1}>
              {item.name}
            </Text>
            <Text style={styles.rowTime}>{formatListDateTime(item.lastMessageAt)}</Text>
          </View>

          <View style={styles.rowBottom}>
            <Text style={styles.rowPreview} numberOfLines={1}>
              {item.lastMessageText || (isGroup ? `${item.participantCount || 0} members` : 'Tap to start chatting')}
            </Text>
            {item.unreadCount > 0 && (
              <View style={styles.unreadPill}>
                <Text style={styles.unreadPillText}>
                  {item.unreadCount > 99 ? '99+' : item.unreadCount}
                </Text>
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderContactItem = ({ item }) => (
    <TouchableOpacity
      style={styles.rowCard}
      activeOpacity={0.85}
      onPress={() => handleContactPress(item)}
    >
      <View style={styles.avatarContainer}>
        <View style={styles.avatar}>
          {isOwner ? (
            <User size={22} color={COLORS.primary} />
          ) : (
            <UtensilsCrossed size={22} color={COLORS.primary} />
          )}
        </View>
        {item.isOnline && <View style={styles.onlineDot} />}
      </View>

      <View style={styles.rowBody}>
        <View style={styles.rowTop}>
          <Text style={styles.rowTitle} numberOfLines={1}>
            {item.displayName}
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
            <Text style={styles.chatActionLabel}>Chat</Text>
            <ArrowRight size={13} color={COLORS.primary} />
          </View>
        </View>

        <Text style={styles.rowPreview} numberOfLines={1}>
          {isOwner
            ? `Delivered Order #${item.lastOrderNumber} • ${item.phone || ''}`
            : `${item.city || 'Tiffin Service'} • ${item.deliveryAvailable ? 'Delivery' : 'Pickup'}`}
        </Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <ArrowLeft size={22} color={COLORS.text} />
        </TouchableOpacity>

        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Messages</Text>
          <Text style={styles.headerSub}>
            {isOwner ? 'Chat with delivered customers & groups' : 'Chat with homemade tiffin chefs'}
          </Text>
        </View>

        {isOwner && (
          <TouchableOpacity
            style={styles.newGroupBtn}
            onPress={() => setGroupModalVisible(true)}
          >
            <Text style={styles.newGroupBtnText}>+ Group</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Search Bar */}
      <View style={styles.searchWrap}>
        <TextInput
          style={styles.searchInput}
          placeholder={activeTab === 'chats' ? 'Search conversations...' : 'Search name or phone...'}
          placeholderTextColor={COLORS.textMuted}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {/* Tabs */}
      <View style={styles.tabRow}>
        <TouchableOpacity
          style={[styles.tabBtn, activeTab === 'chats' && styles.tabBtnActive, { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 }]}
          onPress={() => setActiveTab('chats')}
        >
          <MessageCircle size={15} color={activeTab === 'chats' ? COLORS.primary : COLORS.textSecondary} />
          <Text style={[styles.tabText, activeTab === 'chats' && styles.tabTextActive]}>
            Chats ({conversations.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabBtn, activeTab === 'contacts' && styles.tabBtnActive, { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 }]}
          onPress={() => setActiveTab('contacts')}
        >
          {isOwner ? (
            <Package size={15} color={activeTab === 'contacts' ? COLORS.primary : COLORS.textSecondary} />
          ) : (
            <UtensilsCrossed size={15} color={activeTab === 'contacts' ? COLORS.primary : COLORS.textSecondary} />
          )}
          <Text style={[styles.tabText, activeTab === 'contacts' && styles.tabTextActive]}>
            {isOwner ? `Delivered Users (${contacts.length})` : `Tiffin Owners (${contacts.length})`}
          </Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : activeTab === 'chats' ? (
        <FlatList
          data={filteredConversations}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderConversationItem}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} />}
          ListEmptyComponent={
            <View style={styles.emptyBox}>
              <MessageCircle size={48} color={COLORS.textMuted} style={{ marginBottom: 10 }} />
              <Text style={styles.emptyTitle}>No Conversations Yet</Text>
              <Text style={styles.emptySub}>
                {isOwner
                  ? 'Tap "Delivered Users" above to chat with customers or create a group.'
                  : 'Tap "Tiffin Owners" above to chat directly with any tiffin provider.'}
              </Text>
              <TouchableOpacity
                style={styles.emptyCta}
                onPress={() => setActiveTab('contacts')}
              >
                <Text style={styles.emptyCtaText}>
                  {isOwner ? 'View Delivered Users' : 'Browse Tiffin Owners'}
                </Text>
              </TouchableOpacity>
            </View>
          }
        />
      ) : (
        <FlatList
          data={filteredContacts}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderContactItem}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} />}
          ListEmptyComponent={
            <View style={styles.emptyBox}>
              {isOwner ? (
                <Package size={48} color={COLORS.textMuted} style={{ marginBottom: 10 }} />
              ) : (
                <UtensilsCrossed size={48} color={COLORS.textMuted} style={{ marginBottom: 10 }} />
              )}
              <Text style={styles.emptyTitle}>
                {isOwner ? 'No Delivered Customers Yet' : 'No Tiffin Owners Found'}
              </Text>
              <Text style={styles.emptySub}>
                {isOwner
                  ? 'Customers appear here once you deliver an order to them.'
                  : 'Active homemade tiffin providers will appear here.'}
              </Text>
            </View>
          }
        />
      )}

      {/* Owner-Only Create Group Modal */}
      <Modal
        visible={groupModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => !creatingGroup && setGroupModalVisible(false)}
      >
        <KeyboardModalView style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Create Customer Group</Text>
              <TouchableOpacity onPress={() => setGroupModalVisible(false)}>
                <X size={20} color={COLORS.textSecondary} />
              </TouchableOpacity>
            </View>

            <TextInput
              style={styles.modalInput}
              placeholder="Group Name (e.g. Daily Lunch Regulars) *"
              placeholderTextColor={COLORS.textMuted}
              value={groupName}
              onChangeText={setGroupName}
            />

            <TextInput
              style={styles.modalInput}
              placeholder="Description (optional)"
              placeholderTextColor={COLORS.textMuted}
              value={groupDesc}
              onChangeText={setGroupDesc}
            />

            <Text style={styles.selectLabel}>
              Select Customers ({selectedMemberIds.length} selected)
            </Text>

            <FlatList
              data={contacts}
              keyExtractor={(item) => item.id.toString()}
              style={{ maxHeight: 240, marginBottom: 14 }}
              ListEmptyComponent={
                <Text style={styles.noMembersText}>
                  No delivered customers available to add yet.
                </Text>
              }
              renderItem={({ item }) => {
                const selected = selectedMemberIds.includes(item.id);
                return (
                  <TouchableOpacity
                    style={[styles.memberPickRow, selected && styles.memberPickRowActive]}
                    onPress={() => toggleMemberSelection(item.id)}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={styles.memberPickName}>{item.displayName}</Text>
                      <Text style={styles.memberPickSub}>{item.phone}</Text>
                    </View>
                    <View style={[styles.checkbox, selected && styles.checkboxActive]}>
                      {selected && <Check size={14} color="#FFF" />}
                    </View>
                  </TouchableOpacity>
                );
              }}
            />

            <TouchableOpacity
              style={[styles.createGroupBtn, creatingGroup && { opacity: 0.7 }]}
              onPress={handleCreateGroup}
              disabled={creatingGroup}
            >
              {creatingGroup ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <Text style={styles.createGroupBtnText}>Create Group</Text>
              )}
            </TouchableOpacity>
          </View>
        </KeyboardModalView>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  backBtn: {
    paddingRight: 12,
    paddingVertical: 4,
  },
  backArrow: {
    fontSize: 22,
    color: COLORS.text,
    fontWeight: '700',
  },
  headerTitle: {
    ...FONTS.h3,
    color: COLORS.text,
  },
  headerSub: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  newGroupBtn: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: SIZES.radiusSm,
  },
  newGroupBtnText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '700',
  },
  searchWrap: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 6,
    backgroundColor: COLORS.surface,
  },
  searchInput: {
    backgroundColor: '#F5F6F8',
    borderRadius: SIZES.radiusMd,
    paddingHorizontal: 14,
    paddingVertical: 9,
    fontSize: 14,
    color: COLORS.text,
  },
  tabRow: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabBtnActive: {
    borderBottomColor: COLORS.primary,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  tabTextActive: {
    color: COLORS.primary,
    fontWeight: '700',
  },
  listContent: {
    padding: 12,
    paddingBottom: 32,
  },
  rowCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    padding: 12,
    borderRadius: SIZES.radiusMd,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 12,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FFF3E0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  groupAvatar: {
    backgroundColor: '#E3F2FD',
  },
  avatarEmoji: {
    fontSize: 22,
  },
  onlineDot: {
    position: 'absolute',
    bottom: 1,
    right: 1,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#2E7D32',
    borderWidth: 2,
    borderColor: '#FFF',
  },
  rowBody: {
    flex: 1,
  },
  rowTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  rowTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.text,
    flex: 1,
    marginRight: 8,
  },
  rowTime: {
    fontSize: 11,
    color: COLORS.textMuted,
  },
  chatActionLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.primary,
  },
  rowBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  rowPreview: {
    fontSize: 13,
    color: COLORS.textSecondary,
    flex: 1,
    marginRight: 8,
  },
  unreadPill: {
    backgroundColor: COLORS.primary,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    paddingHorizontal: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  unreadPillText: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: '800',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyBox: {
    alignItems: 'center',
    paddingTop: 60,
    paddingHorizontal: 28,
  },
  emptyEmoji: {
    fontSize: 50,
    marginBottom: 12,
  },
  emptyTitle: {
    ...FONTS.h3,
    color: COLORS.text,
    textAlign: 'center',
  },
  emptySub: {
    ...FONTS.subtitle,
    textAlign: 'center',
    marginTop: 6,
  },
  emptyCta: {
    marginTop: 18,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: SIZES.radiusMd,
  },
  emptyCtaText: {
    color: '#FFF',
    fontWeight: '700',
    fontSize: 14,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 28,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  modalTitle: {
    ...FONTS.h3,
    color: COLORS.text,
  },
  modalClose: {
    fontSize: 20,
    color: COLORS.textSecondary,
    padding: 4,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: SIZES.radiusMd,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: COLORS.text,
    marginBottom: 10,
  },
  selectLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.text,
    marginTop: 4,
    marginBottom: 8,
  },
  noMembersText: {
    fontSize: 13,
    color: COLORS.textMuted,
    textAlign: 'center',
    paddingVertical: 16,
  },
  memberPickRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: SIZES.radiusSm,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 8,
  },
  memberPickRowActive: {
    backgroundColor: '#FFF3E0',
    borderColor: COLORS.primary,
  },
  memberPickName: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.text,
  },
  memberPickSub: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  checkmark: {
    color: '#FFF',
    fontWeight: '800',
    fontSize: 13,
  },
  createGroupBtn: {
    backgroundColor: COLORS.primary,
    paddingVertical: 13,
    borderRadius: SIZES.radiusMd,
    alignItems: 'center',
  },
  createGroupBtnText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '700',
  },
});

export default ChatListScreen;
