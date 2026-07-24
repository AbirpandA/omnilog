import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, ActivityIndicator, Modal, Alert } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { BlurView } from 'expo-blur';
import { ChevronLeft, Star, Edit3, X, Sparkles, ThumbsDown, Meh } from 'lucide-react-native';
import { fetchMediaDetails, MediaDetailsResponse } from '../api';
import { getLogByMediaId, insertLog, ReactionType, LogEntry } from '../db/queries';

export type RootStackParamList = {
  HomeTabs: undefined;
  Details: { 
    media_id: string; 
    title: string; 
    description: string;
    poster_url?: string;
    similarity_score?: number;
  };
};

type Props = NativeStackScreenProps<RootStackParamList, 'Details'>;

const ReactionConfig: Record<ReactionType, { icon: React.ElementType, color: string, label: string }> = {
  'lame': { icon: ThumbsDown, color: '#ff4444', label: 'Lame' },
  'okay': { icon: Meh, color: '#aaaaaa', label: 'Okay' },
  'pure gold': { icon: Sparkles, color: '#ffbb33', label: 'Pure Gold' },
  'Absolute cinema': { icon: Star, color: '#00C851', label: 'Absolute Cinema' }
};

export function DetailsScreen({ route, navigation }: Props) {
  const { media_id, title, description, poster_url, similarity_score } = route.params;
  
  const [details, setDetails] = useState<MediaDetailsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [localLog, setLocalLog] = useState<LogEntry | null>(null);
  const [modalVisible, setModalVisible] = useState(false);

  useEffect(() => {
    loadData();
  }, [media_id]);

  const loadData = async () => {
    setLoading(true);
    try {
      // Fetch rich details from backend
      const data = await fetchMediaDetails(media_id);
      setDetails(data);
      
      // Fetch user's local log if it exists
      const log = getLogByMediaId(media_id);
      setLocalLog(log);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleRate = (reaction: ReactionType) => {
    try {
      insertLog(
        { 
          id: media_id, 
          title: title, 
          type: 'movie', 
          posterUri: details?.poster_url || poster_url, 
          releaseYear: details?.release_date?.substring(0, 4) || '', 
          runtime: details?.runtime ? `${details.runtime}m` : '', 
          director: details?.director || '',
          description: details?.description || description
        },
        reaction
      );
      
      Alert.alert('Success', `Logged "${title}" as ${reaction}!`);
      setModalVisible(false);
      
      // Refresh local log
      setLocalLog(getLogByMediaId(media_id));
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'Failed to log media');
    }
  };

  const renderScore = () => {
    if (similarity_score === undefined) return null;
    
    const percentage = Math.round(similarity_score * 100);
    return (
      <View style={styles.scoreBadge}>
        <Star size={14} color="#FFD700" />
        <Text style={styles.scoreText}>{percentage}% Match</Text>
      </View>
    );
  };

  const bannerImg = details?.backdrop_url || details?.poster_url || poster_url;
  const overlayPoster = details?.poster_url || poster_url;

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} bounces={false}>
        
        {/* HERO BANNER SECTION */}
        <View style={styles.heroContainer}>
          {bannerImg ? (
            <Image source={{ uri: bannerImg }} style={styles.heroImage} resizeMode="cover" />
          ) : (
            <View style={styles.heroGradient} />
          )}
          <View style={styles.heroOverlay} />
          
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <BlurView intensity={30} tint="dark" style={styles.backButtonBlur}>
              <ChevronLeft color="#fff" size={24} />
            </BlurView>
          </TouchableOpacity>
        </View>

        {/* CONTENT SECTION */}
        <View style={styles.contentContainer}>
          <View style={styles.posterAndTitleRow}>
            {overlayPoster && (
              <Image source={{ uri: overlayPoster }} style={styles.overlayPoster} />
            )}
            <View style={styles.titleContainer}>
              {renderScore()}
              <Text style={styles.title}>{title}</Text>
              
              {loading ? (
                <ActivityIndicator size="small" color="#fff" style={{alignSelf: 'flex-start'}}/>
              ) : (
                <>
                  <Text style={styles.subtitle}>
                    {details?.release_date ? details.release_date.substring(0, 4) : 'Unknown'} • {details?.runtime ? `${details.runtime}m` : ''}
                  </Text>
                  
                  {details?.tmdb_rating ? (
                    <View style={styles.tmdbRatingContainer}>
                      <Star size={16} color="#FFD700" />
                      <Text style={styles.tmdbRatingText}>{details.tmdb_rating.toFixed(1)} <Text style={{color: '#888'}}>/ 10</Text></Text>
                    </View>
                  ) : null}
                </>
              )}
            </View>
          </View>

          {/* USER RATING SECTION */}
          <View style={styles.userRatingSection}>
            {localLog ? (
              <View style={styles.loggedState}>
                <View style={styles.reactionPillLarge}>
                  {React.createElement(ReactionConfig[localLog.reaction].icon, {
                    color: ReactionConfig[localLog.reaction].color,
                    size: 20
                  })}
                  <Text style={[styles.reactionTextLarge, { color: ReactionConfig[localLog.reaction].color }]}>
                    {ReactionConfig[localLog.reaction].label}
                  </Text>
                </View>
                <TouchableOpacity style={styles.editButton} onPress={() => setModalVisible(true)}>
                  <Edit3 size={20} color="#fff" />
                  <Text style={styles.editButtonText}>Change</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity style={styles.logButton} onPress={() => setModalVisible(true)}>
                <Text style={styles.logButtonText}>Log this Movie</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* RICH DETAILS */}
          {details && (
            <>
              {details.tagline ? <Text style={styles.tagline}>"{details.tagline}"</Text> : null}
              
              <View style={styles.metadataRow}>
                {details.genres.slice(0, 3).map(g => (
                  <View key={g} style={styles.tag}><Text style={styles.tagText}>{g}</Text></View>
                ))}
              </View>

              <Text style={styles.sectionTitle}>Plot Synopsis</Text>
              <Text style={styles.description}>{details.description || description || "No description available."}</Text>

              <Text style={styles.sectionTitle}>Director</Text>
              <Text style={styles.description}>{details.director || "Unknown"}</Text>

              {details.cast && details.cast.length > 0 && (
                <>
                  <Text style={styles.sectionTitle}>Top Cast</Text>
                  <Text style={styles.description}>{details.cast.join(', ')}</Text>
                </>
              )}
            </>
          )}
        </View>
      </ScrollView>

      {/* RATING MODAL */}
      <Modal visible={modalVisible} transparent={true} animationType="fade">
        <BlurView intensity={50} tint="dark" style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle} numberOfLines={1}>Rate "{title}"</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <X color="#fff" size={24} />
              </TouchableOpacity>
            </View>

            {(['lame', 'okay', 'pure gold', 'Absolute cinema'] as ReactionType[]).map(r => (
              <TouchableOpacity 
                key={r}
                style={[
                  styles.rateButton, 
                  { borderColor: ReactionConfig[r].color },
                  localLog?.reaction === r ? { backgroundColor: 'rgba(255,255,255,0.1)' } : {}
                ]} 
                onPress={() => handleRate(r)}
              >
                {React.createElement(ReactionConfig[r].icon, { color: ReactionConfig[r].color, size: 24 })}
                <Text style={[styles.rateText, { color: ReactionConfig[r].color, marginLeft: 12 }]}>
                  {ReactionConfig[r].label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </BlurView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#050505' },
  scrollContent: { paddingBottom: 100 },
  heroContainer: { height: 350, backgroundColor: '#1a1a1a', position: 'relative' },
  heroImage: { ...StyleSheet.absoluteFillObject },
  heroGradient: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(5,5,5,0.4)' },
  heroOverlay: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 150, backgroundColor: 'rgba(5,5,5,0.5)' },
  backButton: { position: 'absolute', top: 60, left: 20, borderRadius: 20, overflow: 'hidden', zIndex: 10 },
  backButtonBlur: { padding: 8, borderRadius: 20 },
  
  contentContainer: {
    padding: 24,
    paddingTop: 0,
    marginTop: -50,
  },
  posterAndTitleRow: {
    flexDirection: 'row',
    marginBottom: 24,
  },
  overlayPoster: {
    width: 110,
    height: 165,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#222',
    backgroundColor: '#111',
  },
  titleContainer: {
    flex: 1,
    marginLeft: 16,
    justifyContent: 'flex-end',
    paddingBottom: 10,
  },
  scoreBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 215, 0, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
    marginBottom: 8,
  },
  scoreText: { color: '#FFD700', fontWeight: 'bold', marginLeft: 4, fontSize: 12 },
  title: { fontSize: 24, fontWeight: '800', color: '#ffffff', marginBottom: 8, letterSpacing: -0.5 },
  subtitle: { color: '#aaa', fontSize: 14, marginBottom: 8 },
  tmdbRatingContainer: { flexDirection: 'row', alignItems: 'center' },
  tmdbRatingText: { color: '#fff', fontSize: 14, fontWeight: 'bold', marginLeft: 6 },
  
  userRatingSection: {
    backgroundColor: '#111',
    padding: 16,
    borderRadius: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#222',
  },
  logButton: {
    backgroundColor: '#fff',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  logButtonText: { color: '#000', fontWeight: 'bold', fontSize: 16 },
  loggedState: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  reactionPillLarge: { flexDirection: 'row', alignItems: 'center' },
  reactionTextLarge: { fontSize: 18, fontWeight: 'bold', marginLeft: 8 },
  editButton: { flexDirection: 'row', alignItems: 'center', padding: 8, backgroundColor: '#222', borderRadius: 8 },
  editButtonText: { color: '#fff', marginLeft: 6, fontWeight: '600' },

  tagline: { color: '#ccc', fontStyle: 'italic', fontSize: 16, marginBottom: 20 },
  metadataRow: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 24 },
  tag: { backgroundColor: '#1a1a1a', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, marginRight: 8, marginBottom: 8, borderWidth: 1, borderColor: '#333' },
  tagText: { color: '#aaa', fontSize: 12, fontWeight: '600' },
  
  sectionTitle: { fontSize: 18, fontWeight: '700', color: '#ffffff', marginBottom: 12, marginTop: 8 },
  description: { fontSize: 16, color: '#a0a0a0', lineHeight: 24, marginBottom: 16 },

  modalOverlay: { flex: 1, justifyContent: 'center', padding: 20 },
  modalContent: { backgroundColor: 'rgba(20,20,20,0.95)', borderRadius: 24, padding: 24, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  modalTitle: { color: '#fff', fontSize: 20, fontWeight: 'bold', flex: 1, marginRight: 12 },
  rateButton: { flexDirection: 'row', padding: 16, borderRadius: 12, borderWidth: 1, marginBottom: 12, alignItems: 'center', justifyContent: 'center' },
  rateText: { fontSize: 16, fontWeight: 'bold' }
});
