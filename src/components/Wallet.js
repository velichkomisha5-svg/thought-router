import React, { useState } from 'react';
import { StyleSheet, Text, View, TextInput, Switch, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useFinance } from '../context/FinanceContext';

export default function Wallet({ setView }) {
  const { financeSummary, financeSaving, addTransaction } = useFinance();
  const [item, setItem] = useState('');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [currency, setCurrency] = useState('UAH');
  const [isSub, setIsSub] = useState(false);

  const handleAdd = async () => {
    if (financeSaving || !item.trim() || !amount.trim()) return;
    await addTransaction({
      item: item.trim(), amount: parseFloat(amount), currency, note: note.trim(),
      date: new Date().toLocaleDateString('ru-RU')
    }, { isSubscription: isSub });
    setItem(''); setAmount(''); setNote('');
  };

  return (
    <View>
      <TouchableOpacity style={styles.backBtn} onPress={() => setView('dashboard')}><Text style={styles.backBtnText}>← Меню</Text></TouchableOpacity>
      <TextInput style={styles.input} placeholder="Что купили" placeholderTextColor="#8B7BA8" value={item} onChangeText={setItem} />
      <TextInput style={styles.input} placeholder="Сумма" placeholderTextColor="#8B7BA8" keyboardType="numeric" value={amount} onChangeText={setAmount} />
      <TextInput style={styles.input} placeholder="Примечание" placeholderTextColor="#8B7BA8" value={note} onChangeText={setNote} />
      <View style={styles.grid}>
        {['UAH', 'USD', 'EUR'].map(cur => (
          <TouchableOpacity key={cur} onPress={() => setCurrency(cur)} style={[styles.chip, currency === cur && styles.chipActive]}><Text style={styles.text}>{cur}</Text></TouchableOpacity>
        ))}
      </View>
      <View style={styles.row}><Text style={styles.label}>Это ежемесячная подписка</Text><Switch value={isSub} onValueChange={setIsSub} /></View>
      <TouchableOpacity style={styles.btn} onPress={handleAdd} disabled={financeSaving}>
        {financeSaving ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Добавить запись</Text>}
      </TouchableOpacity>
    </View>
  );
}
const styles = StyleSheet.create({
  backBtn: { alignSelf: 'flex-start', padding: 8, backgroundColor: '#3B2363', borderRadius: 8, marginBottom: 15 },
  backBtnText: { color: '#A78BFA', fontWeight: 'bold' },
  input: { backgroundColor: '#1E1135', color: '#fff', padding: 12, borderRadius: 10, marginBottom: 10 },
  grid: { flexDirection: 'row', gap: 8, marginBottom: 15 },
  chip: { backgroundColor: '#2E1065', padding: 10, borderRadius: 10 },
  chipActive: { backgroundColor: '#8B5CF6' },
  text: { color: '#fff' },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 15 },
  label: { color: '#A78BFA' },
  btn: { backgroundColor: '#7C3AED', padding: 15, borderRadius: 12, alignItems: 'center' },
  btnText: { color: '#fff', fontWeight: 'bold' }
});
