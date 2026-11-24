import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';
import { hapticFor, HapticEvent } from './tokens';

export function triggerHaptic(event: HapticEvent = 'tap') {
  if (Platform.OS === 'web') return;
  try {
    const type = hapticFor[event];
    switch (type) {
      case 'light':
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        break;
      case 'medium':
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        break;
      case 'select':
        Haptics.selectionAsync();
        break;
      case 'success':
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        break;
      case 'warning':
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        break;
    }
  } catch (_) {}
}
