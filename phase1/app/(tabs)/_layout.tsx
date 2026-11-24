import React from 'react';
import { Tabs } from 'expo-router';
import { Platform, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, typography } from '../../src/theme';
import { TabIcon } from '../../src/components/TabIcon';

export default function TabLayout() {
  const insets = useSafeAreaInsets();
  const bottomInset = Math.max(insets.bottom, Platform.OS === 'ios' ? 28 : 20);
  const tabHeight = 62 + bottomInset;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.tabActive,
        tabBarInactiveTintColor: colors.tabInactive,
        tabBarStyle: [
          styles.tabBar,
          {
            height: tabHeight,
            paddingBottom: bottomInset,
          },
        ],
        tabBarLabelStyle: styles.tabBarLabel,
        tabBarItemStyle: styles.tabBarItem,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Workout',
          tabBarIcon: ({ focused, color }) => (
            <TabIcon name="workout" focused={focused} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: 'History',
          tabBarIcon: ({ focused, color }) => (
            <TabIcon name="history" focused={focused} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="progress"
        options={{
          title: 'Progress',
          tabBarIcon: ({ focused, color }) => (
            <TabIcon name="progress" focused={focused} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="run"
        options={{
          title: 'Run',
          tabBarIcon: ({ focused, color }) => (
            <TabIcon name="run" focused={focused} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: colors.tabBar,
    borderTopWidth: 1,
    borderTopColor: colors.tabBarBorder,
    paddingTop: 8,
  },
  tabBarItem: {
    paddingVertical: 2,
  },
  tabBarLabel: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.semibold,
    marginTop: 2,
  },
});
