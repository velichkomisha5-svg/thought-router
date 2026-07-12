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
  
  // Состояния для аудиозаписи
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
        Alert.alert("Доступ запрещен", "Необходим доступ к микрофону для записи мыслей.");
        return;
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const { recording: newRecording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      
      setRecording(newRecording);
      setIsRecording(true);
      setAudioBase64(null);
    } catch (err) {
      Alert.alert("Ошибка записи", "Не удалось запустить микрофон: " + err.message);
    }
  };

  const stopRecording = async () => {
    if (!recording) return;
    try {
      setIsRecording(false);
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      
      // Конвертация записанного аудиофайла в Base64 для передачи в Gemini API
      const base64Data = await FileSystem.readAsStringAsync(uri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      
      setAudioBase64(base64Data);
      setRecording(null);
      Alert.alert("Аудио записано", "Голосовая мысль готова к маршрутизации.");
    } catch (err) {
      Alert.alert("Ошибка остановки", "Не удалось сохранить аудио: " + err.message);
    }
  };

  const handleProcessThought = async () => {
    if (!text.trim() && !audioBase64) {
      Alert.alert("Ошибка ввода", "Введите текст или запишите голосовую заметку.");
      return;
    }

    setLoading(true);
    Keyboard.dismiss();
    
    try {
      let requestBody = {};
      const systemInstruction = `Проанализируй входящие данные (текст или аудио). Верни строго JSON объект с тремя полями без какого-либо дополнительного текста вокруг: 
      "category" (строго одно из значений: Учеба, Работа, Расходы, ПК), 
      "markdown" (красиво структурированный текст заметки для Obsidian с YAML-фронтматером сверху, содержащим специфичные для домена метаданные), 
      "visualPrompt" (подробный промпт на английском языке для генерации точной блок-схемы/алгоритма действий модели Imagen без артефактов текста).`;

      if (audioBase64) {
        setLoadingStatus('Расшифровка аудио и анализ...');
        requestBody = {
          contents: [{
            parts: [
              { text: systemInstruction },
              { inlineData: { mimeType: "audio/m4a", data: audioBase64 } }
            ]
          }]
        };
      } else {
        setLoadingStatus('Анализ текста...');
        requestBody = {
          contents: [{
            parts: [{
              text: `${systemInstruction}\n\nВходящий текст: "${text}"`
            }]
          }]
        };
      }

      const geminiResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      });

      const geminiData = await geminiResponse.json();
      if (!geminiData.candidates || geminiData.candidates.length === 0) {
        throw new Error("Некорректный ответ от текстового API.");
      }
      
      const resultText = geminiData.candidates[0].content.parts[0].text;
      
      // Защищенное извлечение JSON регулярным выражением
      const jsonMatch = resultText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error("API не вернуло валидный JSON-объект: " + resultText);
      }
      
      const { category, markdown, visualPrompt } = JSON.parse(jsonMatch[0].trim());

      // Валидация категории во избежание сбоев путей iOS
      const validCategories = ['Учеба', 'Работа', 'Расходы', 'ПК'];
      const secureCategory = validCategories.includes(category) ? category : 'Идеи';

      // Генерация безопасного имени файла
      const timestamp = Date.now();
      const safeTextSnippet = text.trim() ? text.trim().substring(0, 10).replace(/[^a-zA-Zа-яА-Я0-9]/g, '_') : 'voice';
      const fileName = `${secureCategory}_${safeTextSnippet}_${timestamp}`;
      
      const targetDir = `${FileSystem.documentDirectory}${secureCategory}/`;
      const attachmentsDir = `${FileSystem.documentDirectory}attachments/`;

      await FileSystem.makeDirectoryAsync(targetDir, { intermediates: true });
      await FileSystem.makeDirectoryAsync(attachmentsDir, { intermediates: true });

      let mdContent = markdown;

      if (generateVisual) {
        setLoadingStatus('Генерация визуальной схемы...');
        const imagenResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-002:generateImages?key=${GEMINI_API_KEY}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            numberOfImages: 1,
            prompt: visualPrompt,
            aspectRatio: "1:1",
            outputMimeType: "image/png"
          })
        });

        const imagenData = await imagenResponse.json();
        if (!imagenData.generatedImages || imagenData.generatedImages.length === 0) {
          throw new Error("Модель Изображений отклонила генерацию по данному промпту.");
        }
        
        const base64ImageBytes = imagenData.generatedImages[0].image.imageBytes;
        const localImageUri = `${attachmentsDir}${fileName}.png`;
        
        await FileSystem.writeAsStringAsync(localImageUri, base64ImageBytes, {
          encoding: FileSystem.EncodingType.Base64
        });

        mdContent += `\n\n### Визуальный план действий\n![[../attachments/${fileName}.png]]`;
      }

      setLoadingStatus('Сохранение файлов...');
      const localMdUri = `${targetDir}${fileName}.md`;
      await FileSystem.writeAsStringAsync(localMdUri, mdContent, { encoding: FileSystem.EncodingType.UTF8 });

      Alert.alert("Успешно маршрутизировано", `Создана заметка в Obsidian-каталоге: ${secureCategory}`);
      
      // Сброс всех состояний после успешной обработки
      setText('');
      setAudioBase64(null);
    } catch (error) {
      console.error(error);
      Alert.alert("Сбой обработки", error.message);
    } finally {
      setLoading(false);
      setLoadingStatus('');
    }
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
        style={styles.container}
      >
        <Text style={styles.header}>Thought Router Pro</Text>
        
        <TextInput
          style={styles.input}
          placeholder="Напишите мысль или воспользуйтесь диктофоном ниже..."
          placeholderTextColor="#666"
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
            <Text style={styles.buttonText}>
              {isRecording ? "⏹ Остановить запись" : "🎙 Записать голос"}
            </Text>
          </TouchableOpacity>
          {audioBase64 && <Text style={styles.audioReadyText}>✓ Голосовая заметка добавлена</Text>}
        </View>

        <View style={styles.switchContainer}>
          <Text style={styles.switchLabel}>Сгенерировать визуальный план (Imagen 3)</Text>
          <Switch
            value={generateVisual}
            onValueChange={setGenerateVisual}
            disabled={loading}
            trackColor={{ false: "#767577", true: "#007AFF" }}
            thumbColor={generateVisual ? "#fff" : "#f4f3f4"}
          />
        </View>

        <TouchableOpacity 
          style={[styles.button, loading ? styles.buttonDisabled : styles.buttonEnabled]} 
          onPress={handleProcessThought} 
          disabled={loading}
        >
          {loading ? (
            <View style={styles.loadingRow}>
              <ActivityIndicator color="#fff" style={{ marginRight: 10 }} />
              <Text style={styles.loadingText}>{loadingStatus}</Text>
            </View>
          ) : (
            <Text style={styles.buttonText}>Маршрутизировать в Obsidian</Text>
          )}
        </TouchableOpacity>
      </KeyboardAvoidingView>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#121212', padding: 20, justifyContent: 'center' },
  header: { fontSize: 26, fontWeight: 'bold', color: '#fff', marginBottom: 25, textAlign: 'center' },
  input: { backgroundColor: '#1e1e1e', color: '#fff', padding: 15, borderRadius: 10, height: 120, textAlignVertical: 'top', fontSize: 16, marginBottom: 15 },
  audioSection: { alignItems: 'center', marginBottom: 20 },
  audioButton: { width: '100%', padding: 12, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  recordingInactive: { backgroundColor: '#2c2c2c' },
  recordingActive: { backgroundColor: '#FF3B30' },
  audioReadyText: { color: '#4CD964', marginTop: 8, fontSize: 14, fontWeight: '500' },
  switchContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 25 },
  switchLabel: { color: '#fff', fontSize: 15, flex: 1, paddingRight: 10 },
  button: { padding: 15, borderRadius: 10, alignItems: 'center', height: 50, justifyContent: 'center' },
  buttonEnabled: { backgroundColor: '#007AFF' },
  buttonDisabled: { backgroundColor: '#48484A' },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  loadingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  loadingText: { color: '#fff', fontSize: 14, fontWeight: '500' }
});
