/**
 * DiscoverScreen.tsx
 *
 * ARCHITECTURE:
 * This component acts as the main gateway to the Stateless AI Proxy (Backend).
 * It embraces the Local-First philosophy by retrieving the user's logged movies
 * entirely from the local SQLite database (`getAllLogs`). It then sends a small,
 * anonymous list of these movie IDs to the backend to calculate the "Vibe" Match
 * using Semantic Text Embeddings without storing any user state on the server.
 *
 * DESIGN:
 * Strictly adheres to Dark Mode ONLY aesthetics.
 * Utilizes Glassmorphism and rounded MacBook/iOS-like UI elements.
 */
import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  SafeAreaView,
  Platform,
} from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import {
  Search,
  Compass,
  Play,
  Sparkles,
  Filter,
  Check,
  Rocket,
} from "lucide-react-native";
import { BlurView } from "expo-blur";
import { FlashList } from "@shopify/flash-list";
import { useQuery } from "@tanstack/react-query";
import { useFocusEffect } from "@react-navigation/native";
import { getAllLogs, LogEntry } from "../db/queries";

import {
  fetchRecommendations,
  fetchLatestMovies,
  fetchUpcomingMovies,
  searchMovies,
  RecommendResponse,
  SearchResponse,
} from "../api";

type Props = any;

