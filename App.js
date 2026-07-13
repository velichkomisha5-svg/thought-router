import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, Text, View, TextInput, Switch, TouchableOpacity, 
  ActivityIndicator, Alert, KeyboardAvoidingView, ScrollView, 
  TouchableWithoutFeedback, Keyboard, Platform 
} from 'react-native';
import * as FileSystem from 'expo-file-system';
import { Audio } from 'expo-av';

const GEMINI_API_KEY = "AQ.Ab8RN6JjHcuOOg-U0O5CQx9KD7FVjjKUVT70-HoVTK2sy5cgVg";

export default function App() {
  const [view, setView] = useState('input'); // 'input' или 'dashboard' или 'finance'
  const [text, setText] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [generateVisual, setGenerateVisual] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingStatus, setLoadingStatus] = useState('');
  const [financeLogs, setFinanceLogs] = useState([]);
  
  const [recording, setRecording] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [audioBase64, setAudioBase64] = useState(null);

  // Категории по умолчанию (можно дополнять)
  const [folders, setFolders] = useState(['Учеба', 'Работа', 'ПК', 'Здоровье', 'Финансы']);

  useEffect(() => {
    loadFolders();
  }, []);

  const loadFolders = async () => {
    const root = await FileSystem.readDirectoryAsync(FileSystem.documentDirectory);
    const filtered = root.filter(f => !f.includes('.') && f !== 'attachments');
    setFolders(Array.from(new Set([...folders, ...filtered])));
  };

  const loadFinance = async () => {
    const file = `${FileSystem.documentDirectory}Финансы/Журнал_Финансов.md`;
    const info = await FileSystem.getInfoAsync(file);
    if (info.exists) {
      const content = await FileSystem.readAsStringAsync(file);
      const lines = content.split('\n').filter(l => l.includes('|') && !l.includes('---') && !l.includes('Дата'));
      setFinanceLogs(lines.reverse().slice(0, 10)); // Последние 10 записей
    }
    setView('finance');
  };

  const startRecording = async () => {
    try {
      const permission = await Audio.requestPermissionsAsync();
      if (permission.status !== 'granted') return;
      await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
      const { recording } = await Audio.Recording.createAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
      setRecording(recording);
      setIsRecording(true);
    } catch (err) { Alert.alert("Ошибка", err.message); }
  };

  const stopRecording = async () => {
    setIsRecording(false);
    await recording.stopAndUnloadAsync();
    const base64 = await FileSystem.readAsStringAsync(recording.getURI(), { encoding: FileSystem.EncodingType.Base64 });
    setAudioBase64(base64);
    setRecording(null);
  };

  const handleProcess = async () => {
    if (!text.trim() && !audioBase64) return;
    setLoading(true);
    Keyboard.dismiss();

    try {
      const systemInstruction = `Analyze the input. If it's a financial transaction (spent, earned, price), set isFinance: true. 
      Otherwise false. Return strictly JSON:
      {
        "isFinance": boolean,
        "suggestedCategory": "String", 
        "markdown": "Note content with YAML",
        "visualPrompt": "Imagen 3 prompt",
        "finance": { "item": "string", "amount": number, "currency": "string" }
      }`;

      let body = { contents: [{ parts: [{ text: systemInstruction }] }], generationConfig: { responseMimeType: "application/json" } };
      if (audioBase64) body.contents[0].parts.push({ inlineData: { mimeType: "audio/m4a", data: audioBase64 } });
      else body.contents[0].parts.push({ text: `Input: "${text}"` });

      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      const data = await res.json();
      const result = JSON.parse(data.candidates[0].content.parts[0].text);
      
      const finalCategory = selectedCategory || result.suggestedCategory;
      const targetDir = `${FileSystem.documentDirectory}${finalCategory}/`;
      await FileSystem.makeDirectoryAsync(targetDir, { intermediates: true });

      if (result.isFinance) {
        const file = `${targetDir}Журнал_Финансов.md`;
        let content = (await FileSystem.getInfoAsync(file)).exists ? await FileSystem.readAsStringAsync(file) : "# Финансы\n| Дата | Предмет | Сумма |\n|---|---|---|\n";
        const newRow = `| ${new Date().toLocaleDateString()} | ${result.finance.item} | ${result.finance.amount} ${result.finance.currency} |\n`;
        await FileSystem.writeAsStringAsync(file, content + newRow);
        Alert.alert("Финансы учтены", `${result.finance.item}: ${result.finance.amount}`);
      } else {
        const fileName = `${finalCategory}_${Date.now()}.md`;
        await FileSystem.writeAsStringAsync(`${targetDir}${fileName}`, result.markdown);
        Alert.alert("Заметка сохранена", `Папка: ${finalCategory}`);
      }

      setText(''); setAudioBase64(null); setSelectedCategory(null); loadFolders();
    } catch (e) { Alert.alert("Ошибка", e.message); }
    finally { setLoading(false); }
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <View style={styles.container}>
        <Text style={styles.header}>Thought Router Pro</Text>

        {/* Навигация */}
        <View style={styles.nav}>
          <TouchableOpacity onPress={() => setView('input')} style={[styles.navBtn, view === 'input' && styles.navBtnActive]}>
            <Text style={styles.navText}>Ввод</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setView('dashboard')} style={[styles.navBtn, view === 'dashboard' && styles.navBtnActive]}>
            <Text style={styles.navText}>Папки</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={loadFinance} style={[styles.navBtn, view === 'finance' && styles.navBtnActive]}>
            <Text style={styles.navText}>Кошелек</Text>
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.scroll}>
          {view === 'input' && (
            <KeyboardAvoidingView behavior="padding">
              <TextInput
                style={styles.input}
                placeholder="Что на уме?"
                placeholderTextColor="#A78BFA"
                multiline
                value={text}
                onChangeText={setText}
              />
              
              <TouchableOpacity 
                style={[styles.audioBtn, isRecording && styles.recording]} 
                onPress={isRecording ? stopRecording : startRecording}
              >
                <Text style={styles.btnText}>{isRecording ? "⏹ Остановить" : "🎙 Записать голос"}</Text>
              </TouchableOpacity>

              <Text style={styles.label}>Куда отправить? (необязательно)</Text>
              <View style={styles.folderGrid}>
                {folders.map(f => (
                  <TouchableOpacity 
                    key={f} 
                    onPress={() => setSelectedCategory(f)} 
                    style={[styles.folderChip, selectedCategory === f && styles.folderChipActive]}
                  >
                    <Text style={styles.chipText}>{f}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <TouchableOpacity style={styles.mainBtn} onPress={handleProcess} disabled={loading}>
                {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.mainBtnText}>Маршрутизировать</Text>}
              </TouchableOpacity>
            </KeyboardAvoidingView>
          )}

          {view === 'dashboard' && (
            <View>
              <Text style={styles.label}>Ваши активные хранилища:</Text>
              {folders.map(f => (
                <View key={f} style={styles.folderItem}>
                  <Text style={styles.folderItemText}>📁 {f}</Text>
                </View>
              ))}
              <TouchableOpacity style={styles.addBtn} onPress={() => Alert.prompt("Новая папка", "Введите название", name => setFolders([...folders, name]))}>
                <Text style={styles.btnText}>+ Создать папку</Text>
              </TouchableOpacity>
            </View>
          )}

          {view === 'finance' && (
            <View>
              <Text style={styles.label}>Последние транзакции:</Text>
              {financeLogs.length > 0 ? financeLogs.map((log, i) => (
                <View key={i} style={styles.logCard}>
                  <Text style={styles.logText}>{log.replace(/\|/g, '  ')}</Text>
                </View>
              )) : <Text style={styles.logText}>Траты не обнаружены</Text>}
            </View>
          )}
        </ScrollView>
      </View>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F071E', paddingTop: 60, paddingHorizontal: 20 },
  header: { fontSize: 24, fontWeight: 'bold', color: '#DDD6FE', textAlign: 'center', marginBottom: 20 },
  nav: { flexDirection: 'row', backgroundColor: '#1E1135', borderRadius: 15, padding: 5, marginBottom: 20 },
  navBtn: { flex: 1, padding: 10, alignItems: 'center', borderRadius: 10 },
  navBtnActive: { backgroundColor: '#7C3AED' },
  navText: { color: '#EDE9FE', fontWeight: '600' },
  input: { backgroundColor: '#1E1135', color: '#fff', padding: 15, borderRadius: 15, height: 120, fontSize: 16, marginBottom: 15, borderWidth: 1, borderColor: '#4C1D95' },
  audioBtn: { backgroundColor: '#4C1D95', padding: 15, borderRadius: 15, alignItems: 'center', marginBottom: 20 },
  recording: { backgroundColor: '#BE185D' },
  mainBtn: { backgroundColor: '#7C3AED', padding: 20, borderRadius: 15, alignItems: 'center', marginTop: 10 },
  mainBtnText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  label: { color: '#A78BFA', marginBottom: 10, fontSize: 14, fontWeight: '600' },
  folderGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 },
  folderChip: { backgroundColor: '#2E1065', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, borderWidth: 1, borderColor: '#4C1D95' },
  folderChipActive: { backgroundColor: '#8B5CF6', borderColor: '#DDD6FE' },
  chipText: { color: '#EDE9FE', fontSize: 12 },
  folderItem: { backgroundColor: '#1E1135', padding: 15, borderRadius: 12, marginBottom: 10 },
  folderItemText: { color: '#DDD6FE', fontSize: 16 },
  addBtn: { padding: 15, alignItems: 'center' },
  btnText: { color: '#A78BFA', fontWeight: 'bold' },
  logCard: { backgroundColor: '#1E1135', padding: 12, borderRadius: 10, marginBottom: 8, borderLeftWidth: 4, borderLeftColor: '#7C3AED' },
  logText: { color: '#EDE9FE', fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace', fontSize: 13 }
});
