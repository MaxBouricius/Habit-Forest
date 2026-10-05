import { Pressable } from 'react-native';
import { Text } from './PixelText';

type Props = {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  selected?: boolean;
};

export function Btn({ label, onPress, disabled, selected }: Props) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => ({
        backgroundColor: disabled ? '#9aa9b3' : selected ? '#1f5f8f' : pressed ? '#2f6f9f' : '#4aa3df',
        paddingVertical: 8,
        paddingHorizontal: 12,
        margin: 4,
        borderWidth: 2,
        borderColor: selected ? '#000000' : 'transparent',
      })}
    >
      <Text style={{ color: '#fff' }}>{label}</Text>
    </Pressable>
  );
}