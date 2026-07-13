import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { SettingsProvider } from './src/context/SettingsContext';
import { CalendarProvider, useCalendar } from './src/context/CalendarContext';
import { FinanceProvider, useFinance } from './src/context/FinanceContext';

import Dashboard from './src/components/Dashboard';
import InputScreen from './src/components/InputScreen';
import Explorer from './src/components/Explorer';
import Wallet from './src/components/Wallet';
import Chat from './src/components/Chat';
import Settings from './src/components/Settings';

function RootNavigator() {
  const [view, setView] = useState('dashboard');
  const { refreshCalendars } = useCalendar();
  const { refresh: refreshFinance } = useFinance();

  useEffect(() => {
    refreshCalendars();
    refreshFinance();
  }, [refreshCalendars, refreshFinance]);

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        {view === 'dashboard' && <Dashboard setView={setView} loadFinance={refreshFinance} />}
        {view === 'input' && <InputScreen setView={setView} />}
        {view === 'explorer' && <Explorer setView={setView} />}
        {view === 'finance' && <Wallet setView={setView} />}
        {view === 'chat' && <Chat setView={setView} />}
        {view === 'settings' && <Settings setView={setView} />}
      </ScrollView>
    </View>
  );
}

export default function App() {
  return (
    <SettingsProvider>
      <CalendarProvider>
        <FinanceProvider>
          <RootNavigator />
        </FinanceProvider>
      </CalendarProvider>
    </SettingsProvider>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F071E', paddingTop: 60, paddingHorizontal: 20 },
  scroll: { paddingBottom: 40 }
});
