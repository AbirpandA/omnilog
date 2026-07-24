import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, Image, FlatList, TouchableOpacity, Animated } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import { BookMarked, Play } from 'lucide-react-native';
import { getAllLogs, LogEntry } from '../db/queries';
import { GlassCard } from '../components/GlassCard';
import { ReactionConfig, ReactionType } from '../utils/constants';

type Props = any;
type FilterType = 'all' | 'watchlist' | 'collection';

export function LibraryScreen({ navigation }: Props) {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [filter, setFilter] = useState<FilterType>('all');
  
  const scrollY = new Animated.Value(0);

  useFocusEffect(
    useCallback(() => {
      const data = getAllLogs();
      setLogs(data);
      setLoading(false);
    }, [])
  );

  const filteredLogs = logs.filter(log => {
    if (filter === 'watchlist') return log.reaction === 'watchlist';
    if (filter === 'collection') return log.reaction === 'collection';
    return true; // all
  });

  const renderItem = ({ item }: { item: LogEntry }) => {
    // Need to cast reaction to ReactionType to keep typescript happy here since it's stored as string
    const config = ReactionConfig[item.reaction as ReactionType] || ReactionConfig['okay'];
    const IconComponent = config.icon;

    return (
      <TouchableOpacity 
        activeOpacity={0.7}
        onPress={() => navigation.navigate('Details', {
          media_id: item.mediaId,
          title: item.title,
          description: item.description || '',
          poster_url: item.posterUri || ''
        })}
      >
        <GlassCard style={styles.cardContainer}>
          <View style={styles.cardContent}>
            {item.posterUri ? (
              <Image source={{ uri: item.posterUri }} style={styles.poster} />
            ) : (
              <View style={[styles.poster, styles.placeholderPoster]}>
                <BookMarked color="#666" size={24} />
              </View>
            )}
            
            <View style={styles.detailsContainer}>
              <Text style={styles.title} numberOfLines={2}>{item.title}</Text>
              
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
    extrapolate: 'clamp',
  });

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.header, { transform: [{ translateY: headerTranslateY }] }]}>
        <BookMarked color="#ffffff" size={32} />
        <Text style={styles.headerTitle}>Library</Text>
      </Animated.View>

      <View style={styles.filterRow}>
        <TouchableOpacity 
          style={[styles.filterChip, filter === 'all' && styles.filterChipActive]}
          onPress={() => setFilter('all')}
        >
          <Text style={[styles.filterText, filter === 'all' && styles.filterTextActive]}>All Logs</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.filterChip, filter === 'watchlist' && styles.filterChipActive]}
          onPress={() => setFilter('watchlist')}
        >
          <Text style={[styles.filterText, filter === 'watchlist' && styles.filterTextActive]}>Watchlist</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.filterChip, filter === 'collection' && styles.filterChipActive]}
          onPress={() => setFilter('collection')}
        >
          <Text style={[styles.filterText, filter === 'collection' && styles.filterTextActive]}>Collection</Text>
        </TouchableOpacity>
      </View>

      {filteredLogs.length === 0 && !loading ? (
        <View style={styles.emptyState}>
          <Play color="#333" size={64} style={{ marginBottom: 16 }} />
          <Text style={styles.emptyTitle}>Nothing here yet</Text>
          <Text style={styles.emptySubtitle}>Start exploring and logging movies to build your library.</Text>
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
            { useNativeDriver: true }
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#050505' },
  header: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    paddingHorizontal: 24, 
    paddingTop: 60, 
    paddingBottom: 16,
    backgroundColor: 'rgba(5,5,5,0.9)',
    zIndex: 10
  },
  headerTitle: { fontSize: 32, fontWeight: 'bold', color: '#ffffff', marginLeft: 12, letterSpacing: -1 },
  
  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    marginBottom: 16,
    gap: 8
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#1a1a1a',
    borderWidth: 1,
    borderColor: '#333'
  },
  filterChipActive: {
    backgroundColor: '#fff',
    borderColor: '#fff'
  },
  filterText: {
    color: '#888',
    fontWeight: '600',
    fontSize: 14
  },
  filterTextActive: {
    color: '#000'
  },

  listContent: { padding: 24, paddingTop: 8, paddingBottom: 100 },
  cardContainer: { marginBottom: 16, padding: 12 },
  cardContent: { flexDirection: 'row', alignItems: 'center' },
  poster: { width: 70, height: 105, borderRadius: 12, backgroundColor: '#222' },
  placeholderPoster: { justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#333' },
  detailsContainer: { flex: 1, marginLeft: 16, justifyContent: 'center' },
  title: { fontSize: 18, fontWeight: 'bold', color: '#fff', marginBottom: 8 },
  
  reactionBadge: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: 'rgba(255,255,255,0.05)', 
    paddingHorizontal: 10, 
    paddingVertical: 4, 
    borderRadius: 12, 
    alignSelf: 'flex-start',
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)'
  },
  reactionText: { fontSize: 12, fontWeight: 'bold', marginLeft: 6 },
  
  dateText: { color: '#666', fontSize: 12 },
  
  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  emptyTitle: { color: '#fff', fontSize: 20, fontWeight: 'bold', marginBottom: 8 },
  emptySubtitle: { color: '#666', fontSize: 15, textAlign: 'center', lineHeight: 22 }
});
