/**
 * Main Application Navigation Structure
 * - AuthStack (Login, OTP, RoleSelection)
 * - OwnerNavigator (Bottom Tabs for Owners)
 * - CustomerNavigator (Bottom Tabs for Customers + Provider Detail Modal/Screen)
 */

import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useSelector, useDispatch } from 'react-redux';
import {
  Home,
  ClipboardList,
  UtensilsCrossed,
  CalendarDays,
  Users,
  CreditCard,
  Settings,
  ShoppingCart,
  Package,
  User,
} from 'lucide-react-native';
import { COLORS } from '../constants/theme';
import { loadStoredAuthThunk } from '../store/slices/authSlice';

// Auth Screens
import LoginScreen from '../screens/auth/LoginScreen';
import OtpScreen from '../screens/auth/OtpScreen';
import RoleSelectionScreen from '../screens/auth/RoleSelectionScreen';

// Owner Screens
import OwnerDashboardScreen from '../screens/owner/OwnerDashboardScreen';
import OwnerOrdersScreen from '../screens/owner/OwnerOrdersScreen';
import OwnerMenuScreen from '../screens/owner/OwnerMenuScreen';
import OwnerPlansScreen from '../screens/owner/OwnerPlansScreen';
import OwnerSubscriptionsScreen from '../screens/owner/OwnerSubscriptionsScreen';
import OwnerPaymentsScreen from '../screens/owner/OwnerPaymentsScreen';
import OwnerProfileScreen from '../screens/owner/OwnerProfileScreen';

// Customer Screens
import CustomerHomeScreen from '../screens/customer/CustomerHomeScreen';
import ProviderDetailScreen from '../screens/customer/ProviderDetailScreen';
import CustomerCartScreen from '../screens/customer/CustomerCartScreen';
import CustomerSubscriptionsScreen from '../screens/customer/CustomerSubscriptionsScreen';
import CustomerOrdersScreen from '../screens/customer/CustomerOrdersScreen';
import CustomerProfileScreen from '../screens/customer/CustomerProfileScreen';

// Common Screens
import NotificationsScreen from '../screens/common/NotificationsScreen';
import ChatListScreen from '../screens/common/ChatListScreen';
import ChatRoomScreen from '../screens/common/ChatRoomScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

// --- Auth Stack ---
const AuthNavigator = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="Login" component={LoginScreen} />
    <Stack.Screen name="Otp" component={OtpScreen} />
    <Stack.Screen name="RoleSelection" component={RoleSelectionScreen} />
  </Stack.Navigator>
);

// --- Owner Bottom Tab Navigator ---
const OwnerTabNavigator = () => (
  <Tab.Navigator
    screenOptions={({ route }) => ({
      headerShown: false,
      tabBarActiveTintColor: COLORS.primary,
      tabBarInactiveTintColor: COLORS.textMuted,
      tabBarStyle: styles.tabBar,
      tabBarLabelStyle: styles.tabBarLabel,
      tabBarIcon: ({ color, size }) => {
        const iconSize = size ? size - 2 : 20;
        if (route.name === 'OwnerDashboard') return <Home size={iconSize} color={color} />;
        if (route.name === 'OwnerOrders') return <ClipboardList size={iconSize} color={color} />;
        if (route.name === 'OwnerMenu') return <UtensilsCrossed size={iconSize} color={color} />;
        if (route.name === 'OwnerPlans') return <CalendarDays size={iconSize} color={color} />;
        if (route.name === 'OwnerSubscriptions') return <Users size={iconSize} color={color} />;
        if (route.name === 'OwnerPayments') return <CreditCard size={iconSize} color={color} />;
        if (route.name === 'OwnerProfile') return <Settings size={iconSize} color={color} />;
        return <ClipboardList size={iconSize} color={color} />;
      },
    })}
  >
    <Tab.Screen name="OwnerDashboard" component={OwnerDashboardScreen} options={{ title: 'Home' }} />
    <Tab.Screen name="OwnerOrders" component={OwnerOrdersScreen} options={{ title: 'Orders' }} />
    <Tab.Screen name="OwnerMenu" component={OwnerMenuScreen} options={{ title: 'Menu' }} />
    <Tab.Screen name="OwnerPlans" component={OwnerPlansScreen} options={{ title: 'Plans' }} />
    <Tab.Screen name="OwnerSubscriptions" component={OwnerSubscriptionsScreen} options={{ title: 'Subs' }} />
    <Tab.Screen name="OwnerPayments" component={OwnerPaymentsScreen} options={{ title: 'Payments' }} />
    <Tab.Screen name="OwnerProfile" component={OwnerProfileScreen} options={{ title: 'Settings' }} />
  </Tab.Navigator>
);

