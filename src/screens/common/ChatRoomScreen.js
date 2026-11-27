/**
 * WhatsApp-Style Real-Time Chat Room Screen
 * Supports:
 * - Bidirectional WebSocket messaging (text & images)
 * - Quoted replies to specific messages
 * - Edit & soft-delete own messages
 * - Date separators + per-message timestamps
 * - Real-time "typing..." indicators & online status
 * - Owner-only "Add Members" in group chats
 */

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  FlatList,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Keyboard,
  Platform,
  Image,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { CustomAlert } from "../../components/CustomAlert";
import { useSelector } from 'react-redux';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { launchImageLibrary, launchCamera } from 'react-native-image-picker';
import { KeyboardModalView } from '../../components/KeyboardModalView';
import {
  ArrowLeft,
  Users,
  Camera,
  Send,
  Check,
  X,
  Pencil,
  Trash2,
  Ban,
  MessageCircle,
  User,
  Crown,
} from 'lucide-react-native';
import { COLORS, SIZES, FONTS } from '../../constants/theme';
import { chatApi } from '../../api/chatApi';
import { chatSocketService } from '../../services/chatSocketService';
import { useNotificationAutoRefresh } from '../../services/notificationEvents';

const formatMessageTime = (isoStr) => {
  if (!isoStr) return '';
  const d = new Date(isoStr);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

const formatDateBanner = (isoStr) => {
  if (!isoStr) return '';
  const d = new Date(isoStr);
  if (Number.isNaN(d.getTime())) return '';
  const now = new Date();
  if (d.toDateString() === now.toDateString()) return 'Today';
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return d.toLocaleDateString([], { day: '2-digit', month: 'short', year: 'numeric' });
};

export const ChatRoomScreen = ({ route, navigation }) => {
  const { conversationId, title, type = 'direct', peer: initialPeer, participants: initialParticipants = [] } =
    route.params || {};
  const { user } = useSelector((state) => state.auth);
  const isOwner = user?.role === 'owner';
  const isGroup = type === 'group';

  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [inputText, setInputText] = useState('');
  const [peerOnline, setPeerOnline] = useState(Boolean(initialPeer?.isOnline));
  const [typingUsers, setTypingUsers] = useState({}); // { userId: userName }
  const inputRef = useRef(null);
  // Reply / Edit / Message Action Menu state
  const [replyTarget, setReplyTarget] = useState(null);
  const [editingMessage, setEditingMessage] = useState(null);
  const [actionMessage, setActionMessage] = useState(null);

  // Image preview / zoom state
  const [pendingImage, setPendingImage] = useState(null); // { uri, base64, mimeType }
  const [imageCaption, setImageCaption] = useState('');
  const [zoomImageUrl, setZoomImageUrl] = useState(null);

  // Group Info / Add Members (Owner only)
  const [groupInfoVisible, setGroupInfoVisible] = useState(false);
  const [participants, setParticipants] = useState(initialParticipants);
  const [eligibleContacts, setEligibleContacts] = useState([]);
  const [selectedNewIds, setSelectedNewIds] = useState([]);
  const [addingMembers, setAddingMembers] = useState(false);

  const insets = useSafeAreaInsets();
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const flatListRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const isTypingSentRef = useRef(false);
  const keyboardVisible = keyboardHeight > 0;
  const loadMessages = useCallback(async (silent = false) => {
    try {
      const res = await chatApi.getMessages(conversationId, { page: 1, pageSize: 80 });
      setMessages(res?.data?.items || []);
      if (res?.data?.peerOnline !== undefined && !chatSocketService.isConnected()) {
        setPeerOnline(Boolean(res.data.peerOnline));
      }
      if (Array.isArray(res?.data?.typingUsers)) {
        const nextTyping = {};
        res.data.typingUsers.forEach((u) => {
          if (u.userId !== user?.id) nextTyping[u.userId] = u.userName || 'Someone';
        });
        setTypingUsers((prev) => (chatSocketService.isConnected() ? prev : nextTyping));
      }
      await chatApi.markAsRead(conversationId).catch(() => null);
      chatSocketService.markRead(conversationId);
    } catch (err) {
      if (!silent) {
        CustomAlert.alert('Error', err.message || 'Could not load messages');
      }
    } finally {
      setLoading(false);
    }
  }, [conversationId, user?.id]);

  // Real-time refresh when FCM chat notification arrives
  useNotificationAutoRefresh(['chat', 'NEW_CHAT_MESSAGE'], () => loadMessages(true));

  // Track keyboard height and auto-scroll when keyboard opens
  useEffect(() => {
    const showSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      (e) => {
        setKeyboardHeight(e?.endCoordinates?.height || 0);
        setTimeout(() => {
          flatListRef.current?.scrollToEnd({ animated: true });
        }, 120);
      }
    );
    const hideSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => {
        setKeyboardHeight(0);
      }
    );
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  // Gateway fallback polling when WebSocket is not connected (e.g. Vercel serverless mode)
  useEffect(() => {
    const interval = setInterval(() => {
      if (!chatSocketService.isConnected()) {
        loadMessages(true);
      }
    }, 3500);
    return () => clearInterval(interval);
  }, [loadMessages]);

  useEffect(() => {
    chatSocketService.setActiveConversation(conversationId);
    loadMessages();

    let unsubNew = () => {};
    let unsubUpdated = () => {};
    let unsubDeleted = () => {};
    let unsubTyping = () => {};
    let unsubPresence = () => {};

    const attachSocket = async () => {
      await chatSocketService.connect();
      await chatSocketService.joinConversation(conversationId);

      unsubNew = chatSocketService.on('message:new', (msg) => {
        if (Number(msg.conversationId) !== Number(conversationId)) return;
        setMessages((prev) => (prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]));
        if (msg.senderId !== user?.id) {
          chatSocketService.markRead(conversationId);
          chatApi.markAsRead(conversationId).catch(() => null);
        }
      });

      unsubUpdated = chatSocketService.on('message:updated', (msg) => {
        if (Number(msg.conversationId) !== Number(conversationId)) return;
        setMessages((prev) => prev.map((m) => (m.id === msg.id ? msg : m)));
      });

      unsubDeleted = chatSocketService.on('message:deleted', (msg) => {
        if (Number(msg.conversationId) !== Number(conversationId)) return;
        setMessages((prev) => prev.map((m) => (m.id === msg.id ? msg : m)));
      });

      unsubTyping = chatSocketService.on(
        'typing:update',
        ({ conversationId: cId, userId, userName, isTyping }) => {
          if (Number(cId) !== Number(conversationId) || userId === user?.id) return;
          setTypingUsers((prev) => {
            const next = { ...prev };
            if (isTyping) {
              next[userId] = userName || 'Someone';
            } else {
              delete next[userId];
            }
            return next;
          });
        }
      );

      unsubPresence = chatSocketService.on('presence:update', ({ userId, isOnline }) => {
        if (!isGroup && initialPeer?.id === userId) {
          setPeerOnline(isOnline);
        }
      });
    };

    attachSocket();

    return () => {
      if (isTypingSentRef.current) {
        chatSocketService.stopTyping(conversationId);
      }
      clearTimeout(typingTimeoutRef.current);
      chatSocketService.leaveConversation(conversationId);
      chatSocketService.setActiveConversation(null);
      unsubNew();
      unsubUpdated();
      unsubDeleted();
      unsubTyping();
      unsubPresence();
    };
  }, [conversationId, isGroup, initialPeer?.id, user?.id, loadMessages]);

  // Inject date separator entries cleanly for rendering
  const timelineItems = useMemo(() => {
    const out = [];
    let lastDateKey = null;
    for (const msg of messages) {
      const dKey = msg.createdAt ? new Date(msg.createdAt).toDateString() : 'unknown';
      if (dKey !== lastDateKey) {
        out.push({
          _isDateHeader: true,
          id: `date-${dKey}`,
          label: formatDateBanner(msg.createdAt),
        });
        lastDateKey = dKey;
      }
      out.push(msg);
    }
    return out;
  }, [messages]);

  const handleTextChange = (text) => {
    setInputText(text);
    if (!editingMessage && text.trim().length > 0) {
      if (!isTypingSentRef.current) {
        if (chatSocketService.isConnected()) {
          chatSocketService.startTyping(conversationId);
        } else {
          chatApi.sendTyping(conversationId, true).catch(() => null);
        }
        isTypingSentRef.current = true;
      }
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {
        if (chatSocketService.isConnected()) {
          chatSocketService.stopTyping(conversationId);
        } else {
          chatApi.sendTyping(conversationId, false).catch(() => null);
        }
        isTypingSentRef.current = false;
      }, 1800);
    } else if (isTypingSentRef.current) {
      if (chatSocketService.isConnected()) {
        chatSocketService.stopTyping(conversationId);
      } else {
        chatApi.sendTyping(conversationId, false).catch(() => null);
      }
      isTypingSentRef.current = false;
    }
  };

  const handleSendOrSaveEdit = async () => {
    const trimmed = inputText.trim();
    if (!trimmed || sending) return;

    if (isTypingSentRef.current) {
      clearTimeout(typingTimeoutRef.current);
      chatSocketService.stopTyping(conversationId);
      isTypingSentRef.current = false;
    }

    setSending(true);
    try {
      if (editingMessage) {
        let updated = null;
        try {
          updated = await chatSocketService.editMessage(editingMessage.id, trimmed);
        } catch (_) {
          const res = await chatApi.editMessage(editingMessage.id, trimmed);
          updated = res?.data;
        }
        if (updated) {
          setMessages((prev) => prev.map((m) => (m.id === updated.id ? updated : m)));
        }
        setEditingMessage(null);
        setInputText('');
      } else {
        const payload = {
          conversationId,
          messageType: 'text',
          content: trimmed,
          replyToId: replyTarget?.id || null,
        };
        let sentMsg = null;
        try {
          sentMsg = await chatSocketService.sendMessage(payload);
        } catch (_) {
          const res = await chatApi.sendMessage(conversationId, payload);
          sentMsg = res?.data;
        }
        if (sentMsg) {
          setMessages((prev) => (prev.some((m) => m.id === sentMsg.id) ? prev : [...prev, sentMsg]));
        }
        setInputText('');
        setReplyTarget(null);
      }
    } catch (err) {
      CustomAlert.alert('Error', err.message || 'Could not send message');
    } finally {
      setSending(false);
    }
  };

  const handlePickImage = () => {
    CustomAlert.alert('Share Photo', 'Choose an image source', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Camera',
        onPress: () => openPicker(launchCamera),
      },
      {
        text: 'Photo Gallery',
        onPress: () => openPicker(launchImageLibrary),
      },
    ]);
  };

  const openPicker = async (pickerFn) => {
    try {
      const result = await pickerFn({
        mediaType: 'photo',
        includeBase64: true,
        maxWidth: 1024,
        maxHeight: 1024,
        quality: 0.7,
      });

      if (result.didCancel || !result.assets || result.assets.length === 0) return;
      const asset = result.assets[0];
      if (!asset.base64) {
        CustomAlert.alert('Image Error', 'Could not read image data.');
        return;
      }

      setPendingImage({
        uri: asset.uri,
        base64: asset.base64,
        mimeType: asset.type || 'image/jpeg',
      });
      setImageCaption('');
    } catch (err) {
      CustomAlert.alert('Error', err.message || 'Failed to pick image');
    }
  };

  const handleSendImage = async () => {
    if (!pendingImage || sending) return;
    setSending(true);
    try {
      const uploadRes = await chatApi.uploadImage(pendingImage.base64, pendingImage.mimeType);
      const mediaUrl = uploadRes?.data?.mediaUrl;

      const payload = {
        conversationId,
        messageType: 'image',
        content: imageCaption.trim(),
        mediaUrl,
        replyToId: replyTarget?.id || null,
      };

      let sentMsg = null;
      try {
        sentMsg = await chatSocketService.sendMessage(payload);
      } catch (_) {
        const res = await chatApi.sendMessage(conversationId, payload);
        sentMsg = res?.data;
      }

      if (sentMsg) {
        setMessages((prev) => (prev.some((m) => m.id === sentMsg.id) ? prev : [...prev, sentMsg]));
      }
      setPendingImage(null);
      setImageCaption('');
      setReplyTarget(null);
    } catch (err) {
      CustomAlert.alert('Upload Failed', err.message || 'Could not send image');
    } finally {
      setSending(false);
    }
  };

  const handleDeleteMessage = (msg) => {
    setActionMessage(null);
    CustomAlert.alert('Delete Message', 'Delete this message for everyone?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            let deletedMsg = null;
            try {
              deletedMsg = await chatSocketService.deleteMessage(msg.id);
            } catch (_) {
              const res = await chatApi.deleteMessage(msg.id);
              deletedMsg = res?.data;
            }
            if (deletedMsg) {
              setMessages((prev) => prev.map((m) => (m.id === deletedMsg.id ? deletedMsg : m)));
            }
          } catch (err) {
            CustomAlert.alert('Error', err.message || 'Could not delete message');
          }
        },
      },
    ]);
  };

  const openGroupInfoModal = async () => {
    setGroupInfoVisible(true);
    try {
      const [convRes, contactsRes] = await Promise.all([
        chatApi.getConversations(),
        isOwner ? chatApi.getContacts() : Promise.resolve({ data: [] }),
      ]);
      const currentConv = (convRes?.data || []).find((c) => c.id === conversationId);
      const currentMembers = currentConv?.participants || participants;
      setParticipants(currentMembers);
      const memberSet = new Set(currentMembers.map((p) => p.userId || p.id));
      setEligibleContacts((contactsRes?.data || []).filter((c) => !memberSet.has(c.id)));
      setSelectedNewIds([]);
    } catch (_) {
      // Ignore refresh error
    }
  };

  const handleAddGroupMembers = async () => {
    if (selectedNewIds.length === 0) return;
    setAddingMembers(true);
    try {
      await chatApi.addGroupMembers(conversationId, selectedNewIds);
      setAddingMembers(false);
      setGroupInfoVisible(false);
      loadMessages();
      CustomAlert.alert('Added', 'New members added to the group.');
    } catch (err) {
      setAddingMembers(false);
      CustomAlert.alert('Error', err.message || 'Failed to add members');
    }
  };

  const typingNames = Object.values(typingUsers);
  const subtitleText =
    typingNames.length > 0
      ? isGroup
        ? `${typingNames[0]} is typing...`
        : 'typing...'
      : isGroup
      ? `${participants.length || 0} members`
      : peerOnline
      ? 'Online'
      : 'Offline';

  const renderMessage = ({ item }) => {
    if (item._isDateHeader) {
      return (
        <View style={styles.datePillWrap}>
          <View style={styles.datePill}>
            <Text style={styles.datePillText}>{item.label}</Text>
          </View>
        </View>
      );
    }

    if (item.messageType === 'system') {
      return (
        <View style={styles.systemPillWrap}>
          <View style={styles.systemPill}>
            <Text style={styles.systemPillText}>{item.content}</Text>
          </View>
        </View>
      );
    }

    const isMine = item.senderId === user?.id;

    return (
      <TouchableOpacity
        activeOpacity={0.9}
        onLongPress={() => {
          if (!item.isDeleted) {
            setActionMessage(item);
          }
        }}
        style={[styles.msgRow, isMine ? styles.msgRowMine : styles.msgRowOther]}
      >
        <View style={[styles.bubble, isMine ? styles.bubbleMine : styles.bubbleOther]}>
          {/* Sender Name in Group Chats */}
          {isGroup && !isMine && (
            <Text style={styles.senderNameText}>
              {item.sender?.displayName || item.sender?.name || 'Member'}
            </Text>
          )}

          {/* Quoted Reply Block */}
          {item.replyTo && (
            <View style={[styles.replyQuoteBox, isMine && styles.replyQuoteBoxMine]}>
              <Text style={styles.replyQuoteAuthor} numberOfLines={1}>
                {item.replyTo.senderName}
              </Text>
              <Text style={styles.replyQuoteText} numberOfLines={2}>
                {item.replyTo.content}
              </Text>
            </View>
          )}

          {/* Media Image */}
          {!item.isDeleted && item.messageType === 'image' && item.mediaUrl && (
            <TouchableOpacity onPress={() => setZoomImageUrl(item.mediaUrl)}>
              <Image source={{ uri: item.mediaUrl }} style={styles.chatImage} resizeMode="cover" />
            </TouchableOpacity>
          )}

          {/* Text Content */}
          {item.isDeleted ? (
            <Text style={styles.deletedText}>🚫 This message was deleted</Text>
          ) : item.content ? (
            <Text style={[styles.msgText, isMine && styles.msgTextMine]}>{item.content}</Text>
          ) : null}

          {/* Time & Edited Stamp */}
          <View style={styles.metaFooter}>
            {item.isEdited && !item.isDeleted && (
              <Text style={[styles.editedLabel, isMine && styles.metaMine]}>edited </Text>
            )}
            <Text style={[styles.timeText, isMine && styles.metaMine]}>
              {formatMessageTime(item.createdAt)}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
        {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <ArrowLeft size={22} color={COLORS.text} />
        </TouchableOpacity>

        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {title || 'Chat'}
          </Text>
          <Text
            style={[
              styles.headerSub,
              typingNames.length > 0 && { color: COLORS.secondary, fontWeight: '700' },
            ]}
          >
            {subtitleText}
          </Text>
        </View>

        {isGroup && (
          <TouchableOpacity style={[styles.groupInfoBtn, { flexDirection: 'row', alignItems: 'center', gap: 5 }]} onPress={openGroupInfoModal}>
            <Users size={14} color={COLORS.primary} />
            <Text style={styles.groupInfoBtnText}>{isOwner ? '+ Add' : 'Info'}</Text>
          </TouchableOpacity>
        )}
      </View>

      <View
        style={[
          styles.flex,
          keyboardHeight > 0 && {
            paddingBottom: Math.max(0, keyboardHeight - insets.bottom),
          },
        ]}
      >
        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={COLORS.primary} />
          </View>
        ) : (
          <FlatList
            ref={flatListRef}
            data={timelineItems}
            keyExtractor={(item) => item.id.toString()}
            renderItem={renderMessage}
            contentContainerStyle={styles.messagesList}
            onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
            ListEmptyComponent={
              <View style={styles.emptyChat}>
                <MessageCircle size={44} color={COLORS.textMuted} style={{ marginBottom: 10 }} />
                <Text style={styles.emptyChatText}>
                  Say hi! Messages are end-to-end synced in real time.
                </Text>
              </View>
            }
          />
        )}

        {/* Live Typing Pill above Input */}
        {typingNames.length > 0 && (
          <View style={styles.typingBar}>
            <Text style={styles.typingBarText}>
              {isGroup ? `${typingNames.join(', ')} typing...` : `${title || 'User'} is typing...`}
            </Text>
          </View>
        )}

        {/* Reply / Edit Banner */}
        {(replyTarget || editingMessage) && (
          <View style={styles.contextBanner}>
            <View style={{ flex: 1 }}>
              <Text style={styles.contextTitle}>
                {editingMessage
                  ? '✏️ Editing message'
                  : `↩️ Replying to ${replyTarget.sender?.displayName || replyTarget.sender?.name || 'User'}`}
              </Text>
              <Text style={styles.contextPreview} numberOfLines={1}>
                {editingMessage
                  ? editingMessage.content
                  : replyTarget.messageType === 'image'
                  ? '📷 Photo'
                  : replyTarget.content}
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => {
                setReplyTarget(null);
                setEditingMessage(null);
                if (editingMessage) setInputText('');
              }}
            >
              <X size={16} color={COLORS.textSecondary} />
            </TouchableOpacity>
          </View>
        )}

        {/* Message Input Bar */}
        <View style={[styles.inputBar, Platform.OS !== 'ios' && keyboardVisible && { paddingBottom: 38 }]}>
          {!editingMessage && (
            <TouchableOpacity style={styles.attachBtn} onPress={handlePickImage}>
              <Camera size={22} color={COLORS.textSecondary} />
            </TouchableOpacity>
          )}

          <TextInput
            ref={inputRef}
            style={styles.textInput}
            placeholder={editingMessage ? 'Edit message...' : 'Type a message...'}
            placeholderTextColor={COLORS.textMuted}
            value={inputText}
            onChangeText={handleTextChange}
            multiline
            maxLength={2000}
          />

          <TouchableOpacity
            style={[styles.sendBtn, (!inputText.trim() || sending) && styles.sendBtnDisabled]}
            onPress={handleSendOrSaveEdit}
            disabled={!inputText.trim() || sending}
          >
            {sending ? (
              <ActivityIndicator size="small" color="#FFF" />
            ) : editingMessage ? (
              <Check size={18} color="#FFF" />
            ) : (
              <Send size={18} color="#FFF" />
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* Long-Press Message Action Sheet Modal */}
      <Modal
        visible={Boolean(actionMessage)}
        transparent
        animationType="fade"
        onRequestClose={() => setActionMessage(null)}
      >
        <TouchableOpacity
          style={styles.sheetBackdrop}
          activeOpacity={1}
          onPress={() => setActionMessage(null)}
        >
          <View style={styles.sheetCard}>
            <Text style={styles.sheetTitle}>Message Options</Text>

            <TouchableOpacity
              style={styles.sheetItem}
              onPress={() => {
                setReplyTarget(actionMessage);
                setEditingMessage(null);
                setActionMessage(null);
              }}
            >
              <Text style={styles.sheetItemText}>↩️ Reply to this message</Text>
            </TouchableOpacity>

            {actionMessage?.senderId === user?.id && actionMessage?.messageType === 'text' && (
              <TouchableOpacity
                style={styles.sheetItem}
                onPress={() => {
                  setEditingMessage(actionMessage);
                  setReplyTarget(null);
                  setInputText(actionMessage.content || '');
                  setActionMessage(null);
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Pencil size={16} color={COLORS.text} />
                  <Text style={styles.sheetItemText}>Edit message</Text>
                </View>
              </TouchableOpacity>
            )}

            {actionMessage?.senderId === user?.id && (
              <TouchableOpacity
                style={styles.sheetItem}
                onPress={() => handleDeleteMessage(actionMessage)}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Trash2 size={16} color={COLORS.danger} />
                  <Text style={[styles.sheetItemText, { color: COLORS.danger }]}>
                    Delete message
                  </Text>
                </View>
              </TouchableOpacity>
            )}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Pending Image Preview Modal */}
      <Modal
        visible={Boolean(pendingImage)}
        transparent
        animationType="slide"
        onRequestClose={() => !sending && setPendingImage(null)}
      >
        <SafeAreaView style={styles.imagePreviewModal}>
          <View style={styles.imagePreviewHeader}>
            <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }} onPress={() => setPendingImage(null)}>
              <X size={16} color="#FFF" />
              <Text style={styles.previewCloseText}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.previewTitle}>Send Image</Text>
            <View style={{ width: 60 }} />
          </View>

          {pendingImage && (
            <Image
              source={{ uri: pendingImage.uri }}
              style={styles.previewImageFull}
              resizeMode="contain"
            />
          )}

          <KeyboardModalView>
            <View style={styles.previewFooter}>
              <TextInput
                style={styles.captionInput}
                placeholder="Add a caption (optional)..."
                placeholderTextColor="#BDBDBD"
                value={imageCaption}
                onChangeText={setImageCaption}
              />
              <TouchableOpacity
                style={styles.sendBtn}
                onPress={handleSendImage}
                disabled={sending}
              >
                {sending ? (
                  <ActivityIndicator size="small" color="#FFF" />
                ) : (
                  <Send size={18} color="#FFF" />
                )}
              </TouchableOpacity>
            </View>
          </KeyboardModalView>
        </SafeAreaView>
      </Modal>

      {/* Fullscreen Image Viewer Modal */}
      <Modal
        visible={Boolean(zoomImageUrl)}
        transparent
        animationType="fade"
        onRequestClose={() => setZoomImageUrl(null)}
      >
        <SafeAreaView style={styles.imagePreviewModal}>
          <TouchableOpacity
            style={[styles.zoomCloseBtn, { flexDirection: 'row', alignItems: 'center', gap: 4 }]}
            onPress={() => setZoomImageUrl(null)}
          >
            <X size={16} color="#FFF" />
            <Text style={styles.previewCloseText}>Close</Text>
          </TouchableOpacity>
          {zoomImageUrl && (
            <Image source={{ uri: zoomImageUrl }} style={styles.previewImageFull} resizeMode="contain" />
          )}
        </SafeAreaView>
      </Modal>

      {/* Group Members & Add Members (Owner Only) Modal */}
      <Modal
        visible={groupInfoVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setGroupInfoVisible(false)}
      >
        <View style={styles.sheetBackdrop}>
          <View style={styles.groupModalCard}>
            <View style={styles.groupModalHeader}>
              <Text style={styles.sheetTitle}>{title} • Members ({participants.length})</Text>
              <TouchableOpacity onPress={() => setGroupInfoVisible(false)}>
                <X size={20} color={COLORS.textSecondary} />
              </TouchableOpacity>
            </View>

            <FlatList
              data={participants}
              keyExtractor={(p, idx) => String(p.userId || p.id || idx)}
              style={{ maxHeight: 160, marginBottom: 12 }}
              renderItem={({ item }) => (
                <View style={styles.memberRow}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <User size={14} color={COLORS.textSecondary} />
                    <Text style={styles.memberRowName}>
                      {item.displayName || item.name}
                    </Text>
                    {item.role === 'admin' && <Crown size={14} color={COLORS.warning} />}
                  </View>
                  <Text style={styles.memberRowSub}>{item.phone}</Text>
                </View>
              )}
            />

            {isOwner && eligibleContacts.length > 0 && (
              <View>
                <Text style={styles.addMemberHeading}>Add Delivered Customers</Text>
                <FlatList
                  data={eligibleContacts}
                  keyExtractor={(c) => String(c.id)}
                  style={{ maxHeight: 150, marginBottom: 12 }}
                  renderItem={({ item }) => {
                    const checked = selectedNewIds.includes(item.id);
                    return (
                      <TouchableOpacity
                        style={[styles.addMemberRow, checked && styles.addMemberRowActive]}
                        onPress={() =>
                          setSelectedNewIds((prev) =>
                            prev.includes(item.id)
                              ? prev.filter((id) => id !== item.id)
                              : [...prev, item.id]
                          )
                        }
                      >
                        <Text style={{ flex: 1, color: COLORS.text, fontWeight: '600' }}>
                          {item.displayName} ({item.phone})
                        </Text>
                        <Text style={{ color: COLORS.primary, fontWeight: '800' }}>
                          {checked ? '✓ Added' : '+ Select'}
                        </Text>
                      </TouchableOpacity>
                    );
                  }}
                />
                <TouchableOpacity
                  style={[
                    styles.addMemberBtn,
                    (selectedNewIds.length === 0 || addingMembers) && { opacity: 0.6 },
                  ]}
                  onPress={handleAddGroupMembers}
                  disabled={selectedNewIds.length === 0 || addingMembers}
                >
                  <Text style={styles.addMemberBtnText}>
                    {addingMembers ? 'Adding...' : `Add (${selectedNewIds.length}) to Group`}
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#ECE5DD',
  },
  flex: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  backBtn: {
    paddingRight: 12,
  },
  backArrow: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.text,
  },
  headerTitle: {
    ...FONTS.h3,
    color: COLORS.text,
  },
  headerSub: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 1,
  },
  groupInfoBtn: {
    backgroundColor: '#FFF3E0',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: SIZES.radiusSm,
  },
  groupInfoBtnText: {
    color: COLORS.primary,
    fontWeight: '700',
    fontSize: 12,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  messagesList: {
    paddingHorizontal: 12,
    paddingVertical: 14,
  },
  emptyChat: {
    alignItems: 'center',
    paddingTop: 80,
  },
  emptyChatEmoji: {
    fontSize: 42,
    marginBottom: 8,
  },
  emptyChatText: {
    color: COLORS.textSecondary,
    fontSize: 13,
    textAlign: 'center',
    paddingHorizontal: 28,
  },
  datePillWrap: {
    alignItems: 'center',
    marginVertical: 10,
  },
  datePill: {
    backgroundColor: '#D9E5EC',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  datePillText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#455A64',
  },
  systemPillWrap: {
    alignItems: 'center',
    marginVertical: 6,
  },
  systemPill: {
    backgroundColor: '#FFF8E1',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 10,
  },
  systemPillText: {
    fontSize: 11,
    color: '#795548',
    fontStyle: 'italic',
  },
  msgRow: {
    marginVertical: 3,
    flexDirection: 'row',
  },
  msgRowMine: {
    justifyContent: 'flex-end',
  },
  msgRowOther: {
    justifyContent: 'flex-start',
  },
  bubble: {
    maxWidth: '78%',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 8,
    elevation: 1,
  },
  bubbleMine: {
    backgroundColor: COLORS.primary,
    borderBottomRightRadius: 4,
  },
  bubbleOther: {
    backgroundColor: '#FFFFFF',
    borderBottomLeftRadius: 4,
  },
  senderNameText: {
    fontSize: 11,
    fontWeight: '800',
    color: COLORS.primary,
    marginBottom: 3,
  },
  replyQuoteBox: {
    backgroundColor: 'rgba(0,0,0,0.06)',
    borderLeftWidth: 3,
    borderLeftColor: COLORS.primary,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginBottom: 6,
  },
  replyQuoteBoxMine: {
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderLeftColor: '#FFFFFF',
  },
  replyQuoteAuthor: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.text,
  },
  replyQuoteText: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  chatImage: {
    width: 210,
    height: 180,
    borderRadius: 10,
    marginBottom: 5,
    backgroundColor: '#EEE',
  },
  msgText: {
    fontSize: 15,
    color: COLORS.text,
    lineHeight: 20,
  },
  msgTextMine: {
    color: '#FFFFFF',
  },
  deletedText: {
    fontSize: 13,
    fontStyle: 'italic',
    color: '#9E9E9E',
  },
  metaFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginTop: 4,
  },
  editedLabel: {
    fontSize: 10,
    fontStyle: 'italic',
    color: COLORS.textMuted,
  },
  timeText: {
    fontSize: 10,
    color: COLORS.textMuted,
  },
  metaMine: {
    color: 'rgba(255,255,255,0.8)',
  },
  typingBar: {
    paddingHorizontal: 16,
    paddingVertical: 4,
    backgroundColor: '#ECE5DD',
  },
  typingBarText: {
    fontSize: 12,
    color: COLORS.secondary,
    fontWeight: '700',
    fontStyle: 'italic',
  },
  contextBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF3E0',
    borderTopWidth: 1,
    borderTopColor: '#FFE0B2',
    borderLeftWidth: 4,
    borderLeftColor: COLORS.primary,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  contextTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.primary,
  },
  contextPreview: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 1,
  },
  contextClose: {
    fontSize: 18,
    color: COLORS.textSecondary,
    paddingLeft: 12,
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: COLORS.surface,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  attachBtn: {
    paddingHorizontal: 8,
    paddingVertical: 8,
  },
  textInput: {
    flex: 1,
    backgroundColor: '#F5F6F8',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 9,
    fontSize: 15,
    color: COLORS.text,
    maxHeight: 130,
    marginHorizontal: 6,
    // marginBottom: 24,

  },
  sendBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: {
    backgroundColor: '#CCC',
  },
  sendBtnText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '800',
  },
  sheetBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  sheetCard: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    padding: 20,
    paddingBottom: 28,
  },
  sheetTitle: {
    ...FONTS.h3,
    color: COLORS.text,
    marginBottom: 12,
  },
  sheetItem: {
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.divider,
  },
  sheetItemText: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text,
  },
  imagePreviewModal: {
    flex: 1,
    backgroundColor: '#000',
  },
  imagePreviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  previewCloseText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
  },
  previewTitle: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
  },
  previewImageFull: {
    flex: 1,
    width: '100%',
  },
  previewFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#111',
  },
  captionInput: {
    // flex: 1,
    backgroundColor: '#222',
    color: '#FFF',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginRight: 10,
  },
  zoomCloseBtn: {
    padding: 16,
    alignItems: 'flex-end',
  },
  groupModalCard: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 28,
  },
  groupModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  memberRow: {
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.divider,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  memberRowName: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
  },
  memberRowSub: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  addMemberHeading: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.primary,
    marginBottom: 8,
  },
  addMemberRow: {
    flexDirection: 'row',
    paddingVertical: 9,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 6,
  },
  addMemberRowActive: {
    backgroundColor: '#FFF3E0',
    borderColor: COLORS.primary,
  },
  addMemberBtn: {
    backgroundColor: COLORS.primary,
    paddingVertical: 12,
    borderRadius: SIZES.radiusMd,
    alignItems: 'center',
  },
  addMemberBtnText: {
    color: '#FFF',
    fontWeight: '700',
    fontSize: 14,
  },
});

export default ChatRoomScreen;
