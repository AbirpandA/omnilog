import React, { useState, useEffect, useCallback } from 'react';
import { 
  StyleSheet, View, Text, TextInput, FlatList, TouchableOpacity, 
  Alert, Modal, ActivityIndicator, Image, ScrollView 
} from 'react-native';
import { Search, Plus, X, Compass, Flame, Sparkles, CheckCircle } from 'lucide-react-native';
import { BlurView } from 'expo-blur';
import { GlassCard } from '../components/GlassCard';
import { insertLog, ReactionType, getAllLogs, LogEntry } from '../db/queries';
import { 
  searchMedia, SearchResponse, 
  fetchRecommendations, RecommendResponse, 
  fetchLatestMovies, LatestResponse 
} from '../api/index';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { RootStackParamList } from './DetailsScreen';

type DiscoverScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'HomeTabs'>;

type MediaItem = {
  media_id: string;
  title: string;
  description: string;
  poster_url: string;
  similarity_score?: number;
};

export function DiscoverScreen() {
  const [query, setQuery] = useState('');
  const [searchResults, setSearchResults] = useState<MediaItem[]>([]);
  const [recommendations, setRecommendations] = useState<MediaItem[]>([]);
  const [latest, setLatest] = useState<MediaItem[]>([]);
  
  const [loadingSearch, setLoadingSearch] = useState(false);
  const [loadingFeed, setLoadingFeed] = useState(true);
  
  const [userLogs, setUserLogs] = useState<LogEntry[]>([]);
  
  const navigation = useNavigation<DiscoverScreenNavigationProp>();

  useFocusEffect(
    useCallback(() => {
      loadFeed();
    }, [])
  );

  const loadFeed = async () => {
    setLoadingFeed(true);
    try {
      const logs = getAllLogs();
      setUserLogs(logs);
      
      const highRated = logs.filter(l => l.reaction === 'pure gold' || l.reaction === 'Absolute cinema');
      const seedIds = highRated.map(l => l.mediaId);
      
      const seedsToUse = seedIds.length > 0 ? seedIds.slice(0, 5) : ['603', '27205'];
      
      const [recData, latestData] = await Promise.all([
        fetchRecommendations(seedsToUse),
        fetchLatestMovies()
      ]);
      
      setRecommendations(recData);
      setLatest(latestData);
    } catch (e) {
      console.error("Failed to load feed", e);
    } finally {
      setLoadingFeed(false);
    }
  };

  useEffect(() => {
    const delayDebounceFn = setTimeout(async () => {
      if (query.length > 2) {
        setLoadingSearch(true);
        try {
          const data = await searchMedia(query);
          setSearchResults(data);
        } catch (e) {
          console.error(e);
        } finally {
          setLoadingSearch(false);
        }
      } else {
        setSearchResults([]);
      }
    }, 500);

    return () => clearTimeout(delayDebounceFn);
  }, [query]);

  const isLogged = (mediaId: string) => {
    return userLogs.some(log => log.mediaId === mediaId);
  };

  const renderHorizontalCard = ({ item }: { item: MediaItem }) => {
    const logged = isLogged(item.media_id);
    return (
      <TouchableOpacity 
        activeOpacity={0.7}
        style={styles.horizontalCard}
        onPress={() => navigation.navigate('Details', {
          media_id: item.media_id,
          title: item.title,
          description: item.description,
          poster_url: item.poster_url,
          similarity_score: item.similarity_score
        })}
      >
        {item.poster_url ? (
          <Image source={{ uri: item.poster_url }} style={styles.horizontalPoster} />
        ) : (
          <View style={[styles.horizontalPoster, styles.placeholderPoster]}>
            <Text style={styles.placeholderText}>No Image</Text>
          </View>
        )}
        
        {logged ? (
          <View style={[styles.addFloatingButton, { backgroundColor: 'rgba(0,0,0,0.5)' }]}>
            <BlurView intensity={30} tint="dark" style={styles.addFloatingButtonBlur}>
              <CheckCircle color="#00C851" size={16} />
            </BlurView>
          </View>
        ) : (
          <TouchableOpacity 
            style={styles.addFloatingButton}
            onPress={() => navigation.navigate('Details', {
              media_id: item.media_id,
              title: item.title,
              description: item.description,
              poster_url: item.poster_url
            })}
          >
            <BlurView intensity={30} tint="dark" style={styles.addFloatingButtonBlur}>
              <Plus color="#fff" size={16} />
            </BlurView>
          </TouchableOpacity>
        )}
        
        <Text style={styles.horizontalTitle} numberOfLines={2}>{item.title}</Text>
        {item.similarity_score && (
          <Text style={styles.scoreText}>{(item.similarity_score * 100).toFixed(0)}% Match</Text>
        )}
      </TouchableOpacity>
    );
  };

  const renderSearchItem = ({ item }: { item: MediaItem }) => {
    const logged = isLogged(item.media_id);
    return (
      <TouchableOpacity 
        activeOpacity={0.7}
        onPress={() => navigation.navigate('Details', {
          media_id: item.media_id,
          title: item.title,
          description: item.description,
          poster_url: item.poster_url,
          similarity_score: item.similarity_score
        })}
      >
        <GlassCard style={styles.searchCardContainer}>
          <View style={styles.searchCardContent}>
            {item.poster_url ? (
              <Image source={{ uri: item.poster_url }} style={styles.searchPoster} />
            ) : (
              <View style={[styles.searchPoster, styles.placeholderPoster]}>
                <Text style={styles.placeholderText}>No Image</Text>
              </View>
            )}
            <View style={styles.searchTextContainer}>
              <Text style={styles.searchTitle} numberOfLines={1}>{item.title}</Text>
              <Text style={styles.searchDesc} numberOfLines={2}>{item.description}</Text>
            </View>
            {logged ? (
              <View style={[styles.addButton, { backgroundColor: 'transparent' }]}>
                <CheckCircle color="#00C851" size={24} />
              </View>
            ) : (
              <TouchableOpacity 
                onPress={() => navigation.navigate('Details', {
                  media_id: item.media_id,
                  title: item.title,
                  description: item.description,
                  poster_url: item.poster_url
                })} 
                style={styles.addButton}
              >
                <Plus color="#ffffff" size={24} />
              </TouchableOpacity>
            )}
          </View>
        </GlassCard>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Compass color="#ffffff" size={32} />
        <Text style={styles.title}>Discover</Text>
      </View>

      <View style={styles.searchBarContainer}>
        <View style={styles.searchInputWrapper}>
          <Search color="#888" size={20} style={styles.searchIcon} />
          <TextInput 
            style={styles.searchInput}
            placeholder="Search movies..."
            placeholderTextColor="#888888"
            value={query}
            onChangeText={setQuery}
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => setQuery('')} style={styles.clearButton}>
              <X color="#aaa" size={20} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {query.length > 2 ? (
        // --- SEARCH RESULTS VIEW ---
        loadingSearch ? (
          <ActivityIndicator size="large" color="#ffffff" style={styles.loader} />
        ) : (
          <FlatList
            data={searchResults}
            keyExtractor={(item) => item.media_id}
            renderItem={renderSearchItem}
            contentContainerStyle={styles.listContainer}
            showsVerticalScrollIndicator={false}
          />
        )
      ) : (
        // --- DEFAULT FEED VIEW ---
        <ScrollView contentContainerStyle={styles.feedContainer} showsVerticalScrollIndicator={false}>
          {loadingFeed ? (
            <ActivityIndicator size="large" color="#ffffff" style={styles.loader} />
          ) : (
            <>
              <View style={styles.sectionHeader}>
                <Sparkles color="#00C851" size={20} />
                <Text style={styles.sectionTitle}>Suggestions for You</Text>
              </View>
              <FlatList
                horizontal
                data={recommendations}
                keyExtractor={(item) => item.media_id}
                renderItem={renderHorizontalCard}
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.horizontalList}
              />
              
              <View style={[styles.sectionHeader, { marginTop: 10 }]}>
                <Flame color="#ffbb33" size={20} />
                <Text style={styles.sectionTitle}>Latest Releases</Text>
              </View>
              <FlatList
                horizontal
                data={latest}
                keyExtractor={(item) => item.media_id}
                renderItem={renderHorizontalCard}
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.horizontalList}
              />
            </>
          )}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#050505' },
  header: { flexDirection: 'row', alignItems: 'center', padding: 24, paddingTop: 60 },
  title: { fontSize: 32, fontWeight: 'bold', color: '#ffffff', marginLeft: 12 },
  
  searchBarContainer: { paddingHorizontal: 24, marginBottom: 16 },
  searchInputWrapper: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: 'rgba(255,255,255,0.1)', 
    borderRadius: 12,
    paddingHorizontal: 16,
  },
  searchIcon: { marginRight: 8 },
  searchInput: { flex: 1, color: '#ffffff', paddingVertical: 16, fontSize: 16 },
  clearButton: { padding: 8, marginRight: -8 },
  
  loader: { marginTop: 40 },
  feedContainer: { paddingBottom: 100 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 24, marginBottom: 16, marginTop: 10 },
  sectionTitle: { color: '#fff', fontSize: 20, fontWeight: 'bold', marginLeft: 8 },
  horizontalList: { paddingHorizontal: 16, paddingBottom: 24 },
  
  horizontalCard: { width: 140, marginHorizontal: 8, position: 'relative' },
  horizontalPoster: { width: 140, height: 210, borderRadius: 12, backgroundColor: '#222', marginBottom: 8 },
  addFloatingButton: { position: 'absolute', top: 8, right: 8, borderRadius: 16, overflow: 'hidden' },
  addFloatingButtonBlur: { padding: 6, borderRadius: 16 },
  horizontalTitle: { color: '#fff', fontSize: 14, fontWeight: '600' },
  scoreText: { color: '#00C851', fontWeight: 'bold', fontSize: 12, marginTop: 4 },
  
  listContainer: { padding: 16, paddingBottom: 100 },
  searchCardContainer: { padding: 12, marginBottom: 12 },
  searchCardContent: { flexDirection: 'row', alignItems: 'center' },
  searchPoster: { width: 60, height: 90, borderRadius: 8, backgroundColor: '#222' },
  placeholderPoster: { justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#333' },
  placeholderText: { color: '#666', fontSize: 10 },
  searchTextContainer: { flex: 1, paddingHorizontal: 16 },
  searchTitle: { fontSize: 16, fontWeight: 'bold', color: '#ffffff' },
  searchDesc: { color: '#aaaaaa', marginTop: 4, fontSize: 13 },
  addButton: { padding: 10, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 8 },
});
