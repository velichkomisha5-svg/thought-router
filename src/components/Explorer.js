import React, { useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ScrollView, Alert, Image } from 'react-native';
import * as FileSystem from 'expo-file-system';
import { writeAtomic, FIXED_CATEGORIES, RESERVED_NAMES } from '../services/storage';

export default function Explorer({ setView }) {
  const [currentFolder, setCurrentFolder] = useState(null);
  const [filesInFolder, setFilesInFolder] = useState([]);
  const [viewingFile, setViewingFile] = useState(null);
  const [fileContent, setFileContent] = useState('');
  const [folderCreating, setFolderCreating] = useState(false);
  const [fileCreating, setFileCreating] = useState(false);

  const openFolder = async (folder) => {
    try {
      const files = await FileSystem.readDirectoryAsync(`${FileSystem.documentDirectory}${folder}/`);
      setFilesInFolder(files.filter(f => f.endsWith('.md') || f.endsWith('.txt')));
      setCurrentFolder(folder);
    } catch (e) { setCurrentFolder(folder); setFilesInFolder([]); }
  };

  const openFile = async (file) => {
    const content = await FileSystem.readAsStringAsync(`${FileSystem.documentDirectory}${currentFolder}/${file}`);
    setFileContent(content); setViewingFile(file);
  };

  const deleteFile = async (file) => {
    Alert.alert("Удаление", "Удалить файл?", [
      { text: "Отмена" },
      { text: "Удалить", onPress: async () => {
        await FileSystem.deleteAsync(`${FileSystem.documentDirectory}${currentFolder}/${file}`);
        setViewingFile(null); openFolder(currentFolder);
      }}
    ]);
  };

  const createManualFolder = async (name) => {
    if (folderCreating || !name || !name.trim()) return;
    const sanitized = name.replace(/[^a-zA-Zа-яА-Я0-9\s-]/g, '').trim();
    if (RESERVED_NAMES.includes(sanitized.toLowerCase())) { Alert.alert("Ошибка", "Зарезервировано"); return; }
    setFolderCreating(true);
    try {
      await FileSystem.makeDirectoryAsync(`${FileSystem.documentDirectory}${sanitized}/`, { intermediates: true });
      openFolder(sanitized);
    } finally { setFolderCreating(false); }
  };

  const createManualFile = async (title) => {
    if (fileCreating || !title || !title.trim()) return;
    const path = `${FileSystem.documentDirectory}${currentFolder}/${title}.md`;
    if ((await FileSystem.getInfoAsync(path)).exists) { Alert.alert("Ошибка", "Уже есть"); return; }
    setFileCreating(true);
    try {
      await writeAtomic(path, "# " + title);
      openFolder(currentFolder);
    } finally { setFileCreating(false); }
  };

  const renderMarkdown = (content) => {
    const regex = /!\[\[\.\.\/attachments\/(.+?)\]\]/g;
    const parts = []; let lastIndex = 0; let match;
    while ((match = regex.exec(content)) !== null) {
      if (content.substring(lastIndex, match.index)) parts.push(<Text key={lastIndex} style={styles.text}>{content.substring(lastIndex, match.index)}</Text>);
      parts.push(<Image key={match.index} source={{ uri: `${FileSystem.documentDirectory}attachments/${match[1]}` }} style={styles.img} resizeMode="contain" />);
      lastIndex = regex.lastIndex;
    }
    if (content.substring(lastIndex)) parts.push(<Text key={lastIndex} style={styles.text}>{content.substring(lastIndex)}</Text>);
    return parts;
  };

  return (
    <View>
      <TouchableOpacity style={styles.backBtn} onPress={() => setView('dashboard')}><Text style={styles.backBtnText}>← Меню</Text></TouchableOpacity>
      {!currentFolder ? (
        <View>
          {FIXED_CATEGORIES.map(f => (
            <TouchableOpacity key={f} style={styles.item} onPress={() => openFolder(f)}><Text style={styles.itemText}>📁 {f}</Text></TouchableOpacity>
          ))}
          <TouchableOpacity style={styles.btn} onPress={() => Alert.prompt("Папка", "Имя", createManualFolder)}><Text style={styles.btnText}>+ Создать папку</Text></TouchableOpacity>
        </View>
      ) : !viewingFile ? (
        <View>
          <TouchableOpacity style={styles.backBtn} onPress={() => setCurrentFolder(null)}><Text style={styles.backBtnText}>← Папки</Text></TouchableOpacity>
          {filesInFolder.map(f => (
            <TouchableOpacity key={f} style={styles.item} onPress={() => openFile(f)}><Text style={styles.itemText}>📄 {f}</Text></TouchableOpacity>
          ))}
          <TouchableOpacity style={styles.btn} onPress={() => Alert.prompt("Файл", "Имя", createManualFile)}><Text style={styles.btnText}>+ Создать файл</Text></TouchableOpacity>
        </View>
      ) : (
        <View>
          <TouchableOpacity style={styles.backBtn} onPress={() => setViewingFile(null)}><Text style={styles.backBtnText}>← Файлы</Text></TouchableOpacity>
          <ScrollView style={styles.viewer}>{renderMarkdown(fileContent)}</ScrollView>
          <TouchableOpacity style={styles.delBtn} onPress={() => deleteFile(viewingFile)}><Text style={styles.btnText}>Удалить заметку</Text></TouchableOpacity>
        </View>
      )}
    </View>
  );
}
const styles = StyleSheet.create({
  backBtn: { alignSelf: 'flex-start', padding: 8, backgroundColor: '#3B2363', borderRadius: 8, marginBottom: 15 },
  backBtnText: { color: '#A78BFA', fontWeight: 'bold' },
  item: { backgroundColor: '#1E1135', padding: 15, borderRadius: 12, marginBottom: 10 },
  itemText: { color: '#DDD6FE', fontSize: 16 },
  btn: { backgroundColor: '#7C3AED', padding: 15, borderRadius: 12, alignItems: 'center' },
  btnText: { color: '#fff', fontWeight: 'bold' },
  viewer: { backgroundColor: '#1E1135', padding: 15, borderRadius: 15, minHeight: 150 },
  text: { color: '#EDE9FE', fontSize: 14, lineHeight: 20 },
  img: { width: '100%', height: 300, marginVertical: 15 },
  delBtn: { backgroundColor: '#FF3B30', padding: 15, borderRadius: 12, alignItems: 'center', marginTop: 15 }
});
