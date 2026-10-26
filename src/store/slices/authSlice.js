/**
 * Auth Redux Slice
 */

import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { authApi } from '../../api/authApi';

// Async Thunks
export const verifyOtpThunk = createAsyncThunk(
  'auth/verifyOtp',
  async ({ phone, otp }, { rejectWithValue }) => {
    try {
      const response = await authApi.verifyOtp(phone, otp);
      const { token, user } = response.data;
      await AsyncStorage.setItem('auth_token', token);
      await AsyncStorage.setItem('user_info', JSON.stringify(user));
      return { token, user };
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

export const selectRoleThunk = createAsyncThunk(
  'auth/selectRole',
  async (role, { rejectWithValue }) => {
    try {
      const response = await authApi.selectRole(role);
      const { token, user } = response.data;
      await AsyncStorage.setItem('auth_token', token);
      await AsyncStorage.setItem('user_info', JSON.stringify(user));
      return { token, user };
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

export const loadStoredAuthThunk = createAsyncThunk(
  'auth/loadStoredAuth',
  async (_, { rejectWithValue }) => {
    try {
      const token = await AsyncStorage.getItem('auth_token');
      const userStr = await AsyncStorage.getItem('user_info');
      if (token && userStr) {
        return { token, user: JSON.parse(userStr) };
      }
      return null;
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

export const logoutThunk = createAsyncThunk('auth/logout', async () => {
  try {
    await authApi.logout();
  } catch (e) {
    // Ignore error on logout
  }
  await AsyncStorage.removeItem('auth_token');
  await AsyncStorage.removeItem('user_info');
  return null;
});

const initialState = {
  user: null,
  token: null,
  role: null,
  isAuthenticated: false,
  isLoading: false,
  isInitializing: true,
  error: null,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    updateUser: (state, action) => {
      state.user = { ...state.user, ...action.payload };
    },
  },
  extraReducers: (builder) => {
    // Load stored auth
    builder
      .addCase(loadStoredAuthThunk.pending, (state) => {
        state.isInitializing = true;
      })
      .addCase(loadStoredAuthThunk.fulfilled, (state, action) => {
        state.isInitializing = false;
        if (action.payload) {
          state.token = action.payload.token;
          state.user = action.payload.user;
          state.role = action.payload.user?.role;
          state.isAuthenticated = true;
        }
      })
      .addCase(loadStoredAuthThunk.rejected, (state) => {
        state.isInitializing = false;
      });

    // Verify OTP
    builder
      .addCase(verifyOtpThunk.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(verifyOtpThunk.fulfilled, (state, action) => {
        state.isLoading = false;
        state.token = action.payload.token;
        state.user = action.payload.user;
        state.role = action.payload.user.role;
        state.isAuthenticated = true;
      })
      .addCase(verifyOtpThunk.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      });

    // Select Role
    builder
      .addCase(selectRoleThunk.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(selectRoleThunk.fulfilled, (state, action) => {
        state.isLoading = false;
        state.token = action.payload.token;
        state.user = action.payload.user;
        state.role = action.payload.user.role;
      })
      .addCase(selectRoleThunk.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      });

    // Logout
    builder.addCase(logoutThunk.fulfilled, (state) => {
      state.user = null;
      state.token = null;
      state.role = null;
      state.isAuthenticated = false;
      state.error = null;
    });
  },
});

export const { clearError, updateUser } = authSlice.actions;
export default authSlice.reducer;

