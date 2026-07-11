import React, { useState } from 'react';
import { StyleSheet, Text, View, TextInput, Switch, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import * as FileSystem from 'expo-file-system';

// Требуется указать только один ключ из Google AI Studio
const GEMINI_API_KEY = "AQ.Ab8RN6JjHcuOOg-U0O5CQx9KD7FVjjKUVT70-HoVTK2sy5cgVg";

export default function App() {
  const [text, setText] = useState('');
  const [generateVisual, setGenerateVisual] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleProcessThought = async () => {
    if (!text.trim()) {
      Alert.alert("Ошибка", "Введите вашу мысль");
      return;
    }

    setLoading(true);
    try {
      // 1. Семантический разбор текста и генерация точного промпта для графической модели
      const geminiResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: `Проанализируй входящий лог. Верни строго JSON объект с тремя полями без лишнего текста: 
              "category" (строго одно из значений: Учеба, Работа, Расходы, ПК), 
              "markdown" (красиво структурированный текст заметки для Obsidian с YAML-фронтматером сверху), 
              "visualPrompt" (детальный, подробный промпт на английском языке для генерации точной, минималистичной инфографики/блок-схемы без искажений текста, описывающий логику и шаги процесса). 
              Входящий лог: "${text}"`
            }]
          }]
        })
      });

      const geminiData = await geminiResponse.json();
      const resultText = geminiData.candidates[0].content.parts[0].text;
      
      const cleanJson = JSON.parse(resultText.replace(/```json/g, '').replace(/```/g, '').trim());
      const { category, markdown, visualPrompt } = cleanJson;

      const timestamp = Date.now();
      const fileName = `${category}_Note_${timestamp}`;
      
      const targetDir = `${FileSystem.documentDirectory}${category}/`;
      const attachmentsDir = `${FileSystem.documentDirectory}attachments/`;

      await FileSystem.makeDirectoryAsync(targetDir, { intermediates: true });
      await FileSystem.makeDirectoryAsync(attachmentsDir, { intermediates: true });

      let mdContent = markdown;

      // 2. Генерация графического плана через Google Imagen API при активном тумблере
      if (generateVisual) {
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
        const base64ImageBytes = imagenData.generatedImages[0].image.imageBytes;

        const localImageUri = `${attachmentsDir}${fileName}.png`;
        
        // Декодирование и запись Base64 напрямую в локальный файл PNG
        await FileSystem.writeAsStringAsync(localImageUri, base64ImageBytes, {
          encoding: FileSystem.EncodingType.Base64
        });

        mdContent += `\n\n### Визуальный план действий\n![[../attachments/${fileName}.png]]`;
      }

      // 3. Локальная запись структурированной заметки в песочницу приложения
      const localMdUri = `${targetDir}${fileName}.md`;
      await FileSystem.writeAsStringAsync(localMdUri, mdContent, { encoding: FileSystem.EncodingType.UTF8 });

      Alert.alert("Успех", `Заметка успешно сохранена в локальный каталог: ${category}`);
      setText('');
    } catch (error) {
      console.error(error);
      Alert.alert("Ошибка обработки данных", error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Thought Router</Text>
      
      <TextInput
        style={styles.input}
        placeholder="Выгрузите сюда ваши мысли или рабочие моменты..."
        placeholderTextColor="#666"
        multiline
        value={text}
        onChangeText={setText}
      />

      <View style={styles.switchContainer}>
        <Text style={styles.switchLabel}>Сгенерировать визуальный план</Text>
        <Switch
          value={generateVisual}
          onValueChange={setGenerateVisual}
          trackColor={{ false: "#767577", true: "#007AFF" }}
          thumbColor={generateVisual ? "#fff" : "#f4f3f4"}
        />
      </View>

      <TouchableOpacity style={styles.button} onPress={handleProcessThought} disabled={loading}>
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Маршрутизировать мысль</Text>}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#121212', padding: 20, justifyContent: 'center' },
  header: { fontSize: 28, fontWeight: 'bold', color: '#fff', marginBottom: 30, textAlign: 'center' },
  input: { backgroundColor: '#1e1e1e', color: '#fff', padding: 15, borderRadius: 10, height: 150, textAlignVertical: 'top', fontSize: 16, marginBottom: 20 },
  switchContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 30 },
  switchLabel: { color: '#fff', fontSize: 16 },
  button: { backgroundColor: '#007AFF', padding: 15, borderRadius: 10, alignItems: 'center', height: 50, justifyContent: 'center' },
  buttonText: { color: '#fff', fontSize: 18, fontWeight: 'bold' }
});