import { StatusBar } from "expo-status-bar";
import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Platform,
  TouchableOpacity,
} from "react-native";
import { ErrorBoundary } from "react-error-boundary";
import { logger } from "./utils/logger";
import { NavigationContainer, DarkTheme } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { BookMarked, Compass, User } from "lucide-react-native";
import { BlurView } from "expo-blur";
import { QueryClient } from "@tanstack/react-query";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { createSqlitePersister } from "./utils/sqlitePersister";

import { initDatabase } from "./db/index";
import { LibraryScreen } from "./screens/LibraryScreen";
import { DiscoverScreen } from "./screens/DiscoverScreen";
import { DetailsScreen, RootStackParamList } from "./screens/DetailsScreen";
import { ExpandedSuggestionsScreen } from "./screens/ExpandedSuggestionsScreen";
import { TasteProfileScreen } from "./screens/TasteProfileScreen";

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator<RootStackParamList>();
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      gcTime: 1000 * 60 * 60 * 24 * 7, // 7 days
    },
  },
});

const sqlitePersister = createSqlitePersister();

function HomeTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ color, size }) => {
          if (route.name === "Library")
            return <BookMarked color={color} size={20} />;
          if (route.name === "Discover")
            return <Compass color={color} size={20} />;
          if (route.name === "Taste Profile")
            return <User color={color} size={20} />;
          return null;
        },
        tabBarBackground: () =>
          Platform.OS === "ios" ? (
            <BlurView
              tint="dark"
              intensity={80}
              style={StyleSheet.absoluteFill}
            />
          ) : (
            <View
              style={[
                StyleSheet.absoluteFill,
                { backgroundColor: "rgba(20,20,20,0.95)" },
              ]}
            />
          ),
        tabBarStyle: {
          position: "absolute",
          bottom: 24,
          left: 24,
          right: 24,
          elevation: 0,
          backgroundColor: "transparent",
          borderTopWidth: 0,
          height: 60,
          borderRadius: 30,
          overflow: "hidden",
        },
        tabBarShowLabel: false,
        tabBarActiveTintColor: "#ffffff",
        tabBarInactiveTintColor: "#666666",
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
      logger.info("Database initialized successfully.");
    } catch (e) {
      logger.error("Database init failed:", e);
    }
  }, []);

  const FallbackComponent = ({ error, resetErrorBoundary }: any) => (
    <View style={styles.errorContainer}>
      <Text style={styles.errorTitle}>Something went wrong!</Text>
      <Text style={styles.errorText}>{error.message}</Text>
      <TouchableOpacity style={styles.resetButton} onPress={resetErrorBoundary}>
        <Text style={styles.resetButtonText}>Restart App</Text>
      </TouchableOpacity>
    </View>
  );

  if (!dbInitialized) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Initializing OmniLog...</Text>
      </View>
    );
  }

  return (
    <ErrorBoundary
      FallbackComponent={FallbackComponent}
      onReset={() => setDbInitialized(false)}
    >
      <PersistQueryClientProvider
        client={queryClient}
        persistOptions={{ persister: sqlitePersister }}
      >
        <NavigationContainer theme={DarkTheme}>
          <StatusBar style="light" />
          <Stack.Navigator screenOptions={{ headerShown: false }}>
            <Stack.Screen name="HomeTabs" component={HomeTabs} />
            <Stack.Screen name="Details" component={DetailsScreen} />
            <Stack.Screen
              name="ExpandedSuggestions"
              component={ExpandedSuggestionsScreen as any}
            />
          </Stack.Navigator>
        </NavigationContainer>
      </PersistQueryClientProvider>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: "#050505",
    alignItems: "center",
    justifyContent: "center",
  },
  loadingText: {
    color: "#ffffff",
    fontSize: 16,
  },
  errorContainer: {
    flex: 1,
    backgroundColor: "#050505",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  errorTitle: {
    color: "#ff4444",
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 16,
  },
  errorText: {
    color: "#aaa",
    fontSize: 14,
    textAlign: "center",
    marginBottom: 24,
  },
  resetButton: {
    backgroundColor: "#ffffff",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 20,
  },
  resetButtonText: {
    color: "#000000",
    fontWeight: "bold",
  },
});
