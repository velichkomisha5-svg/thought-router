import * as FileSystem from 'expo-file-system';
import { TMP_DIR, FINANCE_JSON_PATH } from '../config/constants';

let financeLock = false;
export const withFinanceLock = async (fn) => {
  while (financeLock) {
    await new Promise(r => setTimeout(r, 100));
  }
  financeLock = true;
  try {
    return await fn();
  } finally {
    financeLock = false;
  }
};

export const writeAtomic = async (fileUri, content, encoding = FileSystem.EncodingType.UTF8) => {
  await FileSystem.makeDirectoryAsync(TMP_DIR, { intermediates: true }).catch(() => {});
  const fileName = fileUri.substring(fileUri.lastIndexOf('/') + 1);
  const tempUri = `${TMP_DIR}${Date.now()}_${fileName}.tmp`;
  const backupUri = `${TMP_DIR}${fileName}.bak`;
  const exists = await FileSystem.getInfoAsync(fileUri);
  try {
    if (exists.exists) {
      await FileSystem.deleteAsync(backupUri, { idempotent: true });
      await FileSystem.copyAsync({ from: fileUri, to: backupUri });
    }
    await FileSystem.writeAsStringAsync(tempUri, content, { encoding });
    if (exists.exists) {
      await FileSystem.deleteAsync(fileUri, { idempotent: true });
    }
    await FileSystem.moveAsync({ from: tempUri, to: fileUri });
  } catch (e) {
    if (exists.exists) {
      const backupExists = await FileSystem.getInfoAsync(backupUri);
      if (backupExists.exists) {
        await FileSystem.copyAsync({ from: backupUri, to: fileUri }).catch(() => {});
      }
    }
    await FileSystem.deleteAsync(tempUri, { idempotent: true }).catch(() => {});
    throw new Error(`Сбой атомарной записи файла: ${e.message}`);
  }
};

export const loadFinanceData = async () => {
  try {
    const info = await FileSystem.getInfoAsync(FINANCE_JSON_PATH);
    if (!info.exists) return { expenses: [], subscriptions: [] };
    const raw = await FileSystem.readAsStringAsync(FINANCE_JSON_PATH);
    return JSON.parse(raw);
  } catch (e) {
    return { expenses: [], subscriptions: [] };
  }
};

export const saveFinanceDataAtomic = async (data) => {
  await writeAtomic(FINANCE_JSON_PATH, JSON.stringify(data));
};

export const syncObsidianFinance = async (data) => {
  const file = `${FileSystem.documentDirectory}Финансы/Журнал_Финансов.md`;
  let md = `---
type: finance_ledger
modified: ${new Date().toISOString()}
---

%% WARNING: This file is fully automated. Do NOT edit manually. %%

# Финансовый регистр

## Активные подписки
| Подписка | Стоимость | Период | Примечание |
|---|---|---|---|
`;
  data.subscriptions.forEach(s => {
    md += `| ${s.item} | ${s.amount} ${s.currency} | ${s.billing} | ${s.note || ''} |\n`;
  });
  md += `\n## Разовые расходы\n| Дата | Предмет | Сумма | Примечание |\n|---|---|---|---|\n`;
  data.expenses.forEach(e => {
    md += `| ${e.date} | ${e.item} | ${e.amount} ${e.currency} | ${e.note || ''} |\n`;
  });
  await writeAtomic(file, md);
};
