import React, { useState } from 'react';
import { StyleSheet, View, Text, FlatList, ActivityIndicator, TouchableOpacity } from 'react-native';
import { Sparkles, Compass } from 'lucide-react-native';
import { GlassCard } from '../components/GlassCard';
import { fetchRecommendations, RecommendResponse } from '../api/index';

export function DiscoverScreen() {
  const [recommendations, setRecommendations] = useState<RecommendResponse[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  const handleDiscover = async () => {
    setLoading(true);
    try {
      // Mocking the scenario: User loved "Her" (tt1) and "Lost in Translation" (tt2)
      const results = await fetchRecommendations(['tt1', 'tt2']);
      setRecommendations(results);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const renderItem = ({ item }: { item: RecommendResponse }) => (
    <GlassCard style={styles.cardContainer}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle}>{item.title}</Text>
        <Text style={styles.scoreText}>{(item.similarity_score * 100).toFixed(0)}% Match</Text>
      </View>
    </GlassCard>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Compass color="#ffffff" size={32} />
        <Text style={styles.title}>Discover</Text>
      </View>
      
      <Text style={styles.subtitle}>
        Based on your love for "Her" and "Lost in Translation"
      </Text>

      <TouchableOpacity 
        style={styles.discoverButton} 
        onPress={handleDiscover}
        disabled={loading}
      >
        <Sparkles color="#ffffff" size={20} />
        <Text style={styles.discoverButtonText}>Find My Vibe</Text>
      </TouchableOpacity>

      {loading ? (
        <ActivityIndicator size="large" color="#ffffff" style={styles.loader} />
      ) : (
        <FlatList
          data={recommendations}
          keyExtractor={(item) => item.media_id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContainer}
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 24,
    paddingTop: 60,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#ffffff',
    marginLeft: 12,
  },
  subtitle: {
    color: '#aaaaaa',
    fontSize: 16,
    paddingHorizontal: 24,
    marginBottom: 20,
  },
  discoverButton: {
    backgroundColor: '#00C851',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    marginHorizontal: 24,
    borderRadius: 12,
    marginBottom: 20,
  },
  discoverButtonText: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 18,
    marginLeft: 8,
  },
  loader: {
    marginTop: 40,
  },
  listContainer: {
    padding: 16,
  },
  cardContainer: {
    padding: 16,
    marginBottom: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  scoreText: {
    color: '#00C851',
    fontWeight: 'bold',
  }
});
