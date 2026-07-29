import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { Feather, Ionicons } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import * as SecureStore from 'expo-secure-store';
import * as FileSystem from 'expo-file-system';
import { SECURE_KEY_ALIAS, COLORS } from '../config/constants';
import { requestSandboxChat, requestGeminiRouting } from '../services/api';

export default function Chat() {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState([
    { role: 'model', content: "Hello! I'm ready to dive into the data. What are we focusing on today?" }
  ]);
  const [loading, setLoading] = useState(false);
  const [recording, setRecording] = useState(null);
  const [isRecording, setIsRecording] = useState(false);

  const handleSend = async (customText = null) => {
    const textToSend = customText || input;
    if (!textToSend.trim() || loading) return;
    setInput('');
    const history = [...messages, { role: 'user', content: textToSend }];
    setMessages(history);
    setLoading(true);

    try {
      const apiKey = await SecureStore.getItemAsync(SECURE_KEY_ALIAS);
      if (!apiKey) throw new Error("API ключ не задан");
      const reply = await requestSandboxChat(textToSend, apiKey, messages);
      setMessages([...history, { role: 'model', content: reply }]);
    } catch (e) {
      setMessages([...history, { role: 'model', content: `Ошибка: ${e.message}` }]);
    } finally {
      setLoading(false);
    }
  };

  const toggleVoiceInput = async () => {
    if (isRecording) {
      try {
        setIsRecording(false);
        await recording.stopAndUnloadAsync();
        await Audio.setAudioModeAsync({ allowsRecordingIOS: false });
        const uri = recording.getURI();
        const base64Audio = await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 });
        setRecording(null);
        
        setLoading(true);
        const apiKey = await SecureStore.getItemAsync(SECURE_KEY_ALIAS);
        if (!apiKey) throw new Error("API ключ не задан");
        
        const routingResult = await requestGeminiRouting(null, base64Audio, apiKey);
        handleSend(`[Голосовой ввод]: ${routingResult.markdown}`);
      } catch (e) {
        Alert.alert("Ошибка распознавания", e.message);
        setRecording(null);
        setIsRecording(false);
        setLoading(false);
      }
    } else {
      try {
        const permission = await Audio.requestPermissionsAsync();
        if (permission.status !== 'granted') return;
        await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
        const { recording: newRecording } = await Audio.Recording.createAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
        setRecording(newRecording);
        setIsRecording(true);
      } catch (e) {}
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Gemini Chat</Text>
        <TouchableOpacity>
          <Ionicons name="person-circle-outline" size={32} color={COLORS.accentSecondary} />
        </TouchableOpacity>
      </View>
      <ScrollView style={styles.chatBox} showsVerticalScrollIndicator={false}>
        {messages.map((m, idx) => (
          <View key={idx} style={[styles.bubble, m.role === 'user' ? styles.userBubble : styles.modelBubble]}>
            <Text style={styles.msgText}>{m.content}</Text>
          </View>
        ))}
        {loading && <ActivityIndicator color={COLORS.accentSecondary} style={{ marginVertical: 10 }} />}
      </ScrollView>
      <View style={styles.chipsRow}>
        <TouchableOpacity style={styles.suggestChip} onPress={() => handleSend("Сгенерируй Concept Map по последним заметкам")}>
          <Text style={styles.chipTxt}>Concept Map</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.suggestChip} onPress={() => handleSend("Сделай краткое резюме содержимого хранилища")}>
          <Text style={styles.chipTxt}>Summarize</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.suggestChip} onPress={() => handleSend("Извлеки ключевые задачи из контекста")}>
          <Text style={styles.chipTxt}>Extract Tasks</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.inputBar}>
        <TouchableOpacity style={styles.barIcon} onPress={() => handleSend()}>
          <Feather name="send" size={18} color={COLORS.accentSecondary} />
        </TouchableOpacity>
        <TextInput
          style={styles.barInput}
          placeholder={isRecording ? "Запись аудио..." : "Ask Gemini..."}
          placeholderTextColor={isRecording ? COLORS.danger : COLORS.textMuted}
          value={input}
          onChangeText={setInput}
        />
        <TouchableOpacity style={styles.barIcon} onPress={toggleVoiceInput}>
          <Feather name="mic" size={20} color={isRecording ? COLORS.danger : COLORS.textMuted} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bgPrimary, paddingHorizontal: 20, paddingTop: 10 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  title: { fontSize: 24, fontWeight: 'bold', color: COLORS.textPrimary },
  chatBox: { flex: 1 },
  bubble: { padding: 16, borderRadius: 18, marginBottom: 12, maxWidth: '85%' },
  userBubble: { backgroundColor: COLORS.accentPrimary, alignSelf: 'flex-end' },
  modelBubble: { backgroundColor: COLORS.surface, alignSelf: 'flex-start', borderWidth: 1, borderColor: COLORS.border },
  msgText: { color: COLORS.textPrimary, fontSize: 14, lineHeight: 20 },
  chipsRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  suggestChip: { backgroundColor: COLORS.surface, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 16, borderWidth: 1, borderColor: COLORS.border },
  chipTxt: { color: COLORS.textPrimary, fontSize: 12 },
  inputBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.surface, borderRadius: 25, paddingHorizontal: 15, paddingVertical: 8, borderWidth: 1, borderColor: COLORS.border, marginBottom: 15 },
  barInput: { flex: 1, color: COLORS.textPrimary, paddingHorizontal: 10, fontSize: 14 },
  barIcon: { padding: 4 }
});
