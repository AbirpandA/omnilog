import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Animated,
  TextInput,
  ScrollView,
} from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useFocusEffect } from "@react-navigation/native";
import {
  BookMarked,
  Play,
  Search,
  ArrowDownAZ,
  CalendarHeart,
} from "lucide-react-native";
import { Image } from "expo-image";
import { getAllLogs, LogEntry } from "../db/queries";
import { GlassCard } from "../components/GlassCard";
import { ReactionConfig, ReactionType } from "../utils/constants";

type Props = any;
type FilterType = "all" | ReactionType;
type SortOrder = "newest" | "alphabetical";

const ALL_FILTERS: { label: string; value: FilterType }[] = [
  { label: "All Logs", value: "all" },
  { label: "Absolute Cinema", value: "Absolute cinema" },
  { label: "Pure Gold", value: "pure gold" },
  { label: "Okay", value: "okay" },
  { label: "Lame", value: "lame" },
  { label: "Watchlist", value: "watchlist" },
  { label: "Collection", value: "collection" },
];

export function LibraryScreen({ navigation }: Props) {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const [searchQuery, setSearchQuery] = useState("");
  const [filter, setFilter] = useState<FilterType>("all");
  const [sortOrder, setSortOrder] = useState<SortOrder>("newest");

  const scrollY = new Animated.Value(0);

  useFocusEffect(
    useCallback(() => {
      const data = getAllLogs();
      setLogs(data);
      setLoading(false);
    }, []),
  );

  let filteredLogs = logs.filter((log) => {
    // 1. Apply Filter
    if (filter !== "all" && log.reaction !== filter) return false;

    // 2. Apply Search Query
    if (searchQuery.trim() !== "") {
      const query = searchQuery.toLowerCase();
      if (!log.title.toLowerCase().includes(query)) {
        return false;
      }
    }

    return true;
  });

  // 3. Apply Sorting
  filteredLogs.sort((a, b) => {
    if (sortOrder === "alphabetical") {
      return a.title.localeCompare(b.title);
    } else {
      // newest first
      return (
        new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
      );
    }
  });

  const renderItem = ({ item }: { item: LogEntry }) => {
    const config =
      ReactionConfig[item.reaction as ReactionType] || ReactionConfig["okay"];
    const IconComponent = config.icon;

    return (
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={() =>
          navigation.navigate("Details", {
            media_id: item.mediaId,
            title: item.title,
            description: item.description || "",
            poster_url: item.posterUri || "",
          })
        }
      >
        <GlassCard style={styles.cardContainer}>
          <View style={styles.cardContent}>
            {item.posterUri ? (
              <Image
                source={{ uri: item.posterUri }}
                style={styles.poster}
                contentFit="cover"
                transition={200}
              />
            ) : (
              <View style={[styles.poster, styles.placeholderPoster]}>
                <BookMarked color="#666" size={24} />
              </View>
            )}

            <View style={styles.detailsContainer}>
              <Text style={styles.title} numberOfLines={2}>
                {item.title}
              </Text>

              <View style={styles.reactionBadge}>
                <IconComponent color={config.color} size={14} />
                <Text style={[styles.reactionText, { color: config.color }]}>
                  {config.label}
                </Text>
              </View>

              <Text style={styles.dateText}>
                Logged on {new Date(item.updated_at).toLocaleDateString()}
              </Text>
            </View>
          </View>
        </GlassCard>
      </TouchableOpacity>
    );
  };

  const headerTranslateY = scrollY.interpolate({
    inputRange: [0, 100],
    outputRange: [0, -50],
    extrapolate: "clamp",
  });

  return (
    <View style={styles.container}>
      <Animated.View
        style={[
          styles.header,
          { transform: [{ translateY: headerTranslateY }] },
        ]}
      >
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <BookMarked color="#ffffff" size={32} />
          <Text style={styles.headerTitle}>Library</Text>
        </View>
      </Animated.View>

      <View style={styles.controlsContainer}>
        {/* Search Bar */}
        <View style={styles.searchRow}>
          <View style={styles.searchContainer}>
            <Search color="#888" size={20} style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search movies..."
              placeholderTextColor="#888"
              value={searchQuery}
              onChangeText={setSearchQuery}
              selectionColor="#b829ea"
            />
          </View>

          <TouchableOpacity
            style={styles.sortButton}
            onPress={() =>
              setSortOrder((prev) =>
                prev === "newest" ? "alphabetical" : "newest",
              )
            }
          >
            {sortOrder === "newest" ? (
              <CalendarHeart
                color={sortOrder === "newest" ? "#b829ea" : "#fff"}
                size={24}
              />
            ) : (
              <ArrowDownAZ
                color={sortOrder === "alphabetical" ? "#b829ea" : "#fff"}
                size={24}
              />
            )}
          </TouchableOpacity>
        </View>

        {/* Filter Chips */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.filterScroll}
          contentContainerStyle={styles.filterRow}
        >
          {ALL_FILTERS.map((f) => (
            <TouchableOpacity
              key={f.value}
              style={[
                styles.filterChip,
                filter === f.value && styles.filterChipActive,
              ]}
              onPress={() => setFilter(f.value)}
            >
              <Text
                style={[
                  styles.filterText,
                  filter === f.value && styles.filterTextActive,
                ]}
              >
                {f.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {filteredLogs.length === 0 && !loading ? (
        <View style={styles.emptyState}>
          <Play color="#333" size={64} style={{ marginBottom: 16 }} />
          <Text style={styles.emptyTitle}>Nothing here</Text>
          <Text style={styles.emptySubtitle}>
            {logs.length === 0
              ? "Start exploring and logging movies to build your library."
              : "No movies match your current search and filter."}
          </Text>
        </View>
      ) : (
        <Animated.FlatList
          data={filteredLogs}
          keyExtractor={(item) => item.reactionId}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          onScroll={Animated.event(
            [{ nativeEvent: { contentOffset: { y: scrollY } } }],
            { useNativeDriver: true },
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#050505" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 16,
    backgroundColor: "rgba(5,5,5,0.9)",
    zIndex: 10,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#ffffff",
    marginLeft: 12,
    letterSpacing: -1,
  },

  controlsContainer: {
    paddingHorizontal: 24,
    marginBottom: 8,
    zIndex: 5,
  },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 16,
  },
  searchContainer: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: 16,
    paddingHorizontal: 16,
    height: 48,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  searchIcon: { marginRight: 8 },
  searchInput: {
    flex: 1,
    color: "#fff",
    fontSize: 16,
    height: "100%",
  },
  sortButton: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.05)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },

  filterScroll: {
    flexGrow: 0,
    marginBottom: 8,
  },
  filterRow: {
    flexDirection: "row",
    gap: 8,
    paddingRight: 24,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#1a1a1a",
    borderWidth: 1,
    borderColor: "#333",
  },
  filterChipActive: {
    backgroundColor: "#fff",
    borderColor: "#fff",
  },
  filterText: {
    color: "#888",
    fontWeight: "600",
    fontSize: 14,
  },
  filterTextActive: {
    color: "#000",
  },

  listContent: { padding: 24, paddingTop: 8, paddingBottom: 100 },
  cardContainer: { marginBottom: 16, padding: 12 },
  cardContent: { flexDirection: "row", alignItems: "center" },
  poster: { width: 70, height: 105, borderRadius: 12, backgroundColor: "#222" },
  placeholderPoster: {
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#333",
  },
  detailsContainer: { flex: 1, marginLeft: 16, justifyContent: "center" },
  title: { fontSize: 18, fontWeight: "bold", color: "#fff", marginBottom: 8 },

  reactionBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.05)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: "flex-start",
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  reactionText: { fontSize: 12, fontWeight: "bold", marginLeft: 6 },

  dateText: { color: "#666", fontSize: 12 },

  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 40,
  },
  emptyTitle: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 8,
  },
  emptySubtitle: {
    color: "#666",
    fontSize: 15,
    textAlign: "center",
    lineHeight: 22,
  },
});
