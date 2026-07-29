import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, TextInput, Image } from 'react-native';
import { Feather, Ionicons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system';
import { COLORS } from '../config/constants';

const VAULT_PATH = `${FileSystem.documentDirectory}ObsidianVault/`;

export default function Explorer() {
  const [items, setItems] = useState([]);
  const [search, setSearch] = useState('');
  const [currentFolder, setCurrentFolder] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [content, setContent] = useState('');

  useEffect(() => {
    if (currentFolder) {
      loadFiles(currentFolder);
    } else {
      loadFoldersAndRootFiles();
    }
  }, [currentFolder]);

  const loadFoldersAndRootFiles = async () => {
    try {
      const dirInfo = await FileSystem.getInfoAsync(VAULT_PATH);
      if (!dirInfo.exists) await FileSystem.makeDirectoryAsync(VAULT_PATH, { intermediates: true });
      const dirContents = await FileSystem.readDirectoryAsync(VAULT_PATH);
      
      let validItems = [];
      for (const item of dirContents) {
        const info = await FileSystem.getInfoAsync(`${VAULT_PATH}${item}`);
        if (info.isDirectory) {
          validItems.push({ name: item, isDir: true });
        } else if (item.endsWith('.md') || item.endsWith('.png')) {
          validItems.push({ name: item, isDir: false });
        }
      }
      setItems(validItems);
      setSelectedFile(null);
    } catch (e) {}
  };

  const loadFiles = async (folderName) => {
    try {
      const path = `${VAULT_PATH}${folderName}/`;
      const files = await FileSystem.readDirectoryAsync(path);
      setItems(files.filter(f => f.endsWith('.md') || f.endsWith('.png')).map(f => ({ name: f, isDir: false })));
    } catch (e) {}
  };

  const openFile = async (name) => {
    try {
      const path = currentFolder ? `${VAULT_PATH}${currentFolder}/${name}` : `${VAULT_PATH}${name}`;
      if (name.endsWith('.md')) {
        const text = await FileSystem.readAsStringAsync(path);
        setContent(text);
      } else {
        setContent(path);
      }
      setSelectedFile(name);
    } catch (e) {}
  };

  const handleBack = () => {
    setCurrentFolder(null);
    setSearch('');
    setSelectedFile(null);
    setContent('');
  };

  const handleFolderEntry = (folderName) => {
    setCurrentFolder(folderName);
    setSearch('');
    setSelectedFile(null);
    setContent('');
  };

  const filteredItems = items.filter(i => i.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        {currentFolder && (
          <TouchableOpacity onPress={handleBack} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color={COLORS.textPrimary} />
          </TouchableOpacity>
        )}
        <Text style={styles.header}>{currentFolder || 'Explorer'}</Text>
      </View>
      <View style={styles.searchCard}>
        <Feather name="search" size={18} color={COLORS.textMuted} style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Поиск..."
          placeholderTextColor={COLORS.textMuted}
          value={search}
          onChangeText={setSearch}
        />
        <Feather name="sliders" size={18} color={COLORS.textMuted} />
      </View>
      <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
        <Text style={styles.sectionTitle}>{currentFolder ? 'Files' : 'Directory'}</Text>
        <View style={styles.dirCard}>
          {filteredItems.map((item, idx) => (
            item.isDir ? (
              <TouchableOpacity key={idx} style={styles.folderRow} onPress={() => handleFolderEntry(item.name)}>
                <Ionicons name="folder" size={20} color={COLORS.accentSecondary} />
                <Text style={styles.folderName}>{item.name}</Text>
                <Feather name="chevron-right" size={18} color={COLORS.textMuted} style={{ marginLeft: 'auto' }} />
              </TouchableOpacity>
            ) : (
              <TouchableOpacity key={idx} style={styles.fileRow} onPress={() => openFile(item.name)}>
                <Feather name={item.name.endsWith('.png') ? "image" : "file-text"} size={16} color={COLORS.textMuted} />
                <Text style={styles.fileName}>{item.name}</Text>
              </TouchableOpacity>
            )
          ))}
          {filteredItems.length === 0 && <Text style={styles.emptyText}>Пусто</Text>}
        </View>
        {selectedFile && (
          <View style={styles.readerCard}>
            <View style={styles.readerHeader}>
              <Feather name={selectedFile.endsWith('.png') ? "image" : "file-text"} size={18} color={COLORS.accentSecondary} />
              <Text style={styles.readerTitle}>{selectedFile}</Text>
            </View>
            {selectedFile.endsWith('.png') ? (
              <Image source={{ uri: content }} style={styles.imagePreview} />
            ) : (
              <Text style={styles.readerText}>{content}</Text>
            )}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bgPrimary, paddingHorizontal: 20, paddingTop: 10 },
  headerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 15 },
  backBtn: { marginRight: 15 },
  header: { fontSize: 28, fontWeight: 'bold', color: COLORS.textPrimary },
  searchCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.surface, paddingHorizontal: 15, borderRadius: 14, borderWidth: 1, borderColor: COLORS.border, marginBottom: 20 },
  searchIcon: { marginRight: 10 },
  searchInput: { flex: 1, color: COLORS.textPrimary, paddingVertical: 12, fontSize: 14 },
  body: { flex: 1 },
  sectionTitle: { color: COLORS.textPrimary, fontSize: 16, fontWeight: 'bold', marginBottom: 10 },
  dirCard: { backgroundColor: COLORS.surface, borderRadius: 16, padding: 15, borderWidth: 1, borderColor: COLORS.border, marginBottom: 20 },
  folderRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#2D1D4A' },
  folderName: { color: COLORS.textPrimary, fontSize: 15, fontWeight: '600' },
  fileRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10 },
  fileName: { color: COLORS.textMuted, fontSize: 14 },
  emptyText: { color: COLORS.textMuted, textAlign: 'center', paddingVertical: 10 },
  readerCard: { backgroundColor: COLORS.surface, borderRadius: 18, padding: 20, borderWidth: 1, borderColor: COLORS.accentPrimary, marginBottom: 30 },
  readerHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 15 },
  readerTitle: { flex: 1, color: COLORS.textPrimary, fontSize: 16, fontWeight: 'bold' },
  readerText: { color: COLORS.textPrimary, fontSize: 14, lineHeight: 22 },
  imagePreview: { width: '100%', height: 300, resizeMode: 'contain', borderRadius: 12, marginTop: 10 }
});
