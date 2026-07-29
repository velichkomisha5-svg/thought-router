import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, Switch, ScrollView, ActivityIndicator } from 'react-native';
import { Audio } from 'expo-av';
import { Feather, Ionicons } from '@expo/vector-icons';
import * as SecureStore from 'expo-secure-store';
import * as FileSystem from 'expo-file-system';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { FIXED_CATEGORIES, SECURE_KEY_ALIAS, GOOGLE_TOKEN_ALIAS, WALLET_STORAGE_KEY, SUBSCRIPTIONS_STORAGE_KEY, COLORS } from '../config/constants';
import { requestGeminiRouting, requestImagenGeneration } from '../services/api';
import { createGoogleTask, createGoogleCalendarEvent } from '../services/google';

const VAULT_PATH = `${FileSystem.documentDirectory}ObsidianVault/`;

export default function InputScreen() {
  const [text, setText] = useState('');
  const [recording, setRecording] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(FIXED_CATEGORIES[0]);
  const [generateMap, setGenerateMap] = useState(false);
  const [loading, setLoading] = useState(false);

  const startRecording = async () => {
    try {
      const permission = await Audio.requestPermissionsAsync();
      if (permission.status !== 'granted') return;
      await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
      const { recording: newRecording } = await Audio.Recording.createAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
      setRecording(newRecording);
      setIsRecording(true);
    } catch (err) {}
  };

  const stopRecording = async () => {
    if (!recording) return;
    try {
      setIsRecording(false);
      await recording.stopAndUnloadAsync();
      await Audio.setAudioModeAsync({ allowsRecordingIOS: false });
      const uri = recording.getURI();
      const base64Audio = await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 });
      setRecording(null);
      processInput(null, base64Audio);
    } catch (err) {
      setRecording(null);
      setIsRecording(false);
    }
  };

  const saveFinance = async (financeData, isSubscription) => {
    try {
      const sign = financeData.type === 'income' ? '+' : '-';
      const storageKey = isSubscription ? SUBSCRIPTIONS_STORAGE_KEY : WALLET_STORAGE_KEY;
      
      const existing = await AsyncStorage.getItem(storageKey);
      const list = existing ? JSON.parse(existing) : [];
      
      const entry = {
        id: Date.now().toString(),
        title: financeData.item,
        amount: `${sign}${financeData.amount} ${financeData.currency}`,
        time: isSubscription ? `Billing: ${financeData.billing || 'N/A'}` : 'Just now',
        rawAmount: financeData.amount,
        type: financeData.type
      };
      
      await AsyncStorage.setItem(storageKey, JSON.stringify([entry, ...list]));
    } catch (e) {}
  };

  const processInput = async (inputText = text, audioBase64 = null) => {
    if (!inputText && !audioBase64) return;
    setLoading(true);
    let externalWarnings = "";

    try {
      const apiKey = await SecureStore.getItemAsync(SECURE_KEY_ALIAS);
      if (!apiKey) throw new Error("API ключ Gemini не настроен");

      const routingResult = await requestGeminiRouting(inputText, audioBase64, apiKey, selectedCategory);
      
      const fileName = `${Date.now()}_note.md`;
      let fileContent = routingResult.markdown;
      const targetCategory = routingResult.category || selectedCategory;
      const catPath = `${VAULT_PATH}${targetCategory}/`;

      if (generateMap && routingResult.visualPrompt) {
        try {
          const imageBytes = await requestImagenGeneration(routingResult.visualPrompt, apiKey);
          const imgPath = `${catPath}${Date.now()}_map.png`;
          await FileSystem.makeDirectoryAsync(catPath, { intermediates: true });
          await FileSystem.writeAsStringAsync(imgPath, imageBytes, { encoding: FileSystem.EncodingType.Base64 });
          fileContent += `\n\n![Concept Map](${imgPath})`;
        } catch (imgErr) {
          externalWarnings += "\n⚠️ Ошибка генерации карты (Imagen).";
        }
      }

      const dirInfo = await FileSystem.getInfoAsync(catPath);
      if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(catPath, { intermediates: true });
      }
      await FileSystem.writeAsStringAsync(`${catPath}${fileName}`, fileContent);

      if ((routingResult.isFinance || routingResult.isSubscription) && routingResult.finance) {
        await saveFinance(routingResult.finance, routingResult.isSubscription);
      }

      const googleToken = await SecureStore.getItemAsync(GOOGLE_TOKEN_ALIAS);
      if (googleToken) {
        if (routingResult.task?.title) {
          const tRes = await createGoogleTask(googleToken, routingResult.task.title, routingResult.task.dueDate);
          if (!tRes) externalWarnings += "\n⚠️ Не удалось создать Google Задачу.";
        }
        if (routingResult.calendarEvent?.summary) {
          const cRes = await createGoogleCalendarEvent(
            googleToken, 
            routingResult.calendarEvent.summary, 
            routingResult.calendarEvent.startTime, 
            routingResult.calendarEvent.endTime
          );
          if (!cRes) externalWarnings += "\n⚠️ Не удалось создать Google Событие.";
        }
      } else if (routingResult.task?.title || routingResult.calendarEvent?.summary) {
        externalWarnings += "\n⚠️ Требуется авторизация Google Sync для задач/календаря.";
      }

      Alert.alert("Обработано", `Сохранено в: ${targetCategory}${externalWarnings}`);
      setText('');
    } catch (err) {
      Alert.alert("Системная ошибка", err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <Text style={styles.header}>Быстрый ввод</Text>
      <View style={styles.waveformCard}>
        <View style={styles.waveVisualizer}>
          <Text style={styles.waveText}>{isRecording ? "••••••••••••••••••••••••••••••••••••••" : "--------------------------------------"}</Text>
        </View>
        <Text style={styles.recStatus}>{isRecording ? "LISTENING..." : ""}</Text>
        <TouchableOpacity style={[styles.micBtn, isRecording && styles.micBtnActive]} onPress={isRecording ? stopRecording : startRecording}>
          <Feather name="mic" size={28} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.micSubText}>Удерживайте или нажмите</Text>
      </View>
      <View style={styles.inputCard}>
        <TextInput
          style={styles.input}
          placeholder="Текст или сырые мысли..."
          placeholderTextColor={COLORS.textMuted}
          multiline
          value={text}
          onChangeText={setText}
        />
        <View style={styles.inputIcons}>
          <TouchableOpacity style={styles.iconBtn}><Ionicons name="keypad-outline" size={20} color={COLORS.textMuted} /></TouchableOpacity>
          <TouchableOpacity style={styles.iconBtn}><Feather name="paperclip" size={20} color={COLORS.textMuted} /></TouchableOpacity>
        </View>
      </View>
      <Text style={styles.sectionLabel}>ПРЕДПОЧТИТЕЛЬНАЯ КАТЕГОРИЯ</Text>
      <View style={styles.chipsRow}>
        {FIXED_CATEGORIES.map((cat) => (
          <TouchableOpacity key={cat} style={[styles.chip, selectedCategory === cat && styles.chipActive]} onPress={() => setSelectedCategory(cat)}>
            <Text style={[styles.chipText, selectedCategory === cat && styles.chipTextActive]}>{cat}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <View style={styles.toggleCard}>
        <View>
          <Text style={styles.toggleTitle}>Концепт-карта (Imagen 3)</Text>
          <Text style={styles.toggleSub}>Генерация PNG-схемы к заметке</Text>
        </View>
        <Switch
          value={generateMap}
          onValueChange={setGenerateMap}
          trackColor={{ false: COLORS.surface, true: COLORS.accentPrimary }}
          thumbColor={COLORS.textPrimary}
        />
      </View>
      <TouchableOpacity style={styles.submitBtn} onPress={() => processInput(text, null)} disabled={loading}>
        {loading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.submitText}>Синтезировать ✨</Text>}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bgPrimary, paddingHorizontal: 20 },
  header: { fontSize: 24, fontWeight: 'bold', color: COLORS.textPrimary, marginVertical: 15 },
  waveformCard: { backgroundColor: COLORS.surface, borderRadius: 20, padding: 20, alignItems: 'center', borderWidth: 1, borderColor: COLORS.border, marginBottom: 15 },
  waveVisualizer: { height: 40, justifyContent: 'center' },
  waveText: { color: COLORS.accentSecondary, letterSpacing: 2, fontSize: 16 },
  recStatus: { color: COLORS.textMuted, fontSize: 12, height: 16, marginBottom: 10 },
  micBtn: { width: 64, height: 64, borderRadius: 32, backgroundColor: COLORS.accentPrimary, justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  micBtnActive: { backgroundColor: COLORS.danger },
  micSubText: { color: COLORS.textMuted, fontSize: 12 },
  inputCard: { backgroundColor: COLORS.surface, borderRadius: 16, padding: 15, borderWidth: 1, borderColor: COLORS.border, marginBottom: 20 },
  input: { color: COLORS.textPrimary, fontSize: 15, minHeight: 100, textAlignVertical: 'top' },
  inputIcons: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 10 },
  iconBtn: { padding: 4 },
  sectionLabel: { color: COLORS.textMuted, fontSize: 11, fontWeight: 'bold', letterSpacing: 1, marginBottom: 10 },
  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 },
  chip: { backgroundColor: COLORS.surface, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, borderWidth: 1, borderColor: COLORS.border },
  chipActive: { backgroundColor: COLORS.accentPrimary, borderColor: COLORS.accentSecondary },
  chipText: { color: COLORS.textMuted, fontSize: 13, fontWeight: '500' },
  chipTextActive: { color: '#FFF', fontWeight: 'bold' },
  toggleCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: COLORS.surface, padding: 16, borderRadius: 16, borderWidth: 1, borderColor: COLORS.border, marginBottom: 20 },
  toggleTitle: { color: COLORS.textPrimary, fontSize: 15, fontWeight: 'bold' },
  toggleSub: { color: COLORS.textMuted, fontSize: 12, marginTop: 2 },
  submitBtn: { backgroundColor: COLORS.accentSecondary, paddingVertical: 18, borderRadius: 16, alignItems: 'center', marginBottom: 30 },
  submitText: { color: '#FFF', fontSize: 16, fontWeight: 'bold' }
});
