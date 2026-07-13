import React from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity } from 'react-native';
import { useSettings } from '../context/SettingsContext';
import { useCalendar } from '../context/CalendarContext';

export default function Settings({ setView }) {
  const { apiKey, saveApiKey, clearApiKey } = useSettings();
  const { availableCalendars, selectedCalendarId, setSelectedCalendarId, permissionStatus, accessPrivileges } = useCalendar();

  return (
    <View>
      <TouchableOpacity style={styles.backBtn} onPress={() => setView('dashboard')}><Text style={styles.backBtnText}>← Меню</Text></TouchableOpacity>
      <Text style={styles.label}>Ключ Gemini API:</Text>
      <TextInput style={styles.input} secureTextEntry placeholder="API KEY" placeholderTextColor="#8B7BA8" onChangeText={saveApiKey} defaultValue={apiKey} />
      <TouchableOpacity style={styles.delBtn} onPress={clearApiKey}><Text style={styles.btnText}>Очистить Keychain</Text></TouchableOpacity>

      <Text style={[styles.label, { marginTop: 20 }]}>Выбрать календарь iOS:</Text>
      {(permissionStatus !== 'granted' || accessPrivileges === 'writeOnly') && (
        <Text style={styles.warn}>Предоставьте полный доступ к календарям в настройках iOS.</Text>
      )}
      {availableCalendars.map(c => (
        <TouchableOpacity key={c.id} style={[styles.cal, selectedCalendarId === c.id && styles.calActive]} onPress={() => setSelectedCalendarId(c.id)}>
          <Text style={styles.text}>{c.title}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}
const styles = StyleSheet.create({
  backBtn: { alignSelf: 'flex-start', padding: 8, backgroundColor: '#3B2363', borderRadius: 8, marginBottom: 15 },
  backBtnText: { color: '#A78BFA', fontWeight: 'bold' },
  label: { color: '#A78BFA', fontWeight: 'bold', marginBottom: 5 },
  input: { backgroundColor: '#1E1135', color: '#fff', padding: 12, borderRadius: 10, marginBottom: 10 },
  delBtn: { backgroundColor: '#FF3B30', padding: 12, borderRadius: 10, alignItems: 'center' },
  btnText: { color: '#fff', fontWeight: 'bold' },
  warn: { color: '#F59E0B', marginBottom: 10 },
  cal: { backgroundColor: '#1E1135', padding: 12, borderRadius: 10, marginBottom: 5 },
  calActive: { backgroundColor: '#2E1065', borderColor: '#8B5CF6', borderWidth: 1 },
  text: { color: '#fff' }
});
