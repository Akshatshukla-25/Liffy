import { Platform } from 'react-native';

export function setupNotificationHandler() {
  if (Platform.OS === 'web') return;
  try {
    const Notifications = require('expo-notifications');
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: false,
        shouldShowBanner: false,
        shouldShowList: false,
        shouldPlaySound: false,
        shouldSetBadge: false,
      }),
    });
  } catch {}
}

export async function scheduleRestNotificationAsync(endsAtMs: number): Promise<string | null> {
  if (Platform.OS === 'web') return null;
  if (endsAtMs <= Date.now()) return null;
  try {
    const Notifications = require('expo-notifications');
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== 'granted') return null;

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('rest-timer', {
        name: 'Rest Timer',
        importance: Notifications.AndroidImportance.HIGH,
        sound: 'default',
        vibrationPattern: [0, 250, 250, 250],
      });
    }

    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Rest finished!',
        body: 'Time for your next set.',
        sound: true,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: new Date(endsAtMs),
        channelId: Platform.OS === 'android' ? 'rest-timer' : undefined,
      },
    });
    return id;
  } catch {
    return null;
  }
}

export async function cancelRestNotificationAsync(id: string | null) {
  if (Platform.OS === 'web' || !id) return;
  try {
    const Notifications = require('expo-notifications');
    await Notifications.cancelScheduledNotificationAsync(id);
  } catch {}
}
