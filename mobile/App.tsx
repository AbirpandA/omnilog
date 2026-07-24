import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { NavigationContainer, DarkTheme } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { BookMarked, Search, Compass } from 'lucide-react-native';

import { initDatabase } from './db/index';
import { LibraryScreen } from './screens/LibraryScreen';
import { SearchScreen } from './screens/SearchScreen';
import { DiscoverScreen } from './screens/DiscoverScreen';

const Tab = createBottomTabNavigator();

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
    <NavigationContainer theme={DarkTheme}>
      <StatusBar style="light" />
      <Tab.Navigator
        screenOptions={({ route }) => ({
          tabBarIcon: ({ color, size }) => {
            if (route.name === 'Library') return <BookMarked color={color} size={size} />;
            if (route.name === 'Search') return <Search color={color} size={size} />;
            if (route.name === 'Discover') return <Compass color={color} size={size} />;
            return null;
          },
          tabBarStyle: {
            backgroundColor: 'rgba(0,0,0,0.8)',
            borderTopColor: 'rgba(255,255,255,0.1)',
          },
          tabBarActiveTintColor: '#ffffff',
          tabBarInactiveTintColor: '#666666',
          headerShown: false,
        })}
      >
        <Tab.Screen name="Library" component={LibraryScreen} />
        <Tab.Screen name="Search" component={SearchScreen} />
        <Tab.Screen name="Discover" component={DiscoverScreen} />
      </Tab.Navigator>
    </NavigationContainer>
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
