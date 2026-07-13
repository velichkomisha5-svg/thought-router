import React, { useState } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, ScrollView } from 'react-native';
import { useSettings } from '../context/SettingsContext';
import { requestSandboxChat } from '../services/api';

export default function Chat({ setView }) {
  const { apiKey } = useSettings();
  const [input, setChatInput] = useState('');
  const [history, setChatHistory] = useState([]);

  const send = async () => {
    if (!input.trim() || !apiKey) return;
    const userMsg = { role: 'user', text: input };
    setChatHistory([...history, userMsg]); setChatInput('');
    try {
      const res = await requestSandboxChat(input, apiKey);
      setChatHistory(prev => [...prev, { role: 'ai', text: res }]);
    } catch(e) {}
  };

  return (
    <View>
      <TouchableOpacity style={styles.backBtn} onPress={() => setView('dashboard')}><Text style={styles.backBtnText}>← Меню</Text></TouchableOpacity>
      <ScrollView style={styles.box}>{history.map((m, i) => (
        <View key={i} style={[styles.msg, m.role === 'user' ? styles.user : styles.ai]}><Text style={styles.text}>{m.text}</Text></View>
      ))}</ScrollView>
      <TextInput style={styles.input} placeholder="Спросите..." placeholderTextColor="#8B7BA8" value={input} onChangeText={setChatInput} />
      <TouchableOpacity style={styles.btn} onPress={send}><Text style={styles.btnText}>Отправить</Text></TouchableOpacity>
    </View>
  );
}
const styles = StyleSheet.create({
  backBtn: { alignSelf: 'flex-start', padding: 8, backgroundColor: '#3B2363', borderRadius: 8, marginBottom: 15 },
  backBtnText: { color: '#A78BFA', fontWeight: 'bold' },
  box: { minHeight: 200, maxHeight: 350, marginBottom: 15 },
  msg: { padding: 12, borderRadius: 10, marginBottom: 8, maxWidth: '80%' },
  user: { backgroundColor: '#7C3AED', alignSelf: 'flex-end' },
  ai: { backgroundColor: '#1E1135', alignSelf: 'flex-start' },
  text: { color: '#fff' },
  input: { backgroundColor: '#1E1135', color: '#fff', padding: 12, borderRadius: 10, marginBottom: 10 },
  btn: { backgroundColor: '#7C3AED', padding: 15, borderRadius: 12, alignItems: 'center' },
  btnText: { color: '#fff', fontWeight: 'bold' }
});
