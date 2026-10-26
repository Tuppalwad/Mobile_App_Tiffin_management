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
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Card, Badge } from '../../components/Card';
import { Button } from '../../components/Button';
import { Input } from '../../components/Input';
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

  // Form State
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('Full Tiffin');
  const [price, setPrice] = useState('');
  const [mealType, setMealType] = useState('lunch');
  const [servingSize, setServingSize] = useState('1 Person');

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
      Alert.alert('Error', err.message || 'Failed to toggle availability');
    }
  };

  const handleCreateItem = async () => {
    if (!name.trim() || !price) {
      Alert.alert('Required Fields', 'Please enter item name and price.');
      return;
    }

    setSubmitting(true);
    try {
      await ownerApi.createMenuItem({
        name: name.trim(),
        description: description.trim(),
        category,
        price: parseFloat(price),
        meal_type: mealType,
        serving_size: servingSize,
      });

      setSubmitting(false);
      setModalVisible(false);
      // Reset form
      setName('');
      setDescription('');
      setPrice('');
      fetchMenu();
      Alert.alert('Success', 'Food item added to menu!');
    } catch (err) {
      setSubmitting(false);
      Alert.alert('Error', err.message || 'Failed to create menu item');
    }
  };

  const handleDeleteItem = (id, itemName) => {
    Alert.alert('Confirm Delete', `Are you sure you want to delete "${itemName}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await ownerApi.deleteMenuItem(id);
            setMenuItems((prev) => prev.filter((i) => i.id !== id));
          } catch (err) {
            Alert.alert('Error', err.message || 'Failed to delete item');
          }
        },
      },
    ]);
  };

  const renderMenuItem = ({ item }) => {
    return (
      <Card style={styles.itemCard}>
        <View style={styles.cardHeader}>
          <View style={{ flex: 1, marginRight: 8 }}>
            <Text style={styles.itemName}>{item.name}</Text>
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

          <TouchableOpacity
            onPress={() => handleDeleteItem(item.id, item.name)}
            style={styles.deleteBtn}
          >
            <Text style={styles.deleteText}>🗑️</Text>
          </TouchableOpacity>
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
          onPress={() => setModalVisible(true)}
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
              <Text style={styles.emptyIcon}>🥘</Text>
              <Text style={styles.emptyTitle}>No Menu Items</Text>
              <Text style={styles.emptySubtitle}>
                Add your delicious homemade dishes so customers can discover and order.
              </Text>
            </View>
          }
        />
      )}

      {/* Add Item Modal */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <SafeAreaView style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add New Food Item</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Text style={styles.closeBtn}>✕</Text>
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
                title="Save Food Item"
                onPress={handleCreateItem}
                loading={submitting}
                style={{ marginTop: 20 }}
              />
            </ScrollView>
          </View>
        </SafeAreaView>
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
});

export default OwnerMenuScreen;

