/**
 * Cart Redux Slice
 * Supports adding food items from a single provider, quantity management,
 * delivery options, and subtotal/total calculations.
 */

import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  providerId: null,
  providerName: '',
  items: [], // [{ menuItemId, name, price, quantity, category }]
  deliveryType: 'delivery', // 'delivery' | 'pickup'
  deliveryAddress: '',
  notes: '',
};

const cartSlice = createSlice({
  name: 'cart',
  initialState,
  reducers: {
    addToCart: (state, action) => {
      const { providerId, providerName, item } = action.payload;

      // If cart has items from a different provider, reset cart with new provider
      if (state.providerId && state.providerId !== providerId) {
        state.items = [];
      }

      state.providerId = providerId;
      state.providerName = providerName;

      const existingItemIndex = state.items.findIndex((i) => i.menuItemId === item.id);
      if (existingItemIndex >= 0) {
        state.items[existingItemIndex].quantity += 1;
      } else {
        state.items.push({
          menuItemId: item.id,
          name: item.name,
          price: parseFloat(item.price),
          quantity: 1,
          category: item.category,
        });
      }
    },

    updateQuantity: (state, action) => {
      const { menuItemId, quantity } = action.payload;
      if (quantity <= 0) {
        state.items = state.items.filter((i) => i.menuItemId !== menuItemId);
      } else {
        const item = state.items.find((i) => i.menuItemId === menuItemId);
        if (item) {
          item.quantity = quantity;
        }
      }

      if (state.items.length === 0) {
        state.providerId = null;
        state.providerName = '';
      }
    },

    removeFromCart: (state, action) => {
      state.items = state.items.filter((i) => i.menuItemId !== action.payload);
      if (state.items.length === 0) {
        state.providerId = null;
        state.providerName = '';
      }
    },

    setDeliveryType: (state, action) => {
      state.deliveryType = action.payload;
    },

    setDeliveryAddress: (state, action) => {
      state.deliveryAddress = action.payload;
    },

    setNotes: (state, action) => {
      state.notes = action.payload;
    },

    clearCart: () => initialState,
  },
});

export const {
  addToCart,
  updateQuantity,
  removeFromCart,
  setDeliveryType,
  setDeliveryAddress,
  setNotes,
  clearCart,
} = cartSlice.actions;

export default cartSlice.reducer;

