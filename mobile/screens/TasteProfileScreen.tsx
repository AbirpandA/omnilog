import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import { BarChart, User, Clapperboard, Flame, Hash, Sparkles, BookOpen, Trophy, Award, Lock } from 'lucide-react-native';
import { getAllLogs, LogEntry } from '../db/queries';
import { fetchMediaDetails } from '../api';
import { GlassCard } from '../components/GlassCard';
import { useQuery } from '@tanstack/react-query';

type Props = any;

export function TasteProfileScreen({ navigation }: Props) {
  const [logs, setLogs] = useState<LogEntry[]>([]);

  useFocusEffect(
    useCallback(() => {
      setLogs(getAllLogs());
    }, [])
  );

  const fetchLogDetails = async () => {
    // Only analyze top rated movies for taste profile to avoid massive API calls
    const topLogs = logs.filter(l => l.reaction === 'pure gold' || l.reaction === 'Absolute cinema');
    // Fetch details for up to 10 top movies
    const detailed = await Promise.all(
      topLogs.slice(0, 10).map(l => fetchMediaDetails(l.mediaId).catch(() => null))
    );
    return detailed.filter(d => d !== null) as any[];
  };

  const { data: logDetails, isLoading } = useQuery({
    queryKey: ['taste_profile', logs.length],
    queryFn: fetchLogDetails,
    enabled: logs.length > 0
  });

  const generatePersona = (details: any[]) => {
    if (!details || details.length === 0) return "The Blank Slate";
    
    let genreCounts: Record<string, number> = {};
    details.forEach(d => {
      d.genres.forEach((g: string) => {
        genreCounts[g] = (genreCounts[g] || 0) + 1;
      });
    });
    
    const sortedGenres = Object.entries(genreCounts).sort((a, b) => b[1] - a[1]);
    const topGenre = sortedGenres.length > 0 ? sortedGenres[0][0] : "";
    const secondGenre = sortedGenres.length > 1 ? sortedGenres[1][0] : "";

    if (topGenre === "Science Fiction") return "Futuristic Voyager";
    if (topGenre === "Drama") return "Deep Thinker";
    if (topGenre === "Action") return "Adrenaline Junkie";
    if (topGenre === "Horror") return "Thrill Seeker";
    if (topGenre === "Comedy") return "The Entertainer";
    if (topGenre === "Romance") return "Hopeless Romantic";
    if (topGenre === "Documentary") return "Truth Seeker";
    
    if (topGenre && secondGenre) return `${topGenre} & ${secondGenre} Fanatic`;
    if (topGenre) return `${topGenre} Enthusiast`;
    return "Cinephile";
  };

  // Badge Logic
  const hasFirstStep = logs.length >= 1;
  const hasMasterCritic = logs.filter(l => l.reaction === 'Absolute cinema').length >= 5;
  const hasJournalist = logs.filter(l => l.notes && l.notes.trim().length > 0).length >= 5;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <User color="#ffffff" size={32} />
        <Text style={styles.title}>Taste Profile</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        
        {/* STATS ROW */}
        <View style={styles.statsRow}>
          <GlassCard style={styles.statCard}>
            <Clapperboard color="#b829ea" size={24} style={{marginBottom: 8}} />
            <Text style={styles.statValue}>{logs.length}</Text>
            <Text style={styles.statLabel}>Total Logged</Text>
          </GlassCard>
          
          <GlassCard style={styles.statCard}>
            <Flame color="#ffbb33" size={24} style={{marginBottom: 8}} />
            <Text style={styles.statValue}>
              {logs.filter(l => l.reaction === 'Absolute cinema').length}
            </Text>
            <Text style={styles.statLabel}>Absolute Cinema</Text>
          </GlassCard>
        </View>

        {isLoading ? (
          <View style={styles.loaderContainer}>
            <ActivityIndicator size="large" color="#b829ea" />
            <Text style={styles.loaderText}>Analyzing your cinematic DNA...</Text>
          </View>
        ) : logDetails && logDetails.length > 0 ? (
          <>
            {/* PERSONA CARD */}
            <GlassCard style={styles.personaCard}>
              <View style={styles.personaHeader}>
                <Sparkles color="#00C851" size={24} />
                <Text style={styles.personaTitle}>Your Persona</Text>
              </View>
              <Text style={styles.personaValue}>{generatePersona(logDetails)}</Text>
              <Text style={styles.personaDesc}>Based on the movies you rated highest.</Text>
            </GlassCard>

            {/* BADGES ROW */}
            <View style={{ marginBottom: 24 }}>
              <View style={styles.personaHeader}>
                <Trophy color="#fff" size={24} />
                <Text style={[styles.personaTitle, { fontSize: 22 }]}>Achievements</Text>
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ overflow: 'visible' }}>
                
                {/* Badge 1 */}
                <View style={[styles.badgeContainer, !hasFirstStep && styles.badgeLocked]}>
                  {hasFirstStep ? <Award color="#b829ea" size={32} /> : <Lock color="#666" size={24} />}
                  <Text style={styles.badgeTitle}>First Step</Text>
                  <Text style={styles.badgeDesc}>Log your 1st film</Text>
                </View>

                {/* Badge 2 */}
                <View style={[styles.badgeContainer, !hasMasterCritic && styles.badgeLocked]}>
                  {hasMasterCritic ? <Award color="#00C851" size={32} /> : <Lock color="#666" size={24} />}
                  <Text style={styles.badgeTitle}>Master Critic</Text>
                  <Text style={styles.badgeDesc}>5 Absolute Cinemas</Text>
                </View>

                {/* Badge 3 */}
                <View style={[styles.badgeContainer, !hasJournalist && styles.badgeLocked]}>
                  {hasJournalist ? <Award color="#ffbb33" size={32} /> : <Lock color="#666" size={24} />}
                  <Text style={styles.badgeTitle}>Journalist</Text>
                  <Text style={styles.badgeDesc}>5 Journal Entries</Text>
                </View>

              </ScrollView>
            </View>

            {/* CINEMATIC JOURNAL FEED */}
            <View style={{ marginTop: 16 }}>
              <View style={styles.personaHeader}>
                <BookOpen color="#fff" size={24} />
                <Text style={[styles.personaTitle, { fontSize: 22 }]}>Cinematic Journal</Text>
              </View>
              {logs.filter(l => l.notes && l.notes.trim().length > 0).length > 0 ? (
                logs.filter(l => l.notes && l.notes.trim().length > 0).map(log => (
                  <GlassCard key={log.reactionId} style={styles.journalEntryCard}>
                    <Text style={styles.journalMovieTitle}>{log.title}</Text>
                    <Text style={styles.journalDate}>{new Date(log.updated_at).toLocaleDateString()}</Text>
                    <Text style={styles.journalNotes}>{log.notes}</Text>
                  </GlassCard>
                ))
              ) : (
                <GlassCard style={styles.journalCard}>
                  <Text style={styles.journalPlaceholder}>
                    You haven't written any journal entries yet. Go to a movie details screen and add your thoughts!
                  </Text>
                </GlassCard>
              )}
            </View>
          </>
        ) : (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>Rate some movies to generate your Taste Profile!</Text>
          </View>
        )}

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#050505' },
  header: { flexDirection: 'row', alignItems: 'center', padding: 24, paddingTop: 60, paddingBottom: 16 },
  title: { fontSize: 32, fontWeight: 'bold', color: '#ffffff', marginLeft: 12 },
  
  content: { padding: 24, paddingBottom: 100 },
  
  statsRow: { flexDirection: 'row', gap: 16, marginBottom: 24 },
  statCard: { flex: 1, padding: 20, alignItems: 'center', borderRadius: 24 },
  statValue: { fontSize: 32, fontWeight: 'bold', color: '#fff' },
  statLabel: { fontSize: 12, color: '#aaa', marginTop: 4, fontWeight: '600' },
  
  loaderContainer: { marginTop: 60, alignItems: 'center' },
  loaderText: { color: '#b829ea', marginTop: 16, fontWeight: '600' },
  
  personaCard: { padding: 24, borderRadius: 24, marginBottom: 24, borderWidth: 1, borderColor: 'rgba(0, 200, 81, 0.2)' },
  personaHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  personaTitle: { color: '#fff', fontSize: 18, fontWeight: 'bold', marginLeft: 8 },
  personaValue: { fontSize: 28, fontWeight: '800', color: '#00C851', marginBottom: 8 },
  personaDesc: { color: '#888', fontSize: 14 },

  badgeContainer: { 
    width: 120, 
    height: 120, 
    marginRight: 16, 
    backgroundColor: 'rgba(255,255,255,0.05)', 
    borderRadius: 20, 
    borderWidth: 1, 
    borderColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12
  },
  badgeLocked: { opacity: 0.5, borderColor: '#333' },
  badgeTitle: { color: '#fff', fontSize: 14, fontWeight: 'bold', marginTop: 12, textAlign: 'center' },
  badgeDesc: { color: '#888', fontSize: 10, marginTop: 4, textAlign: 'center' },
  
  journalCard: { padding: 24, borderRadius: 24, borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.1)' },
  journalPlaceholder: { color: '#aaa', fontSize: 14, fontStyle: 'italic', lineHeight: 22, textAlign: 'center' },
  
  journalEntryCard: { padding: 20, borderRadius: 20, marginBottom: 16, borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.1)' },
  journalMovieTitle: { color: '#fff', fontSize: 18, fontWeight: 'bold', marginBottom: 4 },
  journalDate: { color: '#888', fontSize: 12, marginBottom: 12 },
  journalNotes: { color: '#ddd', fontSize: 15, lineHeight: 22 },
  
  emptyContainer: { marginTop: 60, alignItems: 'center' },
  emptyText: { color: '#888', fontSize: 16, textAlign: 'center' }
});
