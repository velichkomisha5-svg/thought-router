import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, StatusBar } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from './src/config/constants';

import Dashboard from './src/components/Dashboard';
import InputScreen from './src/components/InputScreen';
import Explorer from './src/components/Explorer';
import Chat from './src/components/Chat';
import Wallet from './src/components/Wallet';
import GoogleSync from './src/components/GoogleSync';
import Settings from './src/components/Settings';

export default function App() {
  const [activeTab, setActiveTab] = useState('DASH');

  const renderScreen = () => {
    switch (activeTab) {
      case 'DASH': return <Dashboard onNavigate={setActiveTab} />;
      case 'INPUT': return <InputScreen />;
      case 'VAULT': return <Explorer />;
      case 'AI': return <Chat />;
      case 'WALLET': return <Wallet />;
      case 'GOOGLE': return <GoogleSync />;
      case 'SETUP': return <Settings />;
      default: return <Dashboard onNavigate={setActiveTab} />;
    }
  };

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor={COLORS.bgPrimary} />
        <View style={styles.content}>
          {renderScreen()}
        </View>

        <View style={styles.tabBar}>
          {[
            { id: 'DASH', label: 'DASH', icon: 'grid-outline' },
            { id: 'VAULT', label: 'VAULT', icon: 'folder-open-outline' },
            { id: 'AI', label: 'AI', icon: 'hardware-chip-outline' },
            { id: 'WALLET', label: 'WALLET', icon: 'wallet-outline' },
            { id: 'GOOGLE', label: 'GOOGLE', icon: 'logo-google' },
            { id: 'SETUP', label: 'SETUP', icon: 'settings-outline' }
          ].map((t) => (
            <TouchableOpacity key={t.id} style={styles.tabItem} onPress={() => setActiveTab(t.id)}>
              <Ionicons name={t.icon} size={20} color={activeTab === t.id ? COLORS.accentSecondary : COLORS.textMuted} />
              <Text style={[styles.tabLabel, activeTab === t.id && styles.tabLabelActive]}>{t.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bgPrimary },
  content: { flex: 1 },
  tabBar: { flexDirection: 'row', backgroundColor: COLORS.surface, borderTopWidth: 1, borderTopColor: COLORS.border, paddingVertical: 10 },
  tabItem: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  tabLabel: { color: COLORS.textMuted, fontSize: 9, fontWeight: 'bold', marginTop: 4 },
  tabLabelActive: { color: COLORS.accentSecondary }
});
