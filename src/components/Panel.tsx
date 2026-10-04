import { ReactNode, useEffect } from 'react';
import { BackHandler, Pressable, View } from 'react-native';
import { PopupFrame } from './PopupFrame';

type Props = { visible: boolean; onClose: () => void; children?: ReactNode };

// A popup over the current screen: dimmed backdrop, tap outside or press Back to close.
export function Panel({ visible, onClose, children }: Props) {
  useEffect(() => {
    if (!visible) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      onClose();
      return true;
    });
    return () => sub.remove();
  }, [visible, onClose]);

  if (!visible) return null;

  return (
    <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'center', alignItems: 'center' }}>
      <Pressable
        onPress={onClose}
        style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.55)' }}
      />
      <PopupFrame style={{ width: '90%' }}>{children}</PopupFrame>
    </View>
  );
}