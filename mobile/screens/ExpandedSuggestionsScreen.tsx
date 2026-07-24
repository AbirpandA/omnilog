import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import {
  ChevronLeft,
  Sparkles,
  Filter,
  Check,
  Play,
  RefreshCw,
} from "lucide-react-native";
import { FlashList } from "@shopify/flash-list";
import { useQuery } from "@tanstack/react-query";
import { useFocusEffect } from "@react-navigation/native";
import { getAllLogs, LogEntry } from "../db/queries";

import { fetchRecommendations, RecommendResponse } from "../api";
import { RootStackParamList } from "./DetailsScreen";

type Props = NativeStackScreenProps<RootStackParamList, "ExpandedSuggestions">;

export function ExpandedSuggestionsScreen({ navigation }: Props) {
  const [filterActive, setFilterActive] = useState(false);
  const [logs, setLogs] = useState<LogEntry[]>([]);

  useFocusEffect(
    React.useCallback(() => {
      setLogs(getAllLogs());
    }, []),
  );

  const seedIds = logs.map((l) => l.mediaId);

  const {
    data: recommendations = [],
    isLoading,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: ["recommendations", seedIds],
    queryFn: () => fetchRecommendations(seedIds),
    enabled: seedIds.length > 0,
  });

  const handleRefresh = () => {
    refetch();
  };

  const renderVibeTag = (tag?: string) => {
    if (!tag) return null;
    return (
      <View style={styles.vibeTag}>
        <Text style={styles.vibeTagText}>{tag}</Text>
      </View>
    );
  };

  const renderCard = ({ item }: { item: RecommendResponse }) => (
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
            <Play color="#666" size={24} />
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
        <View style={styles.actionsRow}>
          <TouchableOpacity
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
            style={styles.addButton}
          >
            <Text style={styles.addButtonText}>View Details</Text>
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backBtn}
          >
            <ChevronLeft color="#fff" size={24} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Suggestions for You</Text>
          <TouchableOpacity
            onPress={() => setFilterActive(!filterActive)}
            style={styles.filterBtn}
          >
            <Filter color={filterActive ? "#FFD700" : "#fff"} size={20} />
          </TouchableOpacity>
        </View>

        {filterActive ? (
          <View style={styles.filtersContainer}>
            {["All", "High Match", "Recent"].map((f, i) => (
              <TouchableOpacity
                key={f}
                style={[styles.filterChip, i === 0 && styles.filterChipActive]}
              >
                {i === 0 ? (
                  <Check color="#000" size={14} style={{ marginRight: 4 }} />
                ) : null}
                <Text
                  style={[
                    styles.filterText,
                    i === 0 && styles.filterTextActive,
                  ]}
                >
                  {f}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        ) : null}
      </View>

      <View style={styles.refreshContainer}>
        <TouchableOpacity
          style={styles.refreshButton}
          onPress={handleRefresh}
          disabled={isFetching}
        >
          <RefreshCw color={isFetching ? "#888" : "#fff"} size={16} />
          <Text style={[styles.refreshText, isFetching && { color: "#888" }]}>
            {isFetching ? "Generating new mix..." : "Reload Suggestions"}
          </Text>
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <ActivityIndicator
          size="large"
          color="#FFD700"
          style={{ marginTop: 40 }}
        />
      ) : (
        <FlashList
          data={recommendations}
          keyExtractor={(item) => item.media_id}
          renderItem={renderCard}
          estimatedItemSize={120}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#050505" },
  header: {
    paddingTop: 60,
    paddingHorizontal: 24,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#1a1a1a",
  },
  headerTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  backBtn: { padding: 8, marginLeft: -8 },
  headerTitle: { fontSize: 20, fontWeight: "bold", color: "#ffffff" },
  filterBtn: { padding: 8, marginRight: -8 },

  filtersContainer: { flexDirection: "row", marginTop: 16, gap: 8 },
  filterChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#1a1a1a",
    borderWidth: 1,
    borderColor: "#333",
  },
  filterChipActive: { backgroundColor: "#FFD700", borderColor: "#FFD700" },
  filterText: { color: "#888", fontWeight: "600", fontSize: 13 },
  filterTextActive: { color: "#000" },

  refreshContainer: { paddingHorizontal: 24, paddingTop: 16, paddingBottom: 8 },
  refreshButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#111",
    paddingVertical: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#222",
  },
  refreshText: { color: "#fff", fontWeight: "600", marginLeft: 8 },

  listContent: { padding: 24, paddingTop: 16, paddingBottom: 100 },
  cardContainer: {
    flexDirection: "row",
    marginBottom: 24,
    backgroundColor: "#111",
    borderRadius: 20,
    padding: 12,
    borderWidth: 1,
    borderColor: "#222",
  },

  posterWrapper: { position: "relative" },
  poster: { width: 90, height: 135, borderRadius: 12, backgroundColor: "#222" },
  placeholderPoster: {
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#333",
  },
  vibeTag: {
    position: "absolute",
    bottom: -8,
    alignSelf: "center",
    backgroundColor: "rgba(0,0,0,0.85)",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#444",
  },
  vibeTagText: { color: "#fff", fontSize: 9, fontWeight: "bold" },

  cardInfo: { flex: 1, marginLeft: 16, justifyContent: "center" },
  cardTitle: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 8,
  },

  scoreContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 215, 0, 0.1)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: "flex-start",
    marginBottom: 12,
  },
  scoreText: {
    color: "#FFD700",
    fontSize: 12,
    fontWeight: "bold",
    marginLeft: 4,
  },

  actionsRow: { flexDirection: "row", alignItems: "center" },
  addButton: {
    flex: 1,
    backgroundColor: "#222",
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: "center",
  },
  addButtonText: { color: "#fff", fontWeight: "600", fontSize: 13 },
});
