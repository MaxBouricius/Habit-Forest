import { useState } from 'react';
import { TextInput, View } from 'react-native';
import { Btn } from './Btn';
import { FONT, Text, pixelSize } from './PixelText';
import { POPUP_ART } from './PopupFrame';

const INK = '#3B2A1A';
const SOFT = '#6B5238';

const TITLE = 'Welcome!';
const MESSAGE = 'Every habit you keep grows into a tree. Give your forest a name to get started.';
const PLACEHOLDER = 'My forest';

export function WelcomePanel({ onSave }: { onSave: (name: string) => void }) {
  const [draft, setDraft] = useState('');
  const ok = draft.trim().length > 0;

  return (
    <View style={{ alignItems: 'center' }}>
      <Text style={{ fontSize: 24, color: INK }}>{TITLE}</Text>
      <Text style={{ fontSize: 16, color: SOFT, textAlign: 'center', marginVertical: 10 }}>{MESSAGE}</Text>
      <TextInput
        value={draft}
        onChangeText={setDraft}
        maxLength={20}
        placeholder={PLACEHOLDER}
        placeholderTextColor="#9a8466"
        returnKeyType="done"
        onSubmitEditing={() => ok && onSave(draft)}
        style={{
          width: '100%',
          backgroundColor: '#fff',
          borderWidth: POPUP_ART,
          borderColor: '#000',
          paddingHorizontal: 10,
          paddingVertical: 6,
          fontSize: pixelSize(18),
          fontFamily: FONT,
          color: INK,
        }}
      />
      <View style={{ marginTop: 8 }}>
        <Btn label="Start" disabled={!ok} onPress={() => onSave(draft)} />
      </View>
    </View>
  );
}