import React, { useState } from 'react';
import { StyleSheet, View, Text, TextInput, FlatList, TouchableOpacity, Alert } from 'react-native';
import { Search, Plus } from 'lucide-react-native';
import { GlassCard } from '../components/GlassCard';
import { insertLog } from '../db/queries';

const MOCK_SEARCH_RESULTS = [
  { id: 'tt1', title: 'Her', year: '2013' },
  { id: 'tt2', title: 'Lost in Translation', year: '2003' },
  { id: 'tt3', title: 'In the Mood for Love', year: '2000' }
];

export function SearchScreen() {
  const [query, setQuery] = useState('');

  const handleAddLog = (media: any) => {
    try {
      insertLog(
        { id: media.id, title: media.title, type: 'movie', posterUri: '', releaseYear: media.year, runtime: '120', director: 'Unknown' },
        'freaking'
      );
      Alert.alert('Success', `Logged "${media.title}" as Freaking!`);
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'Failed to log media');
    }
  };

  const renderItem = ({ item }: { item: any }) => (
    <GlassCard style={styles.cardContainer}>
      <View style={styles.cardHeader}>
        <View>
          <Text style={styles.cardTitle}>{item.title}</Text>
          <Text style={styles.cardYear}>{item.year}</Text>
        </View>
        <TouchableOpacity onPress={() => handleAddLog(item)} style={styles.addButton}>
          <Plus color="#ffffff" size={24} />
        </TouchableOpacity>
      </View>
    </GlassCard>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Search color="#ffffff" size={32} />
        <Text style={styles.title}>Search</Text>
      </View>

      <View style={styles.searchBar}>
        <TextInput 
          style={styles.searchInput}
          placeholder="Search for movies, TV shows, or books..."
          placeholderTextColor="#888888"
          value={query}
          onChangeText={setQuery}
        />
      </View>

      <FlatList
        data={MOCK_SEARCH_RESULTS}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContainer}
      />
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
  searchBar: {
    paddingHorizontal: 24,
    marginBottom: 20,
  },
  searchInput: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    color: '#ffffff',
    padding: 16,
    borderRadius: 12,
    fontSize: 16,
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
  cardYear: {
    color: '#aaaaaa',
    marginTop: 4,
  },
  addButton: {
    padding: 8,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 8,
  }
});
