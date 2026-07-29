import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons, Feather } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system';
import { COLORS } from '../config/constants';

const VAULT_PATH = `${FileSystem.documentDirectory}ObsidianVault/`;
const FRONTMATTER_REGEX = /^---\n([\s\S]*?)\n---\n/;

export default function Dashboard({ onNavigate }) {
  const [recentThoughts, setRecentThoughts] = useState([]);

  useEffect(() => {
    loadRecentFiles();
  }, []);

  const parseFile = async (filePath, fileName, tag) => {
    const fileStats = await FileSystem.getInfoAsync(filePath);
    const content = await FileSystem.readAsStringAsync(filePath);
    const cleanContent = content.replace(FRONTMATTER_REGEX, '').trim();
    const firstLineMatch = cleanContent.match(/^(?:#\s)?(.+)$/m);
    const displayTitle = firstLineMatch ? firstLineMatch[1].trim() : fileName;

    return {
      id: filePath,
      title: displayTitle,
      time: new Date(fileStats.modificationTime * 1000).toLocaleString('en-GB', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: 'short' }),
      modTime: fileStats.modificationTime,
      tag: tag,
      text: cleanContent.replace(/^(?:#\s)?(.+)$/m, '').trim() || 'No preview available'
    };
  };

  const loadRecentFiles = async () => {
    try {
      const rootInfo = await FileSystem.getInfoAsync(VAULT_PATH);
      if (!rootInfo.exists) return;

      const items = await FileSystem.readDirectoryAsync(VAULT_PATH);
      let allFiles = [];

      for (const item of items) {
        const itemPath = `${VAULT_PATH}${item}`;
        const itemInfo = await FileSystem.getInfoAsync(itemPath);
        
        if (itemInfo.isDirectory) {
          const folderPath = `${itemPath}/`;
          const files = await FileSystem.readDirectoryAsync(folderPath);
          for (const f of files) {
            if (f.endsWith('.md')) {
              allFiles.push(await parseFile(`${folderPath}${f}`, f, item.toUpperCase()));
            }
          }
        } else if (item.endsWith('.md')) {
          allFiles.push(await parseFile(itemPath, item, 'ROOT'));
        }
      }

      allFiles.sort((a, b) => b.modTime - a.modTime);
      setRecentThoughts(allFiles.slice(0, 5));
    } catch (e) {}
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Dashboard</Text>
        <TouchableOpacity style={styles.profileBtn}>
          <Ionicons name="person-circle-outline" size={32} color={COLORS.accentSecondary} />
        </TouchableOpacity>
      </View>
      <View style={styles.statusContainer}>
        <View style={styles.statusBadge}>
          <View style={styles.statusDot} />
          <Text style={styles.statusText}>NEURAL SYNC ACTIVE</Text>
        </View>
      </View>
      <View style={styles.quickActions}>
        <TouchableOpacity style={[styles.actionCard, styles.actionPrimary]} onPress={() => onNavigate('INPUT')}>
          <Feather name="plus" size={24} color="#FFF" />
          <Text style={styles.actionTitle}>New Thought</Text>
          <Text style={styles.actionSub}>Capture idea</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionCard} onPress={() => onNavigate('AI')}>
          <Ionicons name="hardware-chip-outline" size={24} color={COLORS.accentSecondary} />
          <Text style={styles.actionTitle}>AI Sandbox</Text>
          <Text style={styles.actionSub}>Explore ideas</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Recent Thoughts</Text>
        <TouchableOpacity onPress={() => loadRecentFiles()}>
          <Ionicons name="refresh" size={18} color={COLORS.textMuted} />
        </TouchableOpacity>
      </View>
      <ScrollView style={styles.feed} showsVerticalScrollIndicator={false}>
        {recentThoughts.length === 0 ? (
          <Text style={styles.emptyText}>Локальное хранилище пусто</Text>
        ) : (
          recentThoughts.map((item) => (
            <View key={item.id} style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={styles.tagBadge}>
                  <Text style={styles.tagText}>{item.tag}</Text>
                </View>
                <Text style={styles.timeText}>{item.time}</Text>
              </View>
              <Text style={styles.cardTitle}>{item.title}</Text>
              <Text style={styles.cardBody} numberOfLines={2}>{item.text}</Text>
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bgPrimary, paddingHorizontal: 20, paddingTop: 10 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  title: { fontSize: 28, fontWeight: 'bold', color: COLORS.textPrimary },
  profileBtn: { padding: 4 },
  statusContainer: { alignItems: 'center', marginBottom: 20 },
  statusBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#064E3B', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  statusDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.success, marginRight: 6 },
  statusText: { color: COLORS.success, fontSize: 11, fontWeight: 'bold' },
  quickActions: { flexDirection: 'row', gap: 12, marginBottom: 25 },
  actionCard: { flex: 1, backgroundColor: COLORS.surface, padding: 18, borderRadius: 16, borderWidth: 1, borderColor: COLORS.border },
  actionPrimary: { backgroundColor: COLORS.accentPrimary },
  actionTitle: { fontSize: 16, fontWeight: 'bold', color: '#FFF', marginTop: 12 },
  actionSub: { fontSize: 12, color: COLORS.textPrimary, opacity: 0.8, marginTop: 2 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: COLORS.textPrimary },
  feed: { flex: 1 },
  emptyText: { color: COLORS.textMuted, textAlign: 'center', marginTop: 20 },
  card: { backgroundColor: COLORS.surface, padding: 16, borderRadius: 16, marginBottom: 12, borderWidth: 1, borderColor: COLORS.border },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  tagBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, backgroundColor: '#4C1D95' },
  tagText: { color: COLORS.textPrimary, fontSize: 10, fontWeight: 'bold' },
  timeText: { color: COLORS.textMuted, fontSize: 12 },
  cardTitle: { fontSize: 16, fontWeight: 'bold', color: COLORS.textPrimary, marginBottom: 6 },
  cardBody: { color: COLORS.textMuted, fontSize: 14, lineHeight: 20 }
});
