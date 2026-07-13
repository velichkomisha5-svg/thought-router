import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, Text, View, TextInput, Switch, TouchableOpacity, 
  ActivityIndicator, Alert, KeyboardAvoidingView, ScrollView, 
  TouchableWithoutFeedback, Keyboard, Platform 
} from 'react-native';
import * as FileSystem from 'expo-file-system';
import * as Notifications from 'expo-notifications';
import { Audio } from 'expo-av';

const GEMINI_API_KEY = "AQ.Ab8RN6JjHcuOOg-U0O5CQx9KD7FVjjKUVT70-HoVTK2sy5cgVg";

// Настройка поведения уведомлений на переднем плане
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export default function App() {
  const [view, setView] = useState('input'); // 'input' | 'dashboard' | 'finance'
  const [text, setText] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [generateVisual, setGenerateVisual] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingStatus, setLoadingStatus] = useState('');
  
  // Состояния проводника
  const [currentFolder, setCurrentFolder] = useState(null);
  const [filesInFolder, setFilesInFolder] = useState([]);
  const [viewingFile, setViewingFile] = useState(null);
  const [fileContent, setFileContent] = useState('');

  // Состояния финансов
  const [financeSummary, setFinanceSummary] = useState({ expenses: [], subscriptions: [] });
  
  // Состояния аудио
  const [recording, setRecording] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [audioBase64, setAudioBase64] = useState(null);

  const [folders, setFolders] = useState(['Учеба', 'Работа', 'ПК', 'Здоровье', 'Финансы']);

  useEffect(() => {
    // Инициализация разрешений и дефолтных настроек аудио
    const initApp = async () => {
      await Notifications.requestPermissionsAsync();
      loadFolders();
      initFinanceStorage();
    };
    initApp();
  }, []);

  const loadFolders = async () => {
    try {
      const root = await FileSystem.readDirectoryAsync(FileSystem.documentDirectory);
      const filtered = root.filter(f => !f.includes('.') && f !== 'attachments');
      setFolders(Array.from(new Set([...folders, ...filtered])));
    } catch (e) {
      console.warn("Ошибка инициализации директорий:", e);
    }
  };

  const initFinanceStorage = async () => {
    const dir = `${FileSystem.documentDirectory}Финансы/`;
    const jsonPath = `${dir}data.json`;
    await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
    const info = await FileSystem.getInfoAsync(jsonPath);
    if (!info.exists) {
      await FileSystem.writeAsStringAsync(jsonPath, JSON.stringify({ expenses: [], subscriptions: [] }));
    }
  };

  const startRecording = async () => {
    try {
      const permission = await Audio.requestPermissionsAsync();
      if (permission.status !== 'granted') {
        Alert.alert("Микрофон", "Не предоставлен доступ к микрофону.");
        return;
      }

      // Безопасный перезапуск аудио-сессии для предотвращения зависаний в iOS
      await Audio.setAudioModeAsync({ allowsRecordingIOS: false });
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
      });

      const newRecording = new Audio.Recording();
      await newRecording.prepareToRecordAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
      await newRecording.startAsync();
      
      setRecording(newRecording);
      setIsRecording(true);
      setAudioBase64(null);
    } catch (err) {
      Alert.alert("Ошибка записи", "Конфликт аудиосессии: " + err.message);
    }
  };

  const stopRecording = async () => {
    if (!recording) return;
    try {
      setIsRecording(false);
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      const base64Data = await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 });
      setAudioBase64(base64Data);
      setRecording(null);
      Alert.alert("Аудио готово", "Голос успешно зафиксирован.");
    } catch (err) {
      Alert.alert("Ошибка сохранения", err.message);
    }
  };

  // Метод перехода в папку
  const openFolder = async (folderName) => {
    try {
      const dirPath = `${FileSystem.documentDirectory}${folderName}/`;
      const files = await FileSystem.readDirectoryAsync(dirPath);
      const filteredFiles = files.filter(f => f.endsWith('.md') || f.endsWith('.txt'));
      setCurrentFolder(folderName);
      setFilesInFolder(filteredFiles);
    } catch (e) {
      Alert.alert("Пустая папка", "Внутри данной категории еще нет файлов.");
    }
  };

  // Метод открытия файла заметок
  const openFile = async (fileName) => {
    try {
      const filePath = `${FileSystem.documentDirectory}${currentFolder}/${fileName}`;
      const content = await FileSystem.readAsStringAsync(filePath);
      setViewingFile(fileName);
      setFileContent(content);
    } catch (e) {
      Alert.alert("Ошибка чтения", e.message);
    }
  };

  const loadFinanceData = async () => {
    try {
      const jsonPath = `${FileSystem.documentDirectory}Финансы/data.json`;
      const info = await FileSystem.getInfoAsync(jsonPath);
      if (info.exists) {
        const raw = await FileSystem.readAsStringAsync(jsonPath);
        setFinanceSummary(JSON.parse(raw));
      }
      setView('finance');
    } catch (e) {
      Alert.alert("Ошибка БД", e.message);
    }
  };

  const syncObsidianFinance = async (data) => {
    const dir = `${FileSystem.documentDirectory}Финансы/`;
    let md = "---\ntype: finance_ledger\n---\n# Финансовый регистр\n\n";
    
    md += "## Активные подписки\n| Подписка | Стоимость | Период |\n|---|---|---|\n";
    data.subscriptions.forEach(s => {
      md += `| ${s.item} | ${s.amount} ${s.currency} | ${s.billing} |\n`;
    });

    md += "\n## Траты\n| Дата | Предмет | Сумма |\n|---|---|---|\n";
    data.expenses.forEach(e => {
      md += `| ${e.date} | ${e.item} | ${e.amount} ${e.currency} |\n`;
    });

    await FileSystem.writeAsStringAsync(`${dir}Журнал_Финансов.md`, md, { encoding: FileSystem.EncodingType.UTF8 });
  };

  const handleProcess = async () => {
    if (!text.trim() && !audioBase64) return;
    setLoading(true);
    Keyboard.dismiss();

    try {
      const systemInstruction = `Analyze the user input. Perform categorization. If it mentions expenses, prices, or bills, set isFinance: true.
      If it is a recurring charge (subscription, netflix, icloud, rent, etc.), set isSubscription: true.
      Detect if any action items, calendar references, dates, or deadlines (such as homework, meetings, documents to bring) are requested. If yes, generate a notification trigger.
      
      Return raw, valid JSON only. No markdown formatting.
      JSON Schema:
      {
        "isFinance": boolean,
        "isSubscription": boolean,
        "suggestedCategory": "String", 
        "markdown": "Obsidian MD file content with YAML frontmatter containing relevant context",
        "visualPrompt": "Detailed English prompt for Imagen 3 flowchart mapping",
        "finance": { "item": "string", "amount": number, "currency": "string", "billing": "monthly | yearly" },
        "reminder": {
          "needed": boolean,
          "title": "String task title",
          "body": "String task details",
          "triggerDate": "YYYY-MM-DDTHH:mm:ss (use current context to calculate the absolute ISO string for the date mentioned in input)"
        }
      }`;

      let body = { 
        contents: [{ parts: [{ text: systemInstruction }] }], 
        generationConfig: { responseMimeType: "application/json" } 
      };

      if (audioBase64) {
        setLoadingStatus('Оцифровка и лингвистический разбор...');
        body.contents[0].parts.push({ inlineData: { mimeType: "audio/m4a", data: audioBase64 } });
      } else {
        setLoadingStatus('Синтаксический анализ лога...');
        body.contents[0].parts.push({ text: `Input: "${text}" (Current date: 2026-07-13)` });
      }

      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      const rawResponse = await res.json();
      if (rawResponse.error) throw new Error(rawResponse.error.message);

      const result = JSON.parse(rawResponse.candidates[0].content.parts[0].text.trim());
      
      const finalCategory = selectedCategory || result.suggestedCategory;
      const targetDir = `${FileSystem.documentDirectory}${finalCategory}/`;
      await FileSystem.makeDirectoryAsync(targetDir, { intermediates: true });

      // Логика финансов
      if (result.isFinance && result.finance) {
        setLoadingStatus('Дозапись в финансовый реестр...');
        const jsonPath = `${FileSystem.documentDirectory}Финансы/data.json`;
        const rawJson = await FileSystem.readAsStringAsync(jsonPath);
        const currentData = JSON.parse(rawJson);

        if (result.isSubscription) {
          // Исключение дубликатов подписок
          currentData.subscriptions = currentData.subscriptions.filter(s => s.item.toLowerCase() !== result.finance.item.toLowerCase());
          currentData.subscriptions.push({
            item: result.finance.item,
            amount: result.finance.amount,
            currency: result.finance.currency,
            billing: result.finance.billing || 'monthly'
          });
        } else {
          currentData.expenses.push({
            date: new Date().toLocaleDateString('ru-RU'),
            item: result.finance.item,
            amount: result.finance.amount,
            currency: result.finance.currency
          });
        }

        await FileSystem.writeAsStringAsync(jsonPath, JSON.stringify(currentData));
        await syncObsidianFinance(currentData);
        Alert.alert("Транзакция учтена", `${result.finance.item}: ${result.finance.amount} ${result.finance.currency}`);
      } else {
        // Логика сохранения стандартной заметки
        const fileName = `${finalCategory}_Note_${Date.now()}.md`;
        await FileSystem.writeAsStringAsync(`${targetDir}${fileName}`, result.markdown, { encoding: FileSystem.EncodingType.UTF8 });
        Alert.alert("Заметка создана", `Файл сохранен в каталог: ${finalCategory}`);
      }

      // Планирование push-уведомлений на iOS
      if (result.reminder && result.reminder.needed) {
        setLoadingStatus('Установка локального таймера...');
        const triggerTime = new Date(result.reminder.triggerDate).getTime();
        const delay = (triggerTime - Date.now()) / 1000;

        if (delay > 0) {
          await Notifications.scheduleNotificationAsync({
            content: {
              title: result.reminder.title,
              body: result.reminder.body,
              sound: true,
            },
            trigger: { seconds: Math.max(1, Math.floor(delay)) },
          });
          Alert.alert("Напоминание установлено", `${result.reminder.title} на ${new Date(result.reminder.triggerDate).toLocaleString()}`);
        }
      }

      setText(''); 
      setAudioBase64(null); 
      setSelectedCategory(null); 
      loadFolders();
    } catch (e) { 
      Alert.alert("Сбой маршрутизатора", e.message); 
    } finally { 
      setLoading(false); 
      setLoadingStatus(''); 
    }
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <View style={styles.container}>
        <Text style={styles.header}>Thought Router Pro</Text>

        {/* Навигационное меню */}
        <View style={styles.nav}>
          <TouchableOpacity onPress={() => setView('input')} style={[styles.navBtn, view === 'input' && styles.navBtnActive]}>
            <Text style={styles.navText}>Ввод</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => { setView('dashboard'); setCurrentFolder(null); setViewingFile(null); }} style={[styles.navBtn, view === 'dashboard' && styles.navBtnActive]}>
            <Text style={styles.navText}>Папки</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={loadFinanceData} style={[styles.navBtn, view === 'finance' && styles.navBtnActive]}>
            <Text style={styles.navText}>Кошелек</Text>
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.scroll}>
          {view === 'input' && (
            <KeyboardAvoidingView behavior="padding">
              <TextInput
                style={styles.input}
                placeholder="Запишите лог мыслей, ДЗ или финансов..."
                placeholderTextColor="#A78BFA"
                multiline
                value={text}
                onChangeText={setText}
              />
              
              <TouchableOpacity 
                style={[styles.audioBtn, isRecording && styles.recording]} 
                onPress={isRecording ? stopRecording : startRecording}
              >
                <Text style={styles.btnText}>{isRecording ? "⏹ Остановить запись" : "🎙 Записать голос"}</Text>
              </TouchableOpacity>

              <Text style={styles.label}>Целевая директория (Необязательно):</Text>
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
                {loading ? (
                  <View style={styles.loadingRow}>
                    <ActivityIndicator color="#fff" style={{ marginRight: 10 }} />
                    <Text style={styles.loadingText}>{loadingStatus}</Text>
                  </View>
                ) : (
                  <Text style={styles.mainBtnText}>Маршрутизировать</Text>
                )}
              </TouchableOpacity>
            </KeyboardAvoidingView>
          )}

          {view === 'dashboard' && (
            <View>
              {/* Проводник */}
              {!currentFolder ? (
                <View>
                  <Text style={styles.label}>Локальные каталоги:</Text>
                  {folders.map(f => (
                    <TouchableOpacity key={f} style={styles.folderItem} onPress={() => openFolder(f)}>
                      <Text style={styles.folderItemText}>📁 {f}</Text>
                    </TouchableOpacity>
                  ))}
                  <TouchableOpacity style={styles.addBtn} onPress={() => Alert.prompt("Новая папка", "Укажите имя для нового каталога", name => setFolders([...folders, name]))}>
                    <Text style={styles.btnText}>+ Создать папку</Text>
                  </TouchableOpacity>
                </View>
              ) : !viewingFile ? (
                <View>
                  <TouchableOpacity style={styles.backBtn} onPress={() => setCurrentFolder(null)}>
                    <Text style={styles.backBtnText}>← К списку папок</Text>
                  </TouchableOpacity>
                  <Text style={styles.label}>Файлы в директории {currentFolder}:</Text>
                  {filesInFolder.length > 0 ? filesInFolder.map(file => (
                    <TouchableOpacity key={file} style={styles.fileItem} onPress={() => openFile(file)}>
                      <Text style={styles.fileItemText}>📄 {file}</Text>
                    </TouchableOpacity>
                  )) : <Text style={styles.emptyText}>Папка пуста.</Text>}
                </View>
              ) : (
                <View>
                  <TouchableOpacity style={styles.backBtn} onPress={() => setViewingFile(null)}>
                    <Text style={styles.backBtnText}>← К списку файлов</Text>
                  </TouchableOpacity>
                  <Text style={styles.fileTitle}>{viewingFile}</Text>
                  <View style={styles.fileViewer}>
                    <ScrollView>
                      <Text style={styles.fileBodyText}>{fileContent}</Text>
                    </ScrollView>
                  </View>
                </View>
              )}
            </View>
          )}

          {view === 'finance' && (
            <View>
              <Text style={styles.label}>Активные периодические подписки:</Text>
              {financeSummary.subscriptions.length > 0 ? financeSummary.subscriptions.map((sub, i) => (
                <View key={i} style={styles.subscriptionCard}>
                  <Text style={styles.logText}>💳 {sub.item} — {sub.amount} {sub.currency} ({sub.billing})</Text>
                </View>
              )) : <Text style={styles.emptyText}>Активных подписок не найдено.</Text>}

              <Text style={[styles.label, { marginTop: 20 }]}>История разовых расходов:</Text>
              {financeSummary.expenses.length > 0 ? financeSummary.expenses.map((exp, i) => (
                <View key={i} style={styles.logCard}>
                  <Text style={styles.logText}>🛒 [{exp.date}] {exp.item} — {exp.amount} {exp.currency}</Text>
                </View>
              )) : <Text style={styles.emptyText}>Расходов нет.</Text>}
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
  fileItem: { backgroundColor: '#1E1135', padding: 12, borderRadius: 10, marginBottom: 8, borderLeftWidth: 3, borderLeftColor: '#8B5CF6' },
  fileItemText: { color: '#EDE9FE', fontSize: 14 },
  fileTitle: { fontSize: 18, fontWeight: 'bold', color: '#DDD6FE', marginVertical: 10 },
  fileViewer: { backgroundColor: '#1E1135', padding: 15, borderRadius: 15, minHeight: 200, maxHeight: 400 },
  fileBodyText: { color: '#EDE9FE', fontSize: 14, lineHeight: 20 },
  backBtn: { alignSelf: 'flex-start', paddingVertical: 8, paddingHorizontal: 12, backgroundColor: '#3B2363', borderRadius: 8, marginBottom: 15 },
  backBtnText: { color: '#A78BFA', fontWeight: 'bold', fontSize: 12 },
  addBtn: { padding: 15, alignItems: 'center' },
  btnText: { color: '#A78BFA', fontWeight: 'bold' },
  subscriptionCard: { backgroundColor: '#1E1135', padding: 12, borderRadius: 10, marginBottom: 8, borderLeftWidth: 4, borderLeftColor: '#10B981' },
  logCard: { backgroundColor: '#1E1135', padding: 12, borderRadius: 10, marginBottom: 8, borderLeftWidth: 4, borderLeftColor: '#7C3AED' },
  logText: { color: '#EDE9FE', fontSize: 14 },
  emptyText: { color: '#8B7BA8', fontSize: 14, fontStyle: 'italic', marginVertical: 10 },
  loadingRow: { flexDirection: 'row', alignItems: 'center' },
  loadingText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
});
