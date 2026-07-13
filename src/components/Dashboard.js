import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity } from 'react-native';

export default function Dashboard({ setView, loadFinance }) {
  return (
    <View style={styles.grid}>
      <TouchableOpacity style={styles.card} onPress={() => setView('input')}>
        <Text style={styles.cardTitle}>Быстрый ввод</Text>
        <Text style={styles.cardDesc}>Фиксация текста и аудиозаметок</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.card} onPress={() => setView('explorer')}>
        <Text style={styles.cardTitle}>Проводник</Text>
        <Text style={styles.cardDesc}>Хранилище Obsidian</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.card} onPress={() => { loadFinance(); setView('finance'); }}>
        <Text style={styles.cardTitle}>Кошелек</Text>
        <Text style={styles.cardDesc}>Траты, бюджет, подписки</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.card} onPress={() => setView('chat')}>
        <Text style={styles.cardTitle}>Песочница Gemini</Text>
        <Text style={styles.cardDesc}>Прямой диалог с моделью 3.5</Text>
      </TouchableOpacity>
      <TouchableOpacity style={[styles.card, { width: '100%' }]} onPress={() => setView('settings')}>
        <Text style={styles.cardTitle}>Настройки</Text>
        <Text style={styles.cardDesc}>Управление API ключами и календарями</Text>
      </TouchableOpacity>
    </View>
  );
}
const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, justifyContent: 'space-between' },
  card: { backgroundColor: '#1E1135', width: '48%', padding: 16, borderRadius: 15, marginBottom: 10, borderWidth: 1, borderColor: '#4C1D95' },
  cardTitle: { fontSize: 16, fontWeight: 'bold', color: '#DDD6FE', marginBottom: 6 },
  cardDesc: { fontSize: 12, color: '#8B7BA8' }
});
