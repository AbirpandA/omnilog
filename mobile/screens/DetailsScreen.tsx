import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  TextInput,
} from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import {
  ChevronLeft,
  Star,
  Heart,
  ThumbsDown,
  ThumbsUp,
  Medal,
  Sparkles,
  X,
  Bookmark,
  FolderHeart,
  Plus,
} from "lucide-react-native";
import { BlurView } from "expo-blur";
import { Image } from "expo-image";
import {
  fetchMediaDetails,
  fetchSimilarMovies,
  RecommendResponse,
  MediaDetailsResponse,
} from "../api";
import { insertLog, getLogByMediaId, deleteLog, LogEntry } from "../db/queries";
import { FlashList } from "@shopify/flash-list";
import { useQuery } from "@tanstack/react-query";
import { ReactionConfig, ReactionType } from "../utils/constants";

export type RootStackParamList = {
  HomeTabs: undefined;
  Onboarding: undefined;
  Details: {
    media_id: string;
    title: string;
    description: string;
    poster_url?: string;
    similarity_score?: number;
    vibe_tag?: string;
  };
  ExpandedSuggestions: undefined;
};

type Props = NativeStackScreenProps<RootStackParamList, "Details">;

export function DetailsScreen({ route, navigation }: Props) {
  const {
    media_id,
    title,
    description,
    poster_url,
    similarity_score,
    vibe_tag,
  } = route.params;

  const [localLog, setLocalLog] = useState<LogEntry | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [journalNotes, setJournalNotes] = useState("");

  useEffect(() => {
    const log = getLogByMediaId(media_id);
    setLocalLog(log);
    if (log && log.notes) {
      setJournalNotes(log.notes);
    }
  }, [media_id]);

  const { data: details, isLoading: loadingDetails } = useQuery({
    queryKey: ["details", media_id],
    queryFn: () => fetchMediaDetails(media_id),
  });

  const { data: similar = [], isLoading: loadingSimilar } = useQuery({
    queryKey: ["similar", media_id],
    queryFn: () => fetchSimilarMovies(media_id),
  });

  const handleRate = (reaction: ReactionType) => {
    insertLog(
      {
        id: media_id,
        title: title,
        type: "movie",
        posterUri: poster_url,
        description: description,
      },
      reaction,
      journalNotes,
    );

    const updatedLog = getLogByMediaId(media_id);
    setLocalLog(updatedLog);
    if (updatedLog && updatedLog.notes) {
      setJournalNotes(updatedLog.notes);
    }
    setModalVisible(false);
  };

  const handleToggleSecondary = (target: ReactionType) => {
    if (localLog?.reaction === target) {
      deleteLog(media_id);
      setLocalLog(null);
    } else {
      insertLog(
        {
          id: media_id,
          title: title,
          type: "movie",
          posterUri: poster_url,
          description: description,
        },
        target,
      );
      setLocalLog(getLogByMediaId(media_id));
    }
  };

  const renderVibeTag = (tag?: string) => {
    if (!tag) return null;
    return (
      <View style={styles.vibeTag}>
        <Text style={styles.vibeTagText}>{tag}</Text>
      </View>
    );
  };

  const renderSimilarCard = ({ item }: { item: RecommendResponse }) => (
    <TouchableOpacity
      activeOpacity={0.7}
      style={styles.horizontalCard}
      onPress={() =>
        navigation.push("Details", {
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
          <Image
            source={{ uri: item.poster_url }}
            style={styles.horizontalPoster}
            transition={200}
            contentFit="cover"
          />
        ) : (
          <View style={[styles.horizontalPoster, styles.placeholderPoster]}>
            <Text style={styles.placeholderText}>No Image</Text>
          </View>
        )}
        {renderVibeTag(item.vibe_tag)}
      </View>
      <Text style={styles.horizontalTitle} numberOfLines={2}>
        {item.title}
      </Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} bounces={false}>
        {/* HERO SECTION */}
        <View style={styles.heroContainer}>
          {(details?.backdrop_url || poster_url) && (
            <Image
              source={{ uri: details?.backdrop_url || poster_url }}
              style={styles.heroImage}
              contentFit="cover"
              transition={300}
            />
          )}
          <View style={styles.heroGradient} />

          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <BlurView intensity={30} tint="dark" style={styles.backButtonBlur}>
              <ChevronLeft color="#fff" size={24} />
            </BlurView>
          </TouchableOpacity>

          <View style={styles.heroOverlay} />
        </View>

        <View style={styles.contentContainer}>
          <View style={styles.posterAndTitleRow}>
            <View style={styles.posterWrapper}>
              {poster_url ? (
                <Image
                  source={{ uri: poster_url }}
                  style={styles.overlayPoster}
                  transition={200}
                  contentFit="cover"
                />
              ) : (
                <View style={[styles.overlayPoster, styles.placeholderPoster]}>
                  <Text style={styles.placeholderText}>No Poster</Text>
                </View>
              )}
              {renderVibeTag(vibe_tag)}
            </View>

            <View style={styles.titleContainer}>
              {similarity_score && (
                <View style={styles.scoreBadge}>
                  <Sparkles color="#FFD700" size={14} />
                  <Text style={styles.scoreText}>
                    {(similarity_score * 100).toFixed(0)}% Match
                  </Text>
                </View>
              )}
              <Text style={styles.title}>{title}</Text>
              {details && (
                <Text style={styles.subtitle}>
                  {details.release_date
                    ? details.release_date.split("-")[0]
                    : ""}{" "}
                  • {details.runtime}m
                </Text>
              )}
              {details?.tmdb_rating ? (
                <View style={styles.tmdbRatingContainer}>
                  <Star color="#f5c518" size={16} fill="#f5c518" />
                  <Text style={styles.tmdbRatingText}>
                    {details.tmdb_rating.toFixed(1)} / 10
                  </Text>
                </View>
              ) : null}
            </View>
          </View>

          {/* RATING SECTION REDESIGN */}
          <View style={styles.actionRow}>
            {/* Primary Reaction Button */}
            <TouchableOpacity
              style={[
                styles.primaryActionButton,
                localLog &&
                  ReactionConfig[localLog.reaction as ReactionType] && {
                    borderColor:
                      ReactionConfig[localLog.reaction as ReactionType].color,
                    backgroundColor: "rgba(255,255,255,0.05)",
                  },
              ]}
              onPress={() => setModalVisible(true)}
            >
              {localLog && ReactionConfig[localLog.reaction as ReactionType] ? (
                <>
                  {React.createElement(
                    ReactionConfig[localLog.reaction as ReactionType].icon ||
                      Star,
                    {
                      color:
                        ReactionConfig[localLog.reaction as ReactionType].color,
                      size: 24,
                    },
                  )}
                  <Text
                    style={[
                      styles.primaryActionText,
                      {
                        color:
                          ReactionConfig[localLog.reaction as ReactionType]
                            .color,
                      },
                    ]}
                  >
                    {ReactionConfig[localLog.reaction as ReactionType].label}
                  </Text>
                </>
              ) : (
                <>
                  <Plus color="#fff" size={24} />
                  <Text style={styles.primaryActionText}>Log Movie</Text>
                </>
              )}
            </TouchableOpacity>

            {/* Secondary Action Buttons */}
            <View style={styles.secondaryActionGroup}>
              <TouchableOpacity
                style={[
                  styles.iconButton,
                  localLog?.reaction === "watchlist" && styles.iconButtonActive,
                ]}
                onPress={() => handleToggleSecondary("watchlist")}
              >
                <Bookmark
                  color={
                    localLog?.reaction === "watchlist" ? "#33b5e5" : "#888"
                  }
                  size={22}
                />
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.iconButton,
                  localLog?.reaction === "collection" &&
                    styles.iconButtonActive,
                ]}
                onPress={() => handleToggleSecondary("collection")}
              >
                <FolderHeart
                  color={
                    localLog?.reaction === "collection" ? "#ff8800" : "#888"
                  }
                  size={22}
                />
              </TouchableOpacity>
            </View>
          </View>

          {details?.tagline ? (
            <Text style={styles.tagline}>"{details.tagline}"</Text>
          ) : null}

          {details && details.genres && details.genres.length > 0 && (
            <View style={styles.metadataRow}>
              {details.genres.map((g) => (
                <View key={g} style={styles.tag}>
                  <Text style={styles.tagText}>{g}</Text>
                </View>
              ))}
            </View>
          )}

          <Text style={styles.sectionTitle}>Story</Text>
          <Text style={styles.description}>{description}</Text>

          {loadingDetails ? (
            <ActivityIndicator
              size="small"
              color="#fff"
              style={{ marginTop: 20 }}
            />
          ) : (
            details && (
              <>
                <Text style={styles.sectionTitle}>Director</Text>
                <Text style={styles.description}>
                  {details.director || "Unknown"}
                </Text>

                {details.cast && details.cast.length > 0 && (
                  <>
                    <Text style={styles.sectionTitle}>Top Cast</Text>
                    <Text style={styles.description}>
                      {details.cast.join(", ")}
                    </Text>
                  </>
                )}
              </>
            )
          )}

          {similar.length > 0 && (
            <View style={{ marginTop: 24 }}>
              <Text style={styles.sectionTitle}>Similar to this</Text>
              <View style={styles.horizontalFlashListContainer}>
                <FlashList
                  horizontal
                  data={similar}
                  keyExtractor={(item) => item.media_id}
                  renderItem={renderSimilarCard}
                  estimatedItemSize={120}
                  showsHorizontalScrollIndicator={false}
                />
              </View>
            </View>
          )}
        </View>
      </ScrollView>

      {/* SLEEK RATING MODAL */}
      <Modal visible={modalVisible} transparent={true} animationType="fade">
        <BlurView intensity={70} tint="dark" style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle} numberOfLines={1}>
                Log "{title}"
              </Text>
              <TouchableOpacity
                onPress={() => setModalVisible(false)}
                style={styles.closeBtn}
              >
                <X color="#aaa" size={24} />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalSubHeader}>Your Reaction</Text>
            <View style={styles.reactionGrid}>
              {(
                [
                  "lame",
                  "okay",
                  "pure gold",
                  "Absolute cinema",
                ] as ReactionType[]
              ).map((r) => (
                <TouchableOpacity
                  key={r}
                  style={[
                    styles.rateButton,
                    { borderColor: ReactionConfig[r].color },
                    localLog?.reaction === r
                      ? { backgroundColor: "rgba(255,255,255,0.1)" }
                      : {},
                  ]}
                  onPress={() => handleRate(r)}
                >
                  {React.createElement(ReactionConfig[r].icon, {
                    color: ReactionConfig[r].color,
                    size: 24,
                  })}
                  <Text
                    style={[
                      styles.rateText,
                      { color: ReactionConfig[r].color, marginLeft: 12 },
                    ]}
                  >
                    {ReactionConfig[r].label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={{ marginTop: 24 }}>
              <Text style={styles.modalSubHeader}>Cinematic Journal</Text>
              <TextInput
                style={styles.journalInput}
                placeholder="Write your thoughts, feelings, and vibes about this movie..."
                placeholderTextColor="#666"
                multiline
                numberOfLines={4}
                value={journalNotes}
                onChangeText={setJournalNotes}
              />
              {localLog?.reaction && (
                <TouchableOpacity
                  style={styles.saveNotesButton}
                  onPress={() => handleRate(localLog.reaction)}
                >
                  <Text style={styles.saveNotesText}>Save Notes</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </BlurView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#050505" },
  scrollContent: { paddingBottom: 100 },
  heroContainer: {
    height: 350,
    backgroundColor: "#1a1a1a",
    position: "relative",
  },
  heroImage: { ...StyleSheet.absoluteFill },
  heroGradient: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "rgba(5,5,5,0.4)",
  },
  heroOverlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 150,
    backgroundColor: "rgba(5,5,5,0.5)",
  },
  backButton: {
    position: "absolute",
    top: 60,
    left: 20,
    borderRadius: 24,
    overflow: "hidden",
    zIndex: 10,
  },
  backButtonBlur: {
    padding: 10,
    borderRadius: 24,
    backgroundColor: "rgba(255,255,255,0.05)",
  },

  contentContainer: { padding: 24, paddingTop: 0, marginTop: -50 },
  posterAndTitleRow: { flexDirection: "row", marginBottom: 24 },

  posterWrapper: { position: "relative" },
  overlayPoster: {
    width: 110,
    height: 165,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: "#222",
    backgroundColor: "#111",
  },
  vibeTag: {
    position: "absolute",
    bottom: -8,
    alignSelf: "center",
    backgroundColor: "rgba(0,0,0,0.8)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#333",
  },
  vibeTagText: { color: "#fff", fontSize: 10, fontWeight: "bold" },

  titleContainer: {
    flex: 1,
    marginLeft: 16,
    justifyContent: "flex-end",
    paddingBottom: 10,
  },
  scoreBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 215, 0, 0.1)",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: "flex-start",
    marginBottom: 8,
  },
  scoreText: {
    color: "#FFD700",
    fontWeight: "bold",
    marginLeft: 4,
    fontSize: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: "800",
    color: "#ffffff",
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  subtitle: { color: "#aaa", fontSize: 14, marginBottom: 8 },
  tmdbRatingContainer: { flexDirection: "row", alignItems: "center" },
  tmdbRatingText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "bold",
    marginLeft: 6,
  },

  actionRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 24,
    gap: 12,
    zIndex: 20,
  },
  primaryActionButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#222",
    paddingVertical: 14,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#333",
  },
  primaryActionText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16,
    marginLeft: 8,
  },
  secondaryActionGroup: { flexDirection: "row", gap: 12 },
  iconButton: {
    backgroundColor: "#1a1a1a",
    padding: 14,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#333",
    alignItems: "center",
    justifyContent: "center",
  },
  iconButtonActive: {
    backgroundColor: "rgba(255,255,255,0.05)",
    borderColor: "rgba(255,255,255,0.2)",
  },

  tagline: {
    color: "#ccc",
    fontStyle: "italic",
    fontSize: 16,
    marginBottom: 20,
  },
  metadataRow: { flexDirection: "row", flexWrap: "wrap", marginBottom: 24 },
  tag: {
    backgroundColor: "#1a1a1a",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    marginRight: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#333",
  },
  tagText: { color: "#aaa", fontSize: 12, fontWeight: "600" },

  sectionTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#ffffff",
    marginBottom: 12,
    marginTop: 8,
  },
  description: {
    fontSize: 16,
    color: "#a0a0a0",
    lineHeight: 24,
    marginBottom: 16,
  },

  horizontalFlashListContainer: {
    height: 210,
    marginHorizontal: -24,
    paddingHorizontal: 24,
  },
  horizontalCard: { width: 120, marginRight: 16 },
  horizontalPoster: {
    width: 120,
    height: 180,
    borderRadius: 16,
    backgroundColor: "#222",
    marginBottom: 8,
  },
  placeholderPoster: {
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#333",
  },
  placeholderText: { color: "#666", fontSize: 10 },
  horizontalTitle: { color: "#fff", fontSize: 13, fontWeight: "600" },

  modalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.6)",
  },
  modalContent: {
    backgroundColor: "#111",
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    padding: 24,
    paddingBottom: 40,
    borderWidth: 1,
    borderColor: "#222",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 24,
  },
  modalTitle: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "bold",
    flex: 1,
    marginRight: 12,
  },
  closeBtn: { padding: 8, backgroundColor: "#222", borderRadius: 20 },
  modalSubHeader: {
    color: "#888",
    fontSize: 13,
    textTransform: "uppercase",
    fontWeight: "bold",
    marginBottom: 16,
  },

  reactionGrid: { gap: 12 },
  rateButton: {
    flexDirection: "row",
    padding: 18,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#1a1a1a",
  },
  rateText: { fontSize: 16, fontWeight: "bold" },

  journalInput: {
    backgroundColor: "#1a1a1a",
    borderWidth: 1,
    borderColor: "#333",
    borderRadius: 16,
    color: "#fff",
    padding: 16,
    minHeight: 120,
    textAlignVertical: "top",
    fontSize: 15,
    lineHeight: 22,
  },
  saveNotesButton: {
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 20,
    alignItems: "center",
    marginTop: 12,
  },
  saveNotesText: {
    color: "#000",
    fontWeight: "bold",
    fontSize: 16,
  },
});
