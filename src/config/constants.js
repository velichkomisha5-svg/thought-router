import * as FileSystem from 'expo-file-system';

export const SECURE_KEY_ALIAS = "AQ.Ab8RN6JjHcuOOg-U0O5CQx9KD7FVjjKUVT70-HoVTK2sy5cgVg";
export const FIXED_CATEGORIES = ["Входящие", "Учеба", "Работа", "Личное", "Здоровье", "Финансы"];
export const RESERVED_NAMES = ["attachments", ".trp_system"];
export const TMP_DIR = `${FileSystem.documentDirectory}.trp_system/`;
export const FINANCE_JSON_PATH = `${FileSystem.documentDirectory}Финансы/data.json`;
