import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { Feather, FontAwesome5 } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { WALLET_STORAGE_KEY, SUBSCRIPTIONS_STORAGE_KEY, COLORS } from '../config/constants';

export default function Wallet() {
  const [item, setItem] = useState('');
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [isIncome, setIsIncome] = useState(false);
  const [txs, setTxs] = useState([]);
  const [subs, setSubs] = useState([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const dataTxs = await AsyncStorage.getItem(WALLET_STORAGE_KEY);
      if (dataTxs) {
        const parsedTxs = JSON.parse(dataTxs).map(t => ({
          ...t,
          type: t.type || (t.amount.startsWith('+') ? 'income' : 'expense')
        }));
        setTxs(parsedTxs);
      }
      const dataSubs = await AsyncStorage.getItem(SUBSCRIPTIONS_STORAGE_KEY);
      if (dataSubs) setSubs(JSON.parse(dataSubs));
    } catch (e) {}
  };

  const addTx = async () => {
    if (!item || !amount) return;
    const normalized = amount.replace(/,/g, '.');
    const parts = normalized.split('.');
    const cleanAmount = parts.length > 2 
      ? parts.slice(0, -1).join('') + '.' + parts[parts.length - 1] 
      : normalized;
      
    const parsedAmount = parseFloat(cleanAmount);
    if (isNaN(parsedAmount)) return;
    
    const sign = isIncome ? '+' : '-';
    const txType = isIncome ? 'income' : 'expense';
    const newList = [{ 
      id: Date.now().toString(), 
      title: item.trim(), 
      amount: `${sign}${parsedAmount.toFixed(2)} ${currency}`, 
      time: 'Just now', 
      type: txType 
    }, ...txs];
    
    setTxs(newList);
    await AsyncStorage.setItem(WALLET_STORAGE_KEY, JSON.stringify(newList));
    setItem(''); 
    setAmount('');
  };

  const calcTotal = () => {
    let total = 0;
    txs.forEach(t => {
      const val = parseFloat(t.amount.replace(/[^0-9.-]+/g, ""));
      total += isNaN(val) ? 0 : val;
    });
    subs.forEach(s => {
      const val = parseFloat(s.amount.replace(/[^0-9.-]+/g, ""));
      if (!isNaN(val)) {
        const isYearly = s.time.includes('yearly');
        total -= (isYearly ? Math.abs(val) / 12 : Math.abs(val));
      }
    });
    return total;
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <Text style={styles.header}>Finance</Text>
      <View style={styles.balanceCard}>
        <View style={styles.balHeader}>
          <Text style={styles.balLabel}>TOTAL BALANCE (INCL. SUBS)</Text>
          <FontAwesome5 name="university" size={16} color={COLORS.textMuted} />
        </View>
        <Text style={styles.balVal}>${calcTotal().toFixed(2)}</Text>
        <Text style={styles.balGrowth}>Live Evaluation</Text>
      </View>
      <View style={styles.formCard}>
        <Text style={styles.formTitle}>Quick Add</Text>
        <TextInput
          style={styles.input}
          placeholder="What was it?"
          placeholderTextColor={COLORS.textMuted}
          value={item}
          onChangeText={setItem}
        />
        <TextInput
          style={styles.input}
          placeholder="0.00"
          placeholderTextColor={COLORS.textMuted}
          keyboardType="numeric"
          value={amount}
          onChangeText={setAmount}
        />
        <View style={styles.typeRow}>
          <TouchableOpacity style={[styles.typeBtn, !isIncome && styles.typeExpense]} onPress={() => setIsIncome(false)}>
            <Text style={styles.typeTxt}>Expense</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.typeBtn, isIncome && styles.typeIncome]} onPress={() => setIsIncome(true)}>
            <Text style={styles.typeTxt}>Income</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.currRow}>
          {['USD', 'EUR', 'UAH'].map(c => (
            <TouchableOpacity key={c} style={[styles.currBtn, currency === c && styles.currBtnActive]} onPress={() => setCurrency(c)}>
              <Text style={[styles.currTxt, currency === c && styles.currTxtActive]}>{c}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <TouchableOpacity style={styles.submitBtn} onPress={addTx}>
          <Feather name="plus-circle" size={18} color="#FFF" style={{ marginRight: 8 }} />
          <Text style={styles.submitTxt}>Log Transaction</Text>
        </TouchableOpacity>
      </View>
      <Text style={styles.sectionTitle}>Active Subscriptions</Text>
      {subs.length === 0 ? (
        <Text style={styles.emptyTxt}>Нет активных подписок</Text>
      ) : (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.subScroll}>
          {subs.map(s => (
            <View key={s.id} style={styles.subCard}>
              <Text style={styles.subName}>{s.title}</Text>
              <Text style={styles.subPrice}>{s.amount}</Text>
              <Text style={styles.subRenews}>{s.time}</Text>
            </View>
          ))}
        </ScrollView>
      )}
      <Text style={styles.sectionTitle}>Recent Activity</Text>
      {txs.length === 0 ? (
        <Text style={styles.emptyTxt}>Транзакции отсутствуют</Text>
      ) : (
        txs.map(t => (
          <View key={t.id} style={styles.txRow}>
            <View>
              <Text style={styles.txTitle}>{t.title}</Text>
              <Text style={styles.txTime}>{t.time}</Text>
            </View>
            <Text style={[styles.txAmount, t.type === 'income' ? styles.txPos : styles.txNeg]}>{t.amount}</Text>
          </View>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bgPrimary, paddingHorizontal: 20, paddingTop: 10 },
  header: { fontSize: 28, fontWeight: 'bold', color: COLORS.textPrimary, marginBottom: 15 },
  balanceCard: { backgroundColor: COLORS.surface, padding: 20, borderRadius: 18, borderWidth: 1, borderColor: COLORS.border, marginBottom: 20 },
  balHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  balLabel: { color: COLORS.textMuted, fontSize: 11, fontWeight: 'bold' },
  balVal: { color: COLORS.textPrimary, fontSize: 32, fontWeight: 'bold', marginVertical: 6 },
  balGrowth: { color: COLORS.success, fontSize: 12 },
  formCard: { backgroundColor: COLORS.surface, padding: 16, borderRadius: 18, borderWidth: 1, borderColor: COLORS.border, marginBottom: 20 },
  formTitle: { color: COLORS.textPrimary, fontSize: 16, fontWeight: 'bold', marginBottom: 12 },
  input: { backgroundColor: COLORS.bgPrimary, color: COLORS.textPrimary, padding: 12, borderRadius: 10, borderWidth: 1, borderColor: COLORS.border, marginBottom: 10 },
  typeRow: { flexDirection: 'row', gap: 10, marginBottom: 10 },
  typeBtn: { flex: 1, paddingVertical: 10, alignItems: 'center', backgroundColor: COLORS.bgPrimary, borderRadius: 8, borderWidth: 1, borderColor: COLORS.border },
  typeExpense: { backgroundColor: '#4C1D95' },
  typeIncome: { backgroundColor: '#064E3B' },
  typeTxt: { color: COLORS.textPrimary, fontWeight: 'bold', fontSize: 12 },
  currRow: { flexDirection: 'row', gap: 10, marginBottom: 15 },
  currBtn: { flex: 1, paddingVertical: 8, alignItems: 'center', backgroundColor: COLORS.bgPrimary, borderRadius: 8, borderWidth: 1, borderColor: COLORS.border },
  currBtnActive: { backgroundColor: COLORS.accentPrimary, borderColor: COLORS.accentSecondary },
  currTxt: { color: COLORS.textMuted, fontWeight: 'bold', fontSize: 12 },
  currTxtActive: { color: '#FFF' },
  submitBtn: { flexDirection: 'row', backgroundColor: COLORS.accentSecondary, padding: 14, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  submitTxt: { color: '#FFF', fontWeight: 'bold', fontSize: 14 },
  sectionTitle: { color: COLORS.textPrimary, fontSize: 16, fontWeight: 'bold', marginBottom: 12 },
  emptyTxt: { color: COLORS.textMuted, fontSize: 13, marginBottom: 15 },
  subScroll: { marginBottom: 20 },
  subCard: { backgroundColor: COLORS.surface, padding: 14, borderRadius: 14, borderWidth: 1, borderColor: COLORS.border, marginRight: 12, width: 140 },
  subName: { color: COLORS.textPrimary, fontWeight: 'bold', fontSize: 14 },
  subPrice: { color: COLORS.accentSecondary, fontSize: 16, fontWeight: 'bold', marginVertical: 4 },
  subRenews: { color: COLORS.textMuted, fontSize: 11 },
  txRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: COLORS.surface, padding: 14, borderRadius: 14, borderWidth: 1, borderColor: COLORS.border, marginBottom: 8 },
  txTitle: { color: COLORS.textPrimary, fontWeight: 'bold', fontSize: 14 },
  txTime: { color: COLORS.textMuted, fontSize: 11 },
  txAmount: { fontWeight: 'bold', fontSize: 14 },
  txPos: { color: COLORS.success },
  txNeg: { color: COLORS.textPrimary }
});
