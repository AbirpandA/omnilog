import React, { useEffect, useState } from 'react';
import { StyleSheet, View, Text, FlatList, ActivityIndicator, Image, ListRenderItem } from 'react-native';
import { ThumbsDown, Meh, Sparkles, Star } from 'lucide-react-native';
import { GlassCard } from '../components/GlassCard';
import { getAllLogs, LogEntry, ReactionType } from '../db/queries';

// Map reactions to their specific icons and colors
const ReactionConfig: Record<ReactionType, { icon: React.ElementType, color: string, label: string }> = {
  'lame': { icon: ThumbsDown, color: '#ff4444', label: 'Lame' },
  'okay': { icon: Meh, color: '#aaaaaa', label: 'Okay' },
  'freaking': { icon: Sparkles, color: '#ffbb33', label: 'Freaking' },
  'Absolute cinema': { icon: Star, color: '#00C851', label: 'Absolute Cinema' }
};

export function LibraryScreen() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = () => {
    try {
      const data = getAllLogs();
      setLogs(data);
    } catch (error) {
      console.error("Failed to load logs:", error);
    } finally {
      setLoading(false);
    }
  };

  const renderItem: ListRenderItem<LogEntry> = ({ item }) => {
    const config = ReactionConfig[item.reaction] || ReactionConfig['okay'];
    const IconComponent = config.icon;

    return (
      <GlassCard style={styles.cardContainer}>
        <View style={styles.cardContent}>
          {item.posterUri ? (
            <Image source={{ uri: item.posterUri }} style={styles.poster} />
          ) : (
            <View style={[styles.poster, styles.placeholderPoster]}>
              <Text style={styles.placeholderText}>No Image</Text>
            </View>
          )}
          
          <View style={styles.textInfo}>
            <Text style={styles.title} numberOfLines={1}>{item.title}</Text>
            <Text style={styles.subtitle}>{item.type} {item.releaseYear ? `• ${item.releaseYear}` : ''}</Text>
            
            <View style={styles.reactionPill}>
              <IconComponent color={config.color} size={16} />
              <Text style={[styles.reactionText, { color: config.color }]}>
                {config.label}
              </Text>
            </View>
          </View>
        </View>
      </GlassCard>
    );
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color="#ffffff" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.header}>My Library</Text>
      {logs.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>No media logged yet.</Text>
        </View>
      ) : (
        <FlatList
          data={logs}
          keyExtractor={(item) => item.reactionId.toString()}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#050505',
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#ffffff',
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 20,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 40,
  },
  cardContainer: {
    marginBottom: 16,
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  poster: {
    width: 60,
    height: 90,
    borderRadius: 8,
    backgroundColor: '#222',
  },
  placeholderPoster: {
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#333',
  },
  placeholderText: {
    color: '#666',
    fontSize: 10,
  },
  textInfo: {
    flex: 1,
    marginLeft: 16,
    justifyContent: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#888888',
    marginBottom: 12,
  },
  reactionPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    alignSelf: 'flex-start',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 12,
  },
  reactionText: {
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 6,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    color: '#666666',
    fontSize: 16,
  }
});
