import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ScrollView } from 'react-native';
import { Feather } from '@expo/vector-icons';
import * as SecureStore from 'expo-secure-store';
import { SECURE_KEY_ALIAS, COLORS } from '../config/constants';

export default function Settings() {
  const [apiKey, setApiKey] = useState('');

  useEffect(() => {
    loadKey();
  }, []);

  const loadKey = async () => {
    const saved = await SecureStore.getItemAsync(SECURE_KEY_ALIAS);
    if (saved) setApiKey(saved);
  };

  const saveKey = async () => {
    await SecureStore.setItemAsync(SECURE_KEY_ALIAS, apiKey.trim());
    Alert.alert("Сохранено", "API-ключ сохранен в SecureStore");
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <Text style={styles.header}>Settings</Text>
      <Text style={styles.subHeader}>Integrations & Security</Text>
      <View style={styles.sectionCard}>
        <View style={styles.secTitleRow}>
          <Feather name="key" size={16} color={COLORS.textPrimary} />
          <Text style={styles.secTitle}>API Credentials</Text>
        </View>
        <Text style={styles.label}>GEMINI API KEY</Text>
        <TextInput
          style={styles.input}
          placeholder="Enter Key..."
          placeholderTextColor={COLORS.textMuted}
          secureTextEntry
          value={apiKey}
          onChangeText={setApiKey}
        />
        <TouchableOpacity style={styles.saveBtn} onPress={saveKey}>
          <Text style={styles.saveTxt}>Save Key</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.sectionCard}>
        <View style={styles.secTitleRow}>
          <Feather name="user" size={16} color={COLORS.textPrimary} />
          <Text style={styles.secTitle}>Connected Accounts</Text>
        </View>
        <View style={styles.accountRow}>
          <Text style={styles.accTitle}>Google Workspace</Text>
          <Text style={styles.accConnected}>Configured via Google Sync</Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bgPrimary, paddingHorizontal: 20, paddingTop: 10 },
  header: { fontSize: 28, fontWeight: 'bold', color: COLORS.textPrimary },
  subHeader: { color: COLORS.textMuted, fontSize: 13, marginBottom: 20 },
  sectionCard: { backgroundColor: COLORS.surface, padding: 18, borderRadius: 18, borderWidth: 1, borderColor: COLORS.border, marginBottom: 20 },
  secTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 15 },
  secTitle: { color: COLORS.textPrimary, fontSize: 16, fontWeight: 'bold' },
  label: { color: COLORS.textMuted, fontSize: 10, fontWeight: 'bold', marginBottom: 6 },
  input: { backgroundColor: COLORS.bgPrimary, color: COLORS.textPrimary, padding: 12, borderRadius: 10, borderWidth: 1, borderColor: COLORS.border, marginBottom: 12 },
  saveBtn: { backgroundColor: COLORS.accentPrimary, padding: 12, borderRadius: 10, alignItems: 'center' },
  saveTxt: { color: '#FFF', fontWeight: 'bold' },
  accountRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: COLORS.bgPrimary, padding: 12, borderRadius: 10 },
  accTitle: { color: COLORS.textPrimary, fontWeight: 'bold' },
  accConnected: { color: COLORS.success, fontSize: 12 }
});