// --- Customer Bottom Tab Navigator ---
const CustomerTabs = () => {
  const cart = useSelector((state) => state.cart);
  const cartCount = cart.items.reduce((acc, i) => acc + i.quantity, 0);

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: COLORS.textMuted,
        tabBarStyle: styles.tabBar,
        tabBarLabelStyle: styles.tabBarLabel,
        tabBarIcon: ({ color, size }) => {
          const iconSize = size ? size - 2 : 20;
          if (route.name === 'CustomerHome') return <Home size={iconSize} color={color} />;
          if (route.name === 'CustomerSubscriptions') return <CalendarDays size={iconSize} color={color} />;
          if (route.name === 'CustomerCart') return <ShoppingCart size={iconSize} color={color} />;
          if (route.name === 'CustomerOrders') return <Package size={iconSize} color={color} />;
          if (route.name === 'CustomerProfile') return <User size={iconSize} color={color} />;
          return <Home size={iconSize} color={color} />;
        },
      })}
    >
      <Tab.Screen name="CustomerHome" component={CustomerHomeScreen} options={{ title: 'Home' }} />
      <Tab.Screen name="CustomerSubscriptions" component={CustomerSubscriptionsScreen} options={{ title: 'My Tiffins' }} />
      <Tab.Screen
        name="CustomerCart"
        component={CustomerCartScreen}
        options={{
          title: 'Cart',
          tabBarBadge: cartCount > 0 ? cartCount : undefined,
        }}
      />
      <Tab.Screen name="CustomerOrders" component={CustomerOrdersScreen} options={{ title: 'Orders' }} />
      <Tab.Screen name="CustomerProfile" component={CustomerProfileScreen} options={{ title: 'Profile' }} />
    </Tab.Navigator>
  );
};

// --- Owner Stack (with Notifications & Chat) ---
const OwnerNavigator = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="OwnerTabs" component={OwnerTabNavigator} />
    <Stack.Screen name="Notifications" component={NotificationsScreen} />
    <Stack.Screen name="ChatList" component={ChatListScreen} />
    <Stack.Screen name="ChatRoom" component={ChatRoomScreen} />
  </Stack.Navigator>
);

// --- Customer Stack (with Provider Detail, Notifications & Chat) ---
const CustomerNavigator = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="CustomerTabs" component={CustomerTabs} />
    <Stack.Screen name="ProviderDetail" component={ProviderDetailScreen} />
    <Stack.Screen name="Notifications" component={NotificationsScreen} />
    <Stack.Screen name="ChatList" component={ChatListScreen} />
    <Stack.Screen name="ChatRoom" component={ChatRoomScreen} />
  </Stack.Navigator>
);

// --- Root Navigator ---
export const RootNavigator = () => {
  const dispatch = useDispatch();
  const { isAuthenticated, role, isInitializing } = useSelector((state) => state.auth);

  useEffect(() => {
    dispatch(loadStoredAuthThunk());
  }, [dispatch]);

  if (isInitializing) {
    return (
      <View style={styles.splash}>
        <UtensilsCrossed size={56} color="#FFFFFF" />
        <Text style={styles.splashTitle}>Homemade Tiffin</Text>
      </View>
    );
  }

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {!isAuthenticated ? (
        <Stack.Screen name="Auth" component={AuthNavigator} />
      ) : !role ? (
        <Stack.Screen name="RoleSelection" component={RoleSelectionScreen} />
      ) : role === 'owner' ? (
        <Stack.Screen name="OwnerApp" component={OwnerNavigator} />
      ) : (
        <Stack.Screen name="CustomerApp" component={CustomerNavigator} />
      )}
    </Stack.Navigator>
  );
};

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    height: 60,
    paddingBottom: 6,
    paddingTop: 6,
  },
  tabBarLabel: {
    fontSize: 10,
    fontWeight: '700',
  },
  splash: {
    flex: 1,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  splashTitle: {
    color: '#FFF',
    fontSize: 28,
    fontWeight: '800',
    marginTop: 12,
  },
});

export default RootNavigator;

