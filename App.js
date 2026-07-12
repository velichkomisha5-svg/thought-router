import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  TextInput, 
  Switch, 
  TouchableOpacity, 
  ActivityIndicator, 
  Alert, 
  KeyboardAvoidingView, 
  TouchableWithoutFeedback, 
  Keyboard, 
  Platform 
} from 'react-native';
import * as FileSystem from 'expo-file-system';
import { Audio } from 'expo-av';

const GEMINI_API_KEY = "AQ.Ab8RN6JjHcuOOg-U0O5CQx9KD7FVjjKUVT70-HoVTK2sy5cgVg";

export default function App() {
  const [text, setText] = useState('');
  const [generateVisual, setGenerateVisual] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingStatus, setLoadingStatus] = useState('');
  
  const [recording, setRecording] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [audioBase64, setAudioBase64] = useState(null);

  useEffect(() => {
    return () => {
      if (recording) {
        recording.stopAndUnloadAsync().catch(() => {});
      }
    };
  }, [recording]);

  const startRecording = async () => {
    try {
      const permission = await Audio.requestPermissionsAsync();
      if (permission.status !== 'granted') {
        Alert.alert("Отклонено", "Нет доступа к микрофону.");
        return;
      }

      await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
      const { recording: newRecording } = await Audio.Recording.createAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
      
      setRecording(newRecording);
      setIsRecording(true);
      setAudioBase64(null);
    } catch (err) {
      Alert.alert("Системная ошибка", err.message);
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
    } catch (err) {
      Alert.alert("Ошибка файловой системы", err.message);
    }
  };

  const handleProcessThought = async () => {
    if (!text.trim() && !audioBase64) {
      Alert.alert("Блокировка", "Отсутствуют входные данные.");
      return;
    }

    setLoading(true);
    Keyboard.dismiss();
    
    try {
      const systemInstruction = `You are a strict data routing core for Obsidian. Analyze the input. Return raw, valid JSON only. No markdown wrappers like \`\`\`json.
      Structure:
      {
        "isFinance": boolean,
        "category": "String. Determine a short, precise folder name for this context (e.g., 'Учеба', 'Работа', 'Тренировки'). If isFinance is true, use 'Финансы'.",
        "markdown": "String. Formatted Obsidian note with YAML. If isFinance, leave empty.",
        "visualPrompt": "String. Detailed Imagen 3 prompt. Empty if not needed or isFinance.",
        "financeData": { "item": "String", "amount": Number, "currency": "String" } // include only if isFinance
      }`;

      let requestBody = {
        contents: [{ parts: [] }],
        generationConfig: { responseMimeType: "application/json" }
      };

      if (audioBase64) {
        setLoadingStatus('Декодирование и анализ...');
        requestBody.contents[0].parts.push({ text: systemInstruction }, { inlineData: { mimeType: "audio/m4a", data: audioBase64 } });
      } else {
        setLoadingStatus('Семантический анализ...');
        requestBody.contents[0].parts.push({ text: systemInstruction }, { text: `Input: "${text}"` });
      }

      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      });

      const data = await response.json();
      if (data.error) throw new Error(data.error.message);
      if (!data.candidates) throw new Error("Сбой конвейера: Пустой ответ.");

      const cleanJson = JSON.parse(data.candidates[0].content.parts[0].text.trim());
      const { isFinance, category, markdown, visualPrompt, financeData } = cleanJson;

      const safeCategory = category.replace(/[^a-zA-Zа-яА-Я0-9\s-]/g, '').trim();
      const targetDir = `${FileSystem.documentDirectory}${safeCategory}/`;
      await FileSystem.makeDirectoryAsync(targetDir, { intermediates: true });

      if (isFinance && financeData) {
        setLoadingStatus('Синхронизация регистра...');
        const financeFile = `${targetDir}Журнал_Финансов.md`;
        let existingContent = '';
        
        const fileInfo = await FileSystem.getInfoAsync(financeFile);
        if (fileInfo.exists) {
          existingContent = await FileSystem.readAsStringAsync(financeFile);
        } else {
          existingContent = "---\ntype: finance_ledger\n---\n# Финансовый регистр\n\n| Дата | Операция | Сумма |\n|---|---|---|\n";
        }

        const dateStr = new Date().toLocaleDateString('ru-RU');
        const newRow = `| ${dateStr} | ${financeData.item} | ${financeData.amount} ${financeData.currency} |\n`;
        
        await FileSystem.writeAsStringAsync(financeFile, existingContent + newRow, { encoding: FileSystem.EncodingType.UTF8 });
        Alert.alert("Транзакция учтена", `${financeData.item}: ${financeData.amount} ${financeData.currency}`);
      } else {
        const timestamp = Date.now();
        const safeSnippet = text.trim() ? text.trim().substring(0, 15).replace(/[^a-zA-Zа-яА-Я0-9]/g, '_') : 'voice';
        const fileName = `${safeCategory}_${safeSnippet}_${timestamp}`;
        let mdContent = markdown;

        if (generateVisual && visualPrompt) {
          setLoadingStatus('Рендеринг графа...');
          const attachmentsDir = `${FileSystem.documentDirectory}attachments/`;
          await FileSystem.makeDirectoryAsync(attachmentsDir, { intermediates: true });

          const imgRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-002:generateImages?key=${GEMINI_API_KEY}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ numberOfImages: 1, prompt: visualPrompt, aspectRatio: "1:1", outputMimeType: "image/png" })
          });

          const imgData = await imgRes.json();
          if (imgData.error) throw new Error(imgData.error.message);
          
          if (imgData.generatedImages) {
            const localImageUri = `${attachmentsDir}${fileName}.png`;
            await FileSystem.writeAsStringAsync(localImageUri, imgData.generatedImages[0].image.imageBytes, { encoding: FileSystem.EncodingType.Base64 });
            mdContent += `\n\n### Инфографика\n![[../attachments/${fileName}.png]]`;
          }
        }

        setLoadingStatus('Запись на диск...');
        await FileSystem.writeAsStringAsync(`${targetDir}${fileName}.md`, mdContent, { encoding: FileSystem.EncodingType.UTF8 });
        Alert.alert("Маршрут завершен", `Директория: ${safeCategory}`);
      }

      setText('');
      setAudioBase64(null);
    } catch (error) {
      Alert.alert("Сбой выполнения", error.message);
    } finally {
      setLoading(false);
      setLoadingStatus('');
    }
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.container}>
        <Text style={styles.header}>Thought Router Pro</Text>
        
        <TextInput
          style={styles.input}
          placeholder="Ввод лога данных или активация аудио..."
          placeholderTextColor="#8B7BA8"
          multiline
          value={text}
          onChangeText={(val) => { setText(val); setAudioBase64(null); }}
          editable={!loading}
          returnKeyType="done"
          blurOnSubmit={true}
        />

        <View style={styles.audioSection}>
          <TouchableOpacity 
            style={[styles.audioButton, isRecording ? styles.recordingActive : styles.recordingInactive]} 
            onPress={isRecording ? stopRecording : startRecording}
            disabled={loading}
          >
            <Text style={styles.buttonText}>{isRecording ? "⏹ Фиксация аудиопотока" : "🎙 Захват аудио"}</Text>
          </TouchableOpacity>
          {audioBase64 && <Text style={styles.audioReadyText}>✓ Бинарный аудио-блок загружен</Text>}
        </View>

        <View style={styles.switchContainer}>
          <Text style={styles.switchLabel}>Векторная генерация схемы</Text>
          <Switch
            value={generateVisual}
            onValueChange={setGenerateVisual}
            disabled={loading}
            trackColor={{ false: "#3F2C60", true: "#8B5CF6" }}
            thumbColor={generateVisual ? "#E9D5FF" : "#8B7BA8"}
          />
        </View>

        <TouchableOpacity 
          style={[styles.button, loading ? styles.buttonDisabled : styles.buttonEnabled]} 
          onPress={handleProcessThought} 
          disabled={loading}
        >
          {loading ? (
            <View style={styles.loadingRow}>
              <ActivityIndicator color="#E9D5FF" style={{ marginRight: 10 }} />
              <Text style={styles.loadingText}>{loadingStatus}</Text>
            </View>
          ) : (
            <Text style={styles.buttonText}>Инициировать маршрутизацию</Text>
          )}
        </TouchableOpacity>
      </KeyboardAvoidingView>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#130A1F', padding: 20, justifyContent: 'center' },
  header: { fontSize: 26, fontWeight: 'bold', color: '#E9D5FF', marginBottom: 25, textAlign: 'center', letterSpacing: 1 },
  input: { backgroundColor: '#23153C', color: '#D8B4FE', padding: 15, borderRadius: 12, height: 120, textAlignVertical: 'top', fontSize: 16, marginBottom: 15, borderWidth: 1, borderColor: '#3F2C60' },
  audioSection: { alignItems: 'center', marginBottom: 20 },
  audioButton: { width: '100%', padding: 14, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  recordingInactive: { backgroundColor: '#3B2363' },
  recordingActive: { backgroundColor: '#9D174D' },
  audioReadyText: { color: '#10B981', marginTop: 8, fontSize: 13, fontWeight: '600' },
  switchContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 25, paddingHorizontal: 5 },
  switchLabel: { color: '#C084FC', fontSize: 15, flex: 1 },
  button: { padding: 16, borderRadius: 12, alignItems: 'center', height: 55, justifyContent: 'center' },
  buttonEnabled: { backgroundColor: '#7C3AED', shadowColor: '#7C3AED', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 5 },
  buttonDisabled: { backgroundColor: '#3F2C60' },
  buttonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700', letterSpacing: 0.5 },
  loadingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  loadingText: { color: '#E9D5FF', fontSize: 14, fontWeight: '600' }
});
