import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  SafeAreaView,
  Image,
  Platform,
} from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Search, Sparkles, Check } from "lucide-react-native";
import { FlashList } from "@shopify/flash-list";
import { useQuery } from "@tanstack/react-query";
import { searchMovies } from "../api";
import { insertLog } from "../db/queries";
import { RootStackParamList } from "./DetailsScreen";

type Props = NativeStackScreenProps<RootStackParamList, "Onboarding">;

export function OnboardingScreen({ navigation }: Props) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedMovies, setSelectedMovies] = useState<any[]>([]);

  const { data: searchResults = [], isLoading: loadingSearch } = useQuery({
    queryKey: ["search", searchQuery, "title"],
    queryFn: () => searchMovies(searchQuery, "title"),
    enabled: searchQuery.length > 2,
  });

  const toggleSelection = (movie: any) => {
    if (selectedMovies.some((m) => m.media_id === movie.media_id)) {
      setSelectedMovies(selectedMovies.filter((m) => m.media_id !== movie.media_id));
    } else {
      setSelectedMovies([...selectedMovies, movie]);
    }
  };

  const handleComplete = () => {
    // Insert all selected movies into the local SQLite database as 'pure gold' to build a strong centroid
    selectedMovies.forEach((movie) => {
      insertLog(
        {
          id: movie.media_id,
          title: movie.title,
          type: "movie",
          posterUri: movie.poster_url,
          description: movie.description,
        },
        "pure gold"
      );
    });

    // Navigate to HomeTabs which will now successfully generate Discover recommendations
    navigation.replace("HomeTabs");
  };

  const renderSearchResult = ({ item }: { item: any }) => {
    const isSelected = selectedMovies.some((m) => m.media_id === item.media_id);

    return (
      <TouchableOpacity
        activeOpacity={0.7}
        style={[styles.searchResultCard, isSelected && styles.searchResultCardSelected]}
        onPress={() => toggleSelection(item)}
      >
        {item.poster_url ? (
          <Image source={{ uri: item.poster_url }} style={styles.searchResultPoster} />
        ) : (
          <View style={[styles.searchResultPoster, styles.placeholderPoster]} />
        )}
        <View style={styles.searchResultInfo}>
          <Text style={styles.searchResultTitle} numberOfLines={2}>
            {item.title}
          </Text>
        </View>
        <View style={[styles.checkbox, isSelected && styles.checkboxSelected]}>
          {isSelected && <Check color="#000" size={16} />}
        </View>
      </TouchableOpacity>
    );
  };

  const needed = Math.max(0, 3 - selectedMovies.length);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Sparkles color="#FFD700" size={24} />
          <Text style={styles.headerTitle}>Build Your Profile</Text>
        </View>
        <Text style={styles.subtitle}>
          Select at least 3 movies you absolutely love so we can calibrate your unique cinematic vibe.
        </Text>

        <View style={styles.searchBar}>
          <Search color="#888" size={20} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search for a movie..."
            placeholderTextColor="#666"
            value={searchQuery}
            onChangeText={setSearchQuery}
            returnKeyType="search"
          />
        </View>
      </View>

      <View style={styles.searchResultsContainer}>
        {loadingSearch ? (
          <ActivityIndicator size="large" color="#ffffff" style={{ marginTop: 40 }} />
        ) : searchResults.length > 0 ? (
          <FlashList
            data={searchResults}
            keyExtractor={(item) => item.media_id}
            renderItem={renderSearchResult}
            estimatedItemSize={100}
            contentContainerStyle={{ paddingBottom: 150 }}
            keyboardShouldPersistTaps="handled"
          />
        ) : searchQuery.length > 2 ? (
          <View style={styles.emptySearch}>
            <Text style={styles.emptySearchText}>No movies found for "{searchQuery}"</Text>
          </View>
        ) : (
          <View style={styles.emptySearch}>
            <Text style={styles.emptySearchText}>Start typing to search...</Text>
          </View>
        )}
      </View>

      {/* Floating Action Button */}
      <View style={styles.fabContainer}>
        <TouchableOpacity
          style={[styles.fab, needed > 0 && styles.fabDisabled]}
          disabled={needed > 0}
          onPress={handleComplete}
        >
          <Text style={[styles.fabText, needed > 0 && styles.fabTextDisabled]}>
            {needed > 0 ? `Select ${needed} more...` : "Generate My Vibe"}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#050505",
    paddingTop: Platform.OS === "android" ? 40 : 0,
  },
  header: {
    paddingHorizontal: 24,
    paddingBottom: 16,
    paddingTop: 24,
    borderBottomWidth: 1,
    borderBottomColor: "#1a1a1a",
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "900",
    color: "#ffffff",
    letterSpacing: -1,
    marginLeft: 10,
  },
  subtitle: {
    color: "#aaa",
    fontSize: 15,
    marginBottom: 24,
    lineHeight: 22,
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1a1a1a",
    borderRadius: 20,
    paddingHorizontal: 16,
    height: 54,
    borderWidth: 1,
    borderColor: "#333",
  },
  searchInput: { flex: 1, color: "#fff", fontSize: 16, marginLeft: 12 },
  
  searchResultsContainer: { flex: 1, paddingHorizontal: 24, paddingTop: 16 },
  searchResultCard: {
    flexDirection: "row",
    marginBottom: 16,
    alignItems: "center",
    backgroundColor: "#111",
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#222",
  },
  searchResultCardSelected: {
    borderColor: "#FFD700",
    backgroundColor: "rgba(255, 215, 0, 0.05)",
  },
  searchResultPoster: {
    width: 60,
    height: 90,
    borderRadius: 8,
    backgroundColor: "#222",
  },
  placeholderPoster: {
    borderWidth: 1,
    borderColor: "#333",
  },
  searchResultInfo: { flex: 1, marginLeft: 16, marginRight: 12 },
  searchResultTitle: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#444",
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxSelected: {
    backgroundColor: "#FFD700",
    borderColor: "#FFD700",
  },
  emptySearch: { marginTop: 40, alignItems: "center" },
  emptySearchText: { color: "#666", fontSize: 16 },

  fabContainer: {
    position: "absolute",
    bottom: 40,
    left: 24,
    right: 24,
  },
  fab: {
    backgroundColor: "#FFD700",
    paddingVertical: 18,
    borderRadius: 30,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#FFD700",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  fabDisabled: {
    backgroundColor: "#222",
    shadowOpacity: 0,
    elevation: 0,
    borderWidth: 1,
    borderColor: "#333",
  },
  fabText: {
    color: "#000",
    fontWeight: "bold",
    fontSize: 18,
  },
  fabTextDisabled: {
    color: "#666",
  },
});
