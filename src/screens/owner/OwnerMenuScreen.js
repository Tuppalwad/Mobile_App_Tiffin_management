/**
 * Owner Menu Screen
 * Manage food items, prices, availability, and categories
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  FlatList,
  TouchableOpacity,
  Switch,
  Modal,
  ScrollView,
  ActivityIndicator,
  Image,
} from 'react-native';
import { launchCamera, launchImageLibrary } from 'react-native-image-picker';
import { CustomAlert } from "../../components/CustomAlert";
import { Card, Badge } from '../../components/Card';
import { Button } from '../../components/Button';
import { Input } from '../../components/Input';
import { KeyboardModalView } from '../../components/KeyboardModalView';
import { VegIndicator } from '../../components/VegIndicator';
import { Pencil, Trash2, UtensilsCrossed, X, Camera } from 'lucide-react-native';
import { COLORS, SIZES, FONTS } from '../../constants/theme';
import { ownerApi } from '../../api/ownerApi';

const CATEGORIES = [
  'Full Tiffin',
  'Roti Only',
  'Roti and Sabji',
  'Dal and Rice',
  'Sabji Only',
  'Rice Only',
  'Custom Tiffin',
];

export const OwnerMenuScreen = () => {
  const [menuItems, setMenuItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [editingItem, setEditingItem] = useState(null);

  // Form State
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('Full Tiffin');
  const [price, setPrice] = useState('');
  const [mealType, setMealType] = useState('lunch');
  const [servingSize, setServingSize] = useState('1 Person');
  const [imageUrl, setImageUrl] = useState('');
  const [isVeg, setIsVeg] = useState(true);

  const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // 5MB

  const resetForm = () => {
    setEditingItem(null);
    setName('');
    setDescription('');
    setCategory('Full Tiffin');
    setPrice('');
    setMealType('lunch');
    setServingSize('1 Person');
    setImageUrl('');
    setIsVeg(true);
  };

  const openCreateModal = () => {
    resetForm();
    setModalVisible(true);
  };

  const openEditModal = (item) => {
    setEditingItem(item);
    setName(item.name || '');
    setDescription(item.description || '');
    setCategory(item.category || 'Full Tiffin');
    setPrice(item.price !== undefined && item.price !== null ? String(item.price) : '');
    setMealType(item.meal_type || 'lunch');
    setServingSize(item.serving_size || '1 Person');
    setImageUrl(item.image_url || '');
    setIsVeg(item.is_veg !== false);
    setModalVisible(true);
  };

  const handlePickImage = () => {
    CustomAlert.alert('Item Photo', 'Choose an image source (Max 5MB)', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Camera', onPress: () => openImagePicker(launchCamera) },
      { text: 'Photo Gallery', onPress: () => openImagePicker(launchImageLibrary) },
    ]);
  };

  const openImagePicker = async (pickerFn) => {
    try {
      const result = await pickerFn({
        mediaType: 'photo',
        includeBase64: true,
        maxWidth: 1024,
        maxHeight: 1024,
        quality: 0.75,
        selectionLimit: 1,
      });

      if (result.didCancel || !result.assets || result.assets.length === 0) return;
      const asset = result.assets[0];

      if (asset.fileSize && asset.fileSize > MAX_IMAGE_BYTES) {
        CustomAlert.alert('Image Too Large', 'Menu item image must be 5MB or smaller.');
        return;
      }

      if (!asset.base64) {
        CustomAlert.alert('Image Error', 'Could not read image data.');
        return;
      }

      const estimatedBytes = Math.ceil((asset.base64.length * 3) / 4);
      if (estimatedBytes > MAX_IMAGE_BYTES) {
        CustomAlert.alert('Image Too Large', 'Menu item image must be 5MB or smaller.');
        return;
      }

      const mime = asset.type || 'image/jpeg';
      setImageUrl(`data:${mime};base64,${asset.base64}`);
    } catch (err) {
      CustomAlert.alert('Error', err.message || 'Failed to pick image');
    }
  };

  const fetchMenu = useCallback(async () => {
    try {
      const response = await ownerApi.getMenuItems();
      setMenuItems(response.data || []);
    } catch (err) {
      console.warn('Error fetching menu:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMenu();
  }, [fetchMenu]);

  const handleToggleAvailability = async (id) => {
    try {
      await ownerApi.toggleAvailability(id);
      setMenuItems((prev) =>
        prev.map((item) => (item.id === id ? { ...item, is_available: !item.is_available } : item))
      );
    } catch (err) {
      CustomAlert.alert('Error', err.message || 'Failed to toggle availability');
    }
  };

  const handleSaveItem = async () => {
    const parsedPrice = parseFloat(price);
    if (!name.trim() || Number.isNaN(parsedPrice) || parsedPrice <= 0) {
      CustomAlert.alert('Required Fields', 'Please enter a valid item name and price.');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        name: name.trim(),
        description: description.trim(),
        category,
        price: parsedPrice,
        meal_type: mealType,
        serving_size: servingSize,
        image_url: imageUrl || null,
        is_veg: isVeg,
      };

      if (editingItem) {
        await ownerApi.updateMenuItem(editingItem.id, payload);
      } else {
        await ownerApi.createMenuItem(payload);
      }

      setSubmitting(false);
      setModalVisible(false);
      resetForm();
      fetchMenu();
      CustomAlert.alert(
        'Success',
        editingItem ? 'Food item updated!' : 'Food item added to menu!'
      );
    } catch (err) {
      setSubmitting(false);
      CustomAlert.alert(
        'Error',
        err.message || `Failed to ${editingItem ? 'update' : 'create'} menu item`
      );
    }
  };

  const handleDeleteItem = (id, itemName) => {
    CustomAlert.alert('Confirm Delete', `Are you sure you want to delete "${itemName}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await ownerApi.deleteMenuItem(id);
            setMenuItems((prev) => prev.filter((i) => i.id !== id));
          } catch (err) {
            CustomAlert.alert('Error', err.message || 'Failed to delete item');
          }
        },
      },
    ]);
  };

  const renderMenuItem = ({ item }) => {
    return (
      <Card style={styles.itemCard}>
        <View style={styles.cardHeader}>
          {item.image_url ? (
            <Image source={{ uri: item.image_url }} style={styles.menuThumb} resizeMode="cover" />
          ) : null}
          <View style={{ flex: 1, marginRight: 8 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
              <VegIndicator isVeg={item.is_veg} showLabel={false} />
              <Text style={styles.itemName}>{item.name}</Text>
            </View>
            <Text style={styles.categoryBadge}>{item.category} • {item.meal_type?.toUpperCase()}</Text>
          </View>
          <Text style={styles.itemPrice}>₹{item.price}</Text>
        </View>

        {item.description ? (
          <Text style={styles.itemDesc} numberOfLines={2}>
            {item.description}
          </Text>
        ) : null}

        <View style={styles.cardFooter}>
          <View style={styles.availabilityRow}>
            <Text style={styles.availText}>
              {item.is_available ? 'Available Today' : 'Sold Out / Unavailable'}
            </Text>
            <Switch
              value={item.is_available}
              onValueChange={() => handleToggleAvailability(item.id)}
              trackColor={{ false: '#CCC', true: COLORS.secondaryLight }}
              thumbColor={item.is_available ? COLORS.secondary : '#FFF'}
            />
          </View>

          <View style={styles.footerActions}>
            <TouchableOpacity
              onPress={() => openEditModal(item)}
              style={[styles.editBtn, { flexDirection: 'row', alignItems: 'center', gap: 4 }]}
            >
              <Pencil size={13} color={COLORS.primary} />
              <Text style={styles.editText}>Edit</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => handleDeleteItem(item.id, item.name)}
              style={styles.deleteBtn}
            >
              <Trash2 size={18} color={COLORS.danger} />
            </TouchableOpacity>
          </View>
        </View>
      </Card>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Menu Management</Text>
          <Text style={styles.subtitle}>{menuItems.length} Food Items in Menu</Text>
        </View>
        <TouchableOpacity
          style={styles.addBtn}
          onPress={openCreateModal}
        >
          <Text style={styles.addBtnText}>+ Add Item</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : (
        <FlatList
          data={menuItems}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderMenuItem}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <UtensilsCrossed size={48} color={COLORS.textMuted} style={{ marginBottom: 12 }} />
              <Text style={styles.emptyTitle}>No Menu Items</Text>
              <Text style={styles.emptySubtitle}>
                Add your delicious homemade dishes so customers can discover and order.
              </Text>
            </View>
          }
        />
      )}

      {/* Add / Edit Item Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => {
          setModalVisible(false);
          resetForm();
        }}
      >
        <KeyboardModalView style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingItem ? 'Edit Food Item' : 'Add New Food Item'}
              </Text>
              <TouchableOpacity
                onPress={() => {
                  setModalVisible(false);
                  resetForm();
                }}
              >
                <X size={20} color={COLORS.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.modalForm}>
              <Input
                label="Item Name *"
                placeholder="e.g. Special Punjabi Thali"
                value={name}
                onChangeText={setName}
              />

              <Input
                label="Description"
                placeholder="e.g. 4 Phulkas, Dal Fry, Shahi Paneer, Jeera Rice"
                value={description}
                onChangeText={setDescription}
                multiline
                numberOfLines={3}
              />

              <Input
                label="Price (₹) *"
                placeholder="e.g. 120"
                value={price}
                onChangeText={setPrice}
                keyboardType="numeric"
              />

              {/* Single Item Image Upload (Max 5MB) */}
              <Text style={styles.label}>Item Photo (Optional, Max 5MB)</Text>
              {imageUrl ? (
                <View style={styles.imagePreviewBox}>
                  <Image source={{ uri: imageUrl }} style={styles.imagePreview} resizeMode="cover" />
                  <View style={styles.imageActionsRow}>
                    <TouchableOpacity style={styles.changeImgBtn} onPress={handlePickImage}>
                      <Text style={styles.changeImgText}>Change Photo</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.removeImgBtn} onPress={() => setImageUrl('')}>
                      <Text style={styles.removeImgText}>Remove</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ) : (
                <TouchableOpacity style={styles.uploadBox} onPress={handlePickImage}>
                  <Camera size={22} color={COLORS.primary} />
                  <Text style={styles.uploadTitle}>Upload Item Photo</Text>
                  <Text style={styles.uploadSub}>1 image allowed • Max size 5MB</Text>
                </TouchableOpacity>
              )}

              {/* Dietary Type Toggle (Veg / Non-Veg) */}
              <Text style={styles.label}>Dietary Type</Text>
              <View style={[styles.timingRow, { marginBottom: 16 }]}>
                <TouchableOpacity
                  onPress={() => setIsVeg(true)}
                  style={[
                    styles.timingBtn,
                    { flexDirection: 'row', justifyContent: 'center', gap: 6 },
                    isVeg && { backgroundColor: '#DCFCE7', borderWidth: 1, borderColor: '#16A34A' },
                  ]}
                >
                  <VegIndicator isVeg={true} showLabel={false} />
                  <Text style={[styles.timingText, isVeg && { color: '#15803D' }]}>VEG</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setIsVeg(false)}
                  style={[
                    styles.timingBtn,
                    { flexDirection: 'row', justifyContent: 'center', gap: 6 },
                    !isVeg && { backgroundColor: '#FEE2E2', borderWidth: 1, borderColor: '#DC2626' },
                  ]}
                >
                  <VegIndicator isVeg={false} showLabel={false} />
                  <Text style={[styles.timingText, !isVeg && { color: '#B91C1C' }]}>NON-VEG</Text>
                </TouchableOpacity>
              </View>

              {/* Category Picker */}
              <Text style={styles.label}>Category</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
                {CATEGORIES.map((cat) => (
                  <TouchableOpacity
                    key={cat}
                    onPress={() => setCategory(cat)}
                    style={[
                      styles.catChip,
                      category === cat && styles.activeCatChip,
                    ]}
                  >
                    <Text
                      style={[
                        styles.catChipText,
                        category === cat && styles.activeCatText,
                      ]}
                    >
                      {cat}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {/* Meal Type Picker */}
              <Text style={styles.label}>Meal Timing</Text>
              <View style={styles.timingRow}>
                {['breakfast', 'lunch', 'dinner'].map((timing) => (
                  <TouchableOpacity
                    key={timing}
                    onPress={() => setMealType(timing)}
                    style={[
                      styles.timingBtn,
                      mealType === timing && styles.activeTimingBtn,
                    ]}
                  >
                    <Text
                      style={[
                        styles.timingText,
                        mealType === timing && styles.activeTimingText,
                      ]}
                    >
                      {timing.toUpperCase()}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Button
                title={editingItem ? 'Update Food Item' : 'Save Food Item'}
                onPress={handleSaveItem}
                loading={submitting}
                style={{ marginTop: 20 }}
              />
            </ScrollView>
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
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  title: {
    ...FONTS.h2,
    color: COLORS.text,
  },
  subtitle: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  addBtn: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: SIZES.radiusMd,
  },
  addBtnText: {
    color: '#FFF',
    fontWeight: '700',
    fontSize: 14,
  },
  listContent: {
    padding: 16,
    paddingBottom: 32,
  },
  itemCard: {
    marginBottom: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  itemName: {
    ...FONTS.h3,
    color: COLORS.text,
  },
  categoryBadge: {
    fontSize: 12,
    color: COLORS.primary,
    fontWeight: '600',
    marginTop: 2,
  },
  itemPrice: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.text,
  },
  itemDesc: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 6,
    lineHeight: 18,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 14,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: COLORS.divider,
  },
  availabilityRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  availText: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginRight: 8,
  },
  footerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  editBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginRight: 6,
    borderRadius: SIZES.radiusSm,
    backgroundColor: '#FFF5EB',
  },
  editText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.primary,
  },
  deleteBtn: {
    padding: 6,
  },
  deleteText: {
    fontSize: 18,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingTop: 60,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyTitle: {
    ...FONTS.h3,
    color: COLORS.text,
  },
  emptySubtitle: {
    ...FONTS.subtitle,
    marginTop: 4,
    textAlign: 'center',
    paddingHorizontal: 24,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: SIZES.radiusLg,
    borderTopRightRadius: SIZES.radiusLg,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  modalTitle: {
    ...FONTS.h3,
  },
  closeBtn: {
    fontSize: 20,
    color: COLORS.textSecondary,
    padding: 4,
  },
  modalForm: {
    padding: 20,
    paddingBottom: 40,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 8,
  },
  catChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: SIZES.radiusFull,
    backgroundColor: COLORS.chipBg,
    marginRight: 8,
  },
  activeCatChip: {
    backgroundColor: COLORS.primary,
  },
  catChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  activeCatText: {
    color: '#FFF',
  },
  timingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  timingBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: SIZES.radiusSm,
    backgroundColor: COLORS.chipBg,
    marginHorizontal: 4,
  },
  activeTimingBtn: {
    backgroundColor: COLORS.primary,
  },
  timingText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textSecondary,
  },
  activeTimingText: {
    color: '#FFF',
  },
  menuThumb: {
    width: 56,
    height: 56,
    borderRadius: SIZES.radiusSm,
    marginRight: 12,
    backgroundColor: COLORS.chipBg,
  },
  uploadBox: {
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: COLORS.primary,
    borderRadius: SIZES.radiusMd,
    backgroundColor: '#FFF8F2',
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    gap: 4,
  },
  uploadTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.primary,
    marginTop: 2,
  },
  uploadSub: {
    fontSize: 11,
    color: COLORS.textSecondary,
  },
  imagePreviewBox: {
    marginBottom: 16,
    borderRadius: SIZES.radiusMd,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  imagePreview: {
    width: '100%',
    height: 160,
    backgroundColor: COLORS.chipBg,
  },
  imageActionsRow: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  changeImgBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRightWidth: 1,
    borderRightColor: COLORS.border,
  },
  changeImgText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.primary,
  },
  removeImgBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
  },
  removeImgText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.danger,
  },
});

export default OwnerMenuScreen;

