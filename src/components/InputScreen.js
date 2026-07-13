import React, { useState } from 'react';
import { StyleSheet, Text, View, TextInput, Switch, TouchableOpacity, ActivityIndicator, Alert, Keyboard } from 'react-native';
import { useSettings } from '../context/SettingsContext';
import { useCalendar } from '../context/CalendarContext';
import { useFinance } from '../context/FinanceContext';
import { requestGeminiRouting, requestImagenGeneration } from '../services/api';
import { writeAtomic, FIXED_CATEGORIES } from '../services/storage';
import { createCalendarEvent } from '../services/calendar';
import * as FileSystem from 'expo-file-system';
import { Audio } from 'expo-av';

export default function InputScreen({ setView }) {
  const { apiKey } = useSettings();
  const { selectedCalendarId } = useCalendar();
  const { addTransaction } = useFinance();
  
  const [text, setText] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [generateVisual, setGenerateVisual] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingStatus, setLoadingStatus] = useState('');
  
  const [recording, setRecording] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [audioBase64, setAudioBase64] = useState(null);

  const startRecording = async () => {
    try {
      const permission = await Audio.requestPermissionsAsync();
      if (permission.status !== 'granted') return;
      await Audio.setAudioModeAsync({ allowsRecordingIOS: false });
      await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true, staysActiveInBackground: false });
      const rec = new Audio.Recording();
      await rec.prepareToRecordAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
      await rec.startAsync();
      setRecording(rec); setIsRecording(true); setAudioBase64(null);
    } catch (e) { Alert.alert("Ошибка", e.message); }
  };

  const stopRecording = async () => {
    if (!recording) return;
    setIsRecording(false);
    await recording.stopAndUnloadAsync();
    const base64 = await FileSystem.readAsStringAsync(recording.getURI(), { encoding: FileSystem.EncodingType.Base64 });
    setAudioBase64(base64); setRecording(null);
  };

  const handleProcess = async () => {
    if (!apiKey) { Alert.alert("Ошибка", "Нет API ключа"); return; }
    if (!text.trim() && !audioBase64) return;
    setLoading(true); Keyboard.dismiss();

    try {
      setLoadingStatus("Анализ ИИ...");
      const res = await requestGeminiRouting(text, audioBase64, apiKey);
      const finalCategory = selectedCategory || res.category;
      
      if (res.isFinance && res.finance) {
        setLoadingStatus("Запись транзакции...");
        const entry = { ...res.finance, date: new Date().toLocaleDateString('ru-RU'), note: res.finance.note || text.trim() };
        await addTransaction(entry, { isSubscription: res.isSubscription });
      } else {
        setLoadingStatus("Сохранение заметки...");
        let md = res.markdown;
        if (generateVisual && res.visualPrompt) {
          const imgBytes = await requestImagenGeneration(res.visualPrompt, apiKey);
          const imgName = `${finalCategory}_${Date.now()}.png`;
          await writeAtomic(`${FileSystem.documentDirectory}attachments/${imgName}`, imgBytes, FileSystem.EncodingType.Base64);
          md += `\n\n### Схема\n![[../attachments/${imgName}]]`;
        }
        await FileSystem.makeDirectoryAsync(`${FileSystem.documentDirectory}${finalCategory}/`, { intermediates: true });
        await writeAtomic(`${FileSystem.documentDirectory}${finalCategory}/${finalCategory}_Note_${Date.now()}.md`, md);
      }

      if (res.reminder && res.reminder.needed && selectedCalendarId) {
        await createCalendarEvent(selectedCalendarId, res.reminder);
      }
      setText(''); setAudioBase64(null); Alert.alert("Успешно", "Данные маршрутизированы");
    } catch (e) { Alert.alert("Ошибка", e.message); }
    finally { setLoading(false); setLoadingStatus(''); }
  };

  return (
    <View>
      <TouchableOpacity style={styles.backBtn} onPress={() => setView('dashboard')}><Text style={styles.backBtnText}>← В меню</Text></TouchableOpacity>
      <TextInput style={styles.input} placeholder="Запишите мысль..." placeholderTextColor="#A78BFA" multiline value={text} onChangeText={setText} />
      <TouchableOpacity style={[styles.audioBtn, isRecording && styles.recording]} onPress={isRecording ? stopRecording : startRecording}>
        <Text style={styles.btnText}>{isRecording ? "⏹ Остановить запись" : "🎙 Записать голос"}</Text>
      </TouchableOpacity>
      <View style={styles.folderGrid}>
        {FIXED_CATEGORIES.map(f => (
          <TouchableOpacity key={f} onPress={() => setSelectedCategory(f)} style={[styles.folderChip, selectedCategory === f && styles.folderChipActive]}><Text style={styles.chipText}>{f}</Text></TouchableOpacity>
        ))}
      </View>
      <View style={styles.switchRow}><Text style={styles.label}>Генерация концепт-карты (Imagen 3)</Text><Switch value={generateVisual} onValueChange={setGenerateVisual} /></View>
      <TouchableOpacity style={styles.mainBtn} onPress={handleProcess} disabled={loading}>
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.mainBtnText}>Маршрутизировать</Text>}
      </TouchableOpacity>
    </View>
  );
}
const styles = StyleSheet.create({
  backBtn: { alignSelf: 'flex-start', padding: 8, backgroundColor: '#3B2363', borderRadius: 8, marginBottom: 15 },
  backBtnText: { color: '#A78BFA', fontWeight: 'bold' },
  input: { backgroundColor: '#1E1135', color: '#fff', padding: 15, borderRadius: 15, height: 120, marginBottom: 15 },
  audioBtn: { backgroundColor: '#4C1D95', padding: 15, borderRadius: 15, alignItems: 'center', marginBottom: 20 },
  recording: { backgroundColor: '#BE185D' },
  btnText: { color: '#fff', fontWeight: 'bold' },
  folderGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 },
  folderChip: { backgroundColor: '#2E1065', padding: 10, borderRadius: 10 },
  folderChipActive: { backgroundColor: '#8B5CF6' },
  chipText: { color: '#fff' },
  switchRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 15 },
  label: { color: '#A78BFA' },
  mainBtn: { backgroundColor: '#7C3AED', padding: 16, borderRadius: 15, alignItems: 'center' },
  mainBtnText: { color: '#fff', fontWeight: 'bold' }
});
