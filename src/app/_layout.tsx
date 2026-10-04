import { Stack } from 'expo-router';
import { SQLiteProvider } from 'expo-sqlite';
import { migrateDbIfNeeded } from '../db/schema';

export default function RootLayout() {
  return (
    <SQLiteProvider databaseName="forest.db" onInit={migrateDbIfNeeded}>
      <Stack screenOptions={{ headerShown: false }} />
    </SQLiteProvider>
  );
}