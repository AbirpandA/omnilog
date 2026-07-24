import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { NavigationContainer, DarkTheme } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { BookMarked, Compass, User } from 'lucide-react-native';
import { BlurView } from 'expo-blur';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { initDatabase } from './db/index';
import { LibraryScreen } from './screens/LibraryScreen';
import { DiscoverScreen } from './screens/DiscoverScreen';
import { DetailsScreen, RootStackParamList } from './screens/DetailsScreen';
import { ExpandedSuggestionsScreen } from './screens/ExpandedSuggestionsScreen';
import { TasteProfileScreen } from './screens/TasteProfileScreen';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator<RootStackParamList>();
const queryClient = new QueryClient();

function HomeTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ color, size }) => {
          if (route.name === 'Library') return <BookMarked color={color} size={20} />;
          if (route.name === 'Discover') return <Compass color={color} size={20} />;
          if (route.name === 'Taste Profile') return <User color={color} size={20} />;
          return null;
        },
        tabBarBackground: () => (
          Platform.OS === 'ios' ? (
            <BlurView tint="dark" intensity={80} style={StyleSheet.absoluteFill} />
          ) : (
            <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(20,20,20,0.95)' }]} />
          )
        ),
        tabBarStyle: {
          position: 'absolute',
          bottom: 24,
          left: 24,
          right: 24,
          elevation: 0,
          backgroundColor: 'transparent',
          borderTopWidth: 0,
          height: 60,
          borderRadius: 30,
          overflow: 'hidden',
        },
        tabBarShowLabel: false,
        tabBarActiveTintColor: '#ffffff',
        tabBarInactiveTintColor: '#666666',
        headerShown: false,
      })}
    >
      <Tab.Screen name="Library" component={LibraryScreen} />
      <Tab.Screen name="Discover" component={DiscoverScreen} />
      <Tab.Screen name="Taste Profile" component={TasteProfileScreen} />
    </Tab.Navigator>
  );
}

export default function App() {
  const [dbInitialized, setDbInitialized] = useState(false);

  useEffect(() => {
    try {
      initDatabase();
      setDbInitialized(true);
    } catch (e) {
      console.error("Database init failed:", e);
    }
  }, []);

  if (!dbInitialized) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Initializing OmniLog...</Text>
      </View>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <NavigationContainer theme={DarkTheme}>
        <StatusBar style="light" />
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          <Stack.Screen name="HomeTabs" component={HomeTabs} />
          <Stack.Screen name="Details" component={DetailsScreen} />
          <Stack.Screen name="ExpandedSuggestions" component={ExpandedSuggestionsScreen as any} />
        </Stack.Navigator>
      </NavigationContainer>
    </QueryClientProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: '#050505',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    color: '#ffffff',
    fontSize: 16,
  }
});
