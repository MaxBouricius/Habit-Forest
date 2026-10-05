import { useState } from 'react';
import { Alert, View } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { useSQLiteContext } from 'expo-sqlite';
import { Btn } from './Btn';
import { Text } from './PixelText';
import { buildBackup, restoreBackup } from '../db/backup';
import { parseBackup } from '../db/backupFormat';

const INK = '#3B2A1A';
const SOFT = '#6B5238';

const pad = (n: number) => String(n).padStart(2, '0');
function today() {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

type Props = {
  onClose: () => void;
  onRestored: () => void; // called after a restore, so the screens reload their data
};

export function SettingsPanel({ onClose, onRestored }: Props) {
  const db = useSQLiteContext();
  const [busy, setBusy] = useState(false);

  const exportBackup = async () => {
    setBusy(true);
    try {
      const backup = await buildBackup(db);
      const file = new File(Paths.cache, `habit-forest-backup-${today()}.json`);
      if (file.exists) file.delete();
      await file.write(JSON.stringify(backup, null, 2));

      if (!(await Sharing.isAvailableAsync())) {
        Alert.alert('Sharing is not available', 'This device cannot open the share sheet.');
        return;
      }
      await Sharing.shareAsync(file.uri, { mimeType: 'application/json', dialogTitle: 'Save your forest backup' });
    } catch (e) {
      Alert.alert('Backup failed', String(e));
    } finally {
      setBusy(false);
    }
  };

  const restore = async () => {
    setBusy(true);
    try {
      const picked = await DocumentPicker.getDocumentAsync({ type: '*/*', copyToCacheDirectory: true });
      if (picked.canceled) return;

      // Read and check the file first. Nothing in the app is touched until the user confirms below.
      const text = await new File(picked.assets[0].uri).text();
      const backup = parseBackup(text);

      const active = backup.trees.filter((t) => t.archivedAt === null).length;
      const when = backup.exportedAt ? new Date(backup.exportedAt).toLocaleDateString() : 'an unknown date';
      Alert.alert(
        'Replace everything?',
        `This backup was made on ${when}. It has ${active} active ${active === 1 ? 'tree' : 'trees'} ` +
          `(${backup.trees.length} in total) and ${backup.waterings.length} waterings` +
          `${backup.parkName ? `, in ${backup.parkName}` : ''}.\n\n` +
          'Restoring replaces everything currently in the app. Back up first if you want to keep it.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Replace',
            style: 'destructive',
            onPress: async () => {
              try {
                await restoreBackup(db, backup);
                onRestored();
                Alert.alert('Restored', 'Your forest is back.');
                onClose();
              } catch (e) {
                Alert.alert('Restore failed', `Nothing was changed.\n\n${String(e)}`);
              }
            },
          },
        ]
      );
    } catch (e) {
      Alert.alert('Could not read that file', e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={{ alignItems: 'center' }}>
      <Text style={{ fontSize: 24, color: INK }}>Settings</Text>

      <Text style={{ fontSize: 12, color: SOFT, textAlign: 'center', marginTop: 12 }}>
        Save your trees and waterings to a file you can keep somewhere safe.
      </Text>
      <Btn label="Back up" disabled={busy} onPress={exportBackup} />

      <Text style={{ fontSize: 12, color: SOFT, textAlign: 'center', marginTop: 12 }}>
        Bring back a saved forest. This replaces everything in the app.
      </Text>
      <Btn label="Restore" disabled={busy} onPress={restore} />

      <View style={{ marginTop: 16 }}>
        <Btn label="Close" onPress={onClose} />
      </View>
    </View>
  );
}