export function DiscoverScreen({ navigation }: Props) {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchType, setSearchType] = useState<"title" | "mood">("title");
  const [logs, setLogs] = useState<LogEntry[]>([]);

  useFocusEffect(
    React.useCallback(() => {
      setLogs(getAllLogs());
    }, []),
  );

  const seedIds = logs.map((l) => l.mediaId);

  const { data: recommendations = [], isLoading: loadingRecs } = useQuery({
    queryKey: ["recommendations", seedIds],
    queryFn: () => fetchRecommendations(seedIds),
    enabled: seedIds.length > 0,
  });

  const { data: latest = [], isLoading: loadingLatest } = useQuery({
    queryKey: ["latest"],
    queryFn: fetchLatestMovies,
  });

  const { data: upcoming = [], isLoading: loadingUpcoming } = useQuery({
    queryKey: ["upcoming"],
    queryFn: fetchUpcomingMovies,
  });

  const { data: searchResults = [], isLoading: loadingSearch } = useQuery({
    queryKey: ["search", searchQuery, searchType],
    queryFn: () => searchMovies(searchQuery, searchType),
    enabled: searchQuery.length > 2,
  });

  const isSearching = searchQuery.length > 2;

  const renderVibeTag = (tag?: string) => {
    if (!tag) return null;
    return (
      <View style={styles.vibeTag}>
        <Text style={styles.vibeTagText}>{tag}</Text>
      </View>
    );
  };

  const renderCard = ({ item }: { item: any }) => (
    <TouchableOpacity
      activeOpacity={0.7}
      style={styles.cardContainer}
      onPress={() =>
        navigation.navigate("Details", {
          media_id: item.media_id,
          title: item.title,
          description: item.description,
          poster_url: item.poster_url,
          similarity_score: item.similarity_score,
          vibe_tag: item.vibe_tag,
        })
      }
    >
      <View style={styles.posterWrapper}>
        {item.poster_url ? (
          <Image source={{ uri: item.poster_url }} style={styles.poster} />
        ) : (
          <View style={[styles.poster, styles.placeholderPoster]}>
            <Play color="#666" size={32} />
          </View>
        )}
        {renderVibeTag(item.vibe_tag)}
      </View>
      <View style={styles.cardInfo}>
        <Text style={styles.cardTitle} numberOfLines={2}>
          {item.title}
        </Text>
        {item.similarity_score !== undefined ? (
          <View style={styles.scoreContainer}>
            <Sparkles color="#FFD700" size={12} />
            <Text style={styles.scoreText}>
              {(item.similarity_score * 100).toFixed(0)}% Match
            </Text>
          </View>
        ) : null}
      </View>
    </TouchableOpacity>
  );

  const renderSearchResult = ({ item }: { item: any }) => (
    <TouchableOpacity
      activeOpacity={0.7}
      style={styles.searchResultCard}
      onPress={() =>
        navigation.navigate("Details", {
          media_id: item.media_id,
          title: item.title,
          description: item.description,
          poster_url: item.poster_url,
          similarity_score: item.similarity_score,
          vibe_tag: item.vibe_tag,
        })
      }
    >
      {item.poster_url ? (
        <Image
          source={{ uri: item.poster_url }}
          style={styles.searchResultPoster}
        />
      ) : (
        <View style={[styles.searchResultPoster, styles.placeholderPoster]}>
          <Play color="#666" size={24} />
        </View>
      )}
      <View style={styles.searchResultInfo}>
        <Text style={styles.searchResultTitle} numberOfLines={2}>
          {item.title}
        </Text>
        {item.similarity_score !== undefined ? (
          <View style={[styles.scoreContainer, { marginTop: 4 }]}>
            <Sparkles color="#FFD700" size={12} />
            <Text style={styles.scoreText}>
              {(item.similarity_score * 100).toFixed(0)}% Match
            </Text>
          </View>
        ) : null}
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Discover</Text>

        <View style={styles.searchContainer}>
          <View style={styles.searchBar}>
            <Search color="#888" size={20} />
            <TextInput
              style={styles.searchInput}
              placeholder={
                searchType === "title"
                  ? "Search for a movie..."
                  : "Search by mood (e.g. Melancholic)..."
              }
              placeholderTextColor="#666"
              value={searchQuery}
              onChangeText={setSearchQuery}
              returnKeyType="search"
            />
            {searchQuery.length > 0 ? (
              <TouchableOpacity onPress={() => setSearchQuery("")}>
                <Text style={styles.clearText}>Clear</Text>
              </TouchableOpacity>
            ) : null}
          </View>

          <View style={styles.searchTypeToggle}>
            <TouchableOpacity
              style={[
                styles.typeButton,
                searchType === "title" ? styles.typeButtonActive : null,
              ]}
              onPress={() => setSearchType("title")}
            >
              <Text
                style={[
                  styles.typeButtonText,
                  searchType === "title" ? styles.typeButtonTextActive : null,
                ]}
              >
                Title
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.typeButton,
                searchType === "mood" ? styles.typeButtonActive : null,
              ]}
              onPress={() => setSearchType("mood")}
            >
              <Sparkles
                color={searchType === "mood" ? "#000" : "#888"}
                size={14}
                style={{ marginRight: 4 }}
              />
              <Text
                style={[
                  styles.typeButtonText,
                  searchType === "mood" ? styles.typeButtonTextActive : null,
                ]}
              >
                Vibe Check
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {isSearching ? (
        <View style={styles.searchResultsContainer}>
          {loadingSearch ? (
            <ActivityIndicator
              size="large"
              color="#ffffff"
              style={{ marginTop: 40 }}
            />
          ) : searchResults.length > 0 ? (
            <FlashList
              data={searchResults}
              keyExtractor={(item) => item.media_id}
              renderItem={renderSearchResult}
              estimatedItemSize={100}
              contentContainerStyle={{ paddingBottom: 100 }}
            />
          ) : (
            <View style={styles.emptySearch}>
              <Text style={styles.emptySearchText}>
                No movies found for "{searchQuery}"
              </Text>
            </View>
          )}
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Suggestions for You Row */}
          <View style={styles.sectionHeader}>
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <Sparkles color="#FFD700" size={20} />
              <Text style={styles.sectionTitle}>Suggestions for You</Text>
            </View>
            {recommendations.length > 7 ? (
              <TouchableOpacity
                onPress={() => navigation.navigate("ExpandedSuggestions")}
              >
                <Text style={styles.seeAllText}>See all</Text>
              </TouchableOpacity>
            ) : null}
          </View>

          {loadingRecs ? (
            <ActivityIndicator
              size="small"
              color="#fff"
              style={styles.rowLoader}
            />
          ) : (
            <View style={styles.horizontalFlashListContainer}>
              <FlashList
                horizontal
                data={recommendations.slice(0, 7)}
                keyExtractor={(item) => item.media_id}
                renderItem={renderCard}
                estimatedItemSize={140}
                showsHorizontalScrollIndicator={false}
              />
            </View>
          )}

          {/* Upcoming Movies Row */}
          <View style={[styles.sectionHeader, { marginTop: 32 }]}>
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <Rocket color="#b829ea" size={20} />
              <Text style={styles.sectionTitle}>Upcoming Movies</Text>
            </View>
          </View>

          {loadingUpcoming ? (
            <ActivityIndicator
              size="small"
              color="#fff"
              style={styles.rowLoader}
            />
          ) : (
            <View style={styles.horizontalFlashListContainer}>
              <FlashList
                horizontal
                data={upcoming.slice(0, 7)}
                keyExtractor={(item) => item.media_id}
                renderItem={renderCard}
                estimatedItemSize={140}
                showsHorizontalScrollIndicator={false}
              />
            </View>
          )}

          {/* Latest Trending Row */}
          <View style={[styles.sectionHeader, { marginTop: 32 }]}>
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <Compass color="#33b5e5" size={20} />
              <Text style={styles.sectionTitle}>Trending Worldwide</Text>
            </View>
          </View>

          {loadingLatest ? (
            <ActivityIndicator
              size="small"
              color="#fff"
              style={styles.rowLoader}
            />
          ) : (
            <View style={styles.horizontalFlashListContainer}>
              <FlashList
                horizontal
                data={latest}
                keyExtractor={(item) => item.media_id}
                renderItem={renderCard}
                estimatedItemSize={140}
                showsHorizontalScrollIndicator={false}
              />
            </View>
          )}
        </ScrollView>
      )}
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
    borderBottomWidth: 1,
    borderBottomColor: "#1a1a1a",
  },
  headerTitle: {
    fontSize: 36,
    fontWeight: "900",
    color: "#ffffff",
    letterSpacing: -1,
    marginBottom: 16,
  },

  searchContainer: { gap: 12 },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1a1a1a",
    borderRadius: 20,
    paddingHorizontal: 16,
    height: 50,
    borderWidth: 1,
    borderColor: "#333",
  },
  searchInput: { flex: 1, color: "#fff", fontSize: 16, marginLeft: 12 },
  clearText: { color: "#888", fontSize: 14, fontWeight: "600" },

  searchTypeToggle: { flexDirection: "row", gap: 8 },
  typeButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    borderRadius: 16,
    backgroundColor: "#111",
    borderWidth: 1,
    borderColor: "#222",
  },
  typeButtonActive: { backgroundColor: "#fff", borderColor: "#fff" },
  typeButtonText: { color: "#888", fontWeight: "600", fontSize: 14 },
  typeButtonTextActive: { color: "#000" },

  scrollContent: { paddingVertical: 24, paddingBottom: 120 },

  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 24,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#fff",
    marginLeft: 8,
  },
  seeAllText: { color: "#FFD700", fontWeight: "bold", fontSize: 14 },

  rowLoader: { height: 180, justifyContent: "center" },

  horizontalFlashListContainer: {
    height: 250,
    marginHorizontal: -24,
    paddingHorizontal: 24,
  },
  cardContainer: { width: 140, marginRight: 16 },

  posterWrapper: { position: "relative" },
  poster: {
    width: 140,
    height: 210,
    borderRadius: 16,
    backgroundColor: "#222",
    borderWidth: 1,
    borderColor: "#333",
  },
  vibeTag: {
    position: "absolute",
    bottom: -8,
    alignSelf: "center",
    backgroundColor: "rgba(0,0,0,0.85)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#444",
  },
  vibeTagText: { color: "#fff", fontSize: 10, fontWeight: "bold" },

  placeholderPoster: { justifyContent: "center", alignItems: "center" },
  cardInfo: { marginTop: 12 },
  cardTitle: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 4,
  },

  scoreContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 215, 0, 0.1)",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    alignSelf: "flex-start",
  },
  scoreText: {
    color: "#FFD700",
    fontSize: 11,
    fontWeight: "bold",
    marginLeft: 4,
  },

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
  searchResultPoster: {
    width: 60,
    height: 90,
    borderRadius: 8,
    backgroundColor: "#222",
  },
  searchResultInfo: { flex: 1, marginLeft: 16 },
  searchResultTitle: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 4,
  },

  emptySearch: { marginTop: 40, alignItems: "center" },
  emptySearchText: { color: "#666", fontSize: 16 },
});
