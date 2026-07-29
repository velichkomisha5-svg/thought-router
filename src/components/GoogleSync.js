import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, Switch, TouchableOpacity, TextInput, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as SecureStore from 'expo-secure-store';
import { GOOGLE_TOKEN_ALIAS, COLORS } from '../config/constants';
import { fetchGoogleCalendarEvents, fetchGoogleTasks } from '../services/google';

export default function GoogleSync() {
  const [autoSync, setAutoSync] = useState(true);
  const [events, setEvents] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [tokenInput, setTokenInput] = useState('');
  const [hasToken, setHasToken] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const handleAuthError = async () => {
    await SecureStore.deleteItemAsync(GOOGLE_TOKEN_ALIAS);
    setHasToken(false);
    setEvents([]);
    setTasks([]);
  };

  const loadData = async () => {
    const token = await SecureStore.getItemAsync(GOOGLE_TOKEN_ALIAS);
    if (!token) {
      setHasToken(false);
      return;
    }
    setHasToken(true);
    try {
      const evs = await fetchGoogleCalendarEvents(token);
      const tsk = await fetchGoogleTasks(token);
      setEvents(evs || []);
      setTasks(tsk || []);
    } catch (e) {
      if (e.message === "401") {
        await handleAuthError();
      }
    }
  };

  const saveToken = async () => {
    if (!tokenInput.trim()) return;
    await SecureStore.setItemAsync(GOOGLE_TOKEN_ALIAS, tokenInput.trim());
    setTokenInput('');
    loadData();
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <Text style={styles.header}>Google Sync</Text>
      <View style={styles.accountCard}>
        <View style={styles.accIcon}><Ionicons name="logo-google" size={24} color="#FFF" /></View>
        <View style={{ flex: 1 }}>
          <Text style={styles.accName}>Google Account</Text>
          <Text style={styles.accEmail}>{hasToken ? "Connected" : "Not Authenticated"}</Text>
        </View>
        <View style={[styles.badge, !hasToken && styles.badgeInactive]}>
          <Text style={[styles.badgeTxt, !hasToken && styles.badgeTxtInactive]}>{hasToken ? "ACTIVE" : "OFFLINE"}</Text>
        </View>
      </View>
      {!hasToken && (
        <View style={styles.tokenCard}>
          <Text style={styles.tokenTitle}>Ввести OAuth Access Token:</Text>
          <TextInput
            style={styles.tokenInput}
            placeholder="ya29.a0..."
            placeholderTextColor={COLORS.textMuted}
            value={tokenInput}
            onChangeText={setTokenInput}
          />
          <TouchableOpacity style={styles.tokenBtn} onPress={saveToken}>
            <Text style={styles.tokenBtnTxt}>Сохранить Токен</Text>
          </TouchableOpacity>
        </View>
      )}
      <View style={styles.syncRow}>
        <Text style={styles.syncTitle}>Auto-Sync</Text>
        <Switch
          value={autoSync}
          onValueChange={setAutoSync}
          trackColor={{ false: COLORS.surface, true: COLORS.accentPrimary }}
          thumbColor={COLORS.textPrimary}
        />
      </View>
      <Text style={styles.sectionTitle}>Upcoming Events</Text>
      {events.length === 0 ? (
        <Text style={styles.emptyTxt}>События не найдены</Text>
      ) : (
        events.map((ev, i) => (
          <View key={i} style={styles.eventCard}>
            <View style={styles.dateBlock}>
              <Text style={styles.month}>CAL</Text>
              <Text style={styles.day}>EV</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.eventTitle}>{ev.summary || 'Без названия'}</Text>
              <Text style={styles.eventTime}>{ev.start?.dateTime || ev.start?.date || ''}</Text>
            </View>
          </View>
        ))
      )}
      <Text style={styles.sectionTitle}>Google Tasks</Text>
      {tasks.length === 0 ? (
        <Text style={styles.emptyTxt}>Задачи отсутствуют</Text>
      ) : (
        tasks.map((t, i) => (
          <View key={i} style={styles.taskRow}>
            <TouchableOpacity style={styles.checkCircle} />
            <Text style={styles.taskTxt}>{t.title}</Text>
          </View>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bgPrimary, paddingHorizontal: 20, paddingTop: 10 },
  header: { fontSize: 28, fontWeight: 'bold', color: COLORS.textPrimary, marginBottom: 15 },
  accountCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.surface, padding: 16, borderRadius: 16, borderWidth: 1, borderColor: COLORS.border, gap: 12, marginBottom: 15 },
  accIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.accentPrimary, justifyContent: 'center', alignItems: 'center' },
  accName: { color: COLORS.textPrimary, fontWeight: 'bold', fontSize: 15 },
  accEmail: { color: COLORS.textMuted, fontSize: 12 },
  badge: { backgroundColor: '#064E3B', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  badgeInactive: { backgroundColor: '#831843' },
  badgeTxt: { color: COLORS.success, fontSize: 10, fontWeight: 'bold' },
  badgeTxtInactive: { color: COLORS.danger },
  tokenCard: { backgroundColor: COLORS.surface, padding: 15, borderRadius: 16, borderWidth: 1, borderColor: COLORS.border, marginBottom: 15 },
  tokenTitle: { color: COLORS.textPrimary, fontSize: 13, marginBottom: 8 },
  tokenInput: { backgroundColor: COLORS.bgPrimary, color: COLORS.textPrimary, padding: 10, borderRadius: 8, borderWidth: 1, borderColor: COLORS.border, marginBottom: 10 },
  tokenBtn: { backgroundColor: COLORS.accentPrimary, padding: 10, borderRadius: 8, alignItems: 'center' },
  tokenBtnTxt: { color: '#FFF', fontWeight: 'bold', fontSize: 12 },
  syncRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: COLORS.surface, padding: 16, borderRadius: 16, borderWidth: 1, borderColor: COLORS.border, marginBottom: 20 },
  syncTitle: { color: COLORS.textPrimary, fontSize: 16, fontWeight: 'bold' },
  sectionTitle: { color: COLORS.textPrimary, fontSize: 16, fontWeight: 'bold', marginBottom: 12 },
  emptyTxt: { color: COLORS.textMuted, fontSize: 13, marginBottom: 15 },
  eventCard: { flexDirection: 'row', gap: 15, backgroundColor: COLORS.surface, padding: 15, borderRadius: 16, borderWidth: 1, borderColor: COLORS.border, marginBottom: 10 },
  dateBlock: { alignItems: 'center', backgroundColor: COLORS.bgPrimary, padding: 10, borderRadius: 10, width: 50 },
  month: { color: COLORS.success, fontSize: 10, fontWeight: 'bold' },
  day: { color: COLORS.textPrimary, fontSize: 14, fontWeight: 'bold' },
  eventTitle: { color: COLORS.textPrimary, fontWeight: 'bold', fontSize: 15 },
  eventTime: { color: COLORS.textMuted, fontSize: 12, marginTop: 4 },
  taskRow: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: COLORS.surface, padding: 14, borderRadius: 14, borderWidth: 1, borderColor: COLORS.border, marginBottom: 8 },
  checkCircle: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: COLORS.textMuted },
  taskTxt: { color: COLORS.textPrimary, fontSize: 14 }
});
