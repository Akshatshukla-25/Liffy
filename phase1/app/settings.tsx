import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Switch,
  Alert,
  Modal,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import { ChevronLeft } from 'lucide-react-native';

import { colors, spacing, typography, radii } from '../src/theme';
import { Card } from '../src/components/Card';
import { Button } from '../src/components/Button';
import { useAuth } from '../src/context/auth';
import { useSettings } from '../src/context/settings';
import { estimateMaxHr } from '../src/lib/settings';
import {
  buildBackup,
  validateBackup,
  planImport,
  type BackupFile,
} from '../src/lib/backup';
import { repository } from '../src/db/sqliteRepository';

const NOTICE_TEXT = `# Third-Party Notices

This project incorporates third-party datasets and assets:

## Free Exercise DB
- Source: https://github.com/yuhonas/free-exercise-db
- Dataset: exercises.json (mapped to assets/exercises.json)
- Author: yuhonas and contributors (derived from wrkout/exercises.json by Ollie Jennings)
- License: The Unlicense (Public Domain)

This is free and unencumbered software released into the public domain.

Anyone is free to copy, modify, publish, use, compile, sell, or
distribute this software, either in source code form or as a compiled
binary, for any purpose, commercial or non-commercial, and by any
means.

In jurisdictions that recognize copyright laws, the author or authors
of this software dedicate any and all copyright interest in the
software to the public domain. We make this dedication for the benefit
of the public at large and to the detriment of our heirs and
successors. We intend this dedication to be an overt act of
relinquishment in perpetuity of all present and future rights to this
software under copyright law.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.
IN NO EVENT SHALL THE AUTHORS BE LIABLE FOR ANY CLAIM, DAMAGES OR
OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE,
ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR
OTHER DEALINGS IN THE SOFTWARE.

For more information, please refer to <http://unlicense.org/>`;

export default function SettingsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, isGuest, signOut } = useAuth();
  const { settings, weeklyGoal, updateSettings, updateWeeklyGoal } = useSettings();

  const [ageInput, setAgeInput] = useState('');
  const [showAgeModal, setShowAgeModal] = useState(false);
  const [showLicensesModal, setShowLicensesModal] = useState(false);
  const [importingPlan, setImportingPlan] = useState<{
    counts: Record<string, number>;
    upserts: any;
  } | null>(null);
  const [loadingAction, setLoadingAction] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      (window as any).__setImportingPlan = setImportingPlan;
    }
  }, []);

  // Handle unit switch
  const handleSetUnit = (u: 'kg' | 'lb') => {
    updateSettings({ unit: u });
  };

  // Estimate max HR from age
  const handleApplyAgeEstimate = () => {
    const age = parseInt(ageInput.trim(), 10);
    const est = estimateMaxHr(age);
    if (est) {
      updateSettings({ maxHr: est });
      setShowAgeModal(false);
      setAgeInput('');
    } else {
      const msg = 'Please enter an age between 10 and 100.';
      if (Platform.OS === 'web') window.alert(msg);
      else Alert.alert('Invalid Age', msg);
    }
  };

  // Export Backup
  const handleExportBackup = async () => {
    setLoadingAction(true);
    try {
      await repository.init();
      const tables = await repository.exportAllTables();
      const nowIso = new Date().toISOString();
      const backup = buildBackup(tables, nowIso);
      const json = JSON.stringify(backup, null, 2);
      const filename = `liffy-backup-${nowIso.slice(0, 10)}.json`;

      if (Platform.OS === 'web') {
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
      } else {
        const fileUri = `${FileSystem.cacheDirectory}${filename}`;
        await FileSystem.writeAsStringAsync(fileUri, json, {
          encoding: FileSystem.EncodingType.UTF8,
        });
        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(fileUri, {
            mimeType: 'application/json',
            dialogTitle: 'Export Liffy Backup',
            UTI: 'public.json',
          });
        } else {
          Alert.alert('Backup Saved', `Saved backup to ${filename}`);
        }
      }
    } catch (err: any) {
      console.error('Export failed:', err);
      const msg = `Export failed: ${err.message || 'Unknown error'}`;
      if (Platform.OS === 'web') window.alert(msg);
      else Alert.alert('Export Error', msg);
    } finally {
      setLoadingAction(false);
    }
  };

  // Import Backup
  const handlePickBackup = async () => {
    try {
      let content = '';

      if (typeof window !== 'undefined' && (window as any).__testBackupContent) {
        content = (window as any).__testBackupContent;
        (window as any).__testBackupContent = null;
      } else if (Platform.OS === 'web') {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json,application/json';
        const filePromise = new Promise<string>((resolve, reject) => {
          input.onchange = (e: any) => {
            const file = e.target.files?.[0];
            if (!file) return reject(new Error('No file selected'));
            const reader = new FileReader();
            reader.onload = (event) => resolve(event.target?.result as string);
            reader.onerror = () => reject(new Error('Failed to read file'));
            reader.readAsText(file);
          };
        });
        input.click();
        content = await filePromise;
      } else {
        const res = await DocumentPicker.getDocumentAsync({
          type: 'application/json',
          copyToCacheDirectory: true,
        });
        if (res.canceled || !res.assets?.[0]) return;
        content = await FileSystem.readAsStringAsync(res.assets[0].uri);
      }

      let parsed: unknown;
      try {
        parsed = JSON.parse(content);
      } catch {
        const msg = 'File is not valid JSON.';
        if (Platform.OS === 'web') window.alert(msg);
        else Alert.alert('Invalid File', msg);
        return;
      }

      const validation = validateBackup(parsed);
      if (!validation.ok) {
        if (Platform.OS === 'web') window.alert(validation.error);
        else Alert.alert('Invalid Backup', validation.error);
        return;
      }

      await repository.init();
      const local = await repository.exportAllTables();
      const plan = planImport(local, validation.data);

      setImportingPlan(plan);
    } catch (err: any) {
      console.error('Import failed:', err);
      const msg = `Import error: ${err.message || 'Unknown error'}`;
      if (Platform.OS === 'web') window.alert(msg);
      else Alert.alert('Import Error', msg);
    }
  };

  const handleConfirmImport = async () => {
    if (!importingPlan) return;
    setLoadingAction(true);
    try {
      await repository.importRows(importingPlan.upserts);
      setImportingPlan(null);
      const msg = 'Backup successfully imported!';
      if (Platform.OS === 'web') window.alert(msg);
      else Alert.alert('Success', msg);
    } catch (err: any) {
      console.error('Import execution failed:', err);
      const msg = `Failed to apply backup: ${err.message || 'Database error'}`;
      if (Platform.OS === 'web') window.alert(msg);
      else Alert.alert('Import Failed', msg);
    } finally {
      setLoadingAction(false);
    }
  };

  // Delete All Data (Double Confirm)
  const handleDeleteAllData = () => {
    const doDelete = async () => {
      setLoadingAction(true);
      try {
        await repository.deleteAllUserData();
        const msg = 'All user workouts, sets, templates, and history have been deleted.';
        if (Platform.OS === 'web') window.alert(msg);
        else Alert.alert('Data Cleared', msg);
      } catch (err: any) {
        console.error('Delete all failed:', err);
        const msg = `Failed to delete data: ${err.message}`;
        if (Platform.OS === 'web') window.alert(msg);
        else Alert.alert('Error', msg);
      } finally {
        setLoadingAction(false);
      }
    };

    if (Platform.OS === 'web') {
      if (window.confirm('WARNING: Delete all your workouts, routines, and training history?')) {
        if (window.confirm('FINAL CONFIRMATION: This action is permanent and cannot be undone. Wipe all user data?')) {
          doDelete();
        }
      }
    } else {
      Alert.alert(
        'Delete All Data',
        'Are you sure you want to delete all workouts, templates, and history?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: () => {
              Alert.alert(
                'Final Confirmation',
                'This action is permanent and cannot be undone. Are you completely sure?',
                [
                  { text: 'Cancel', style: 'cancel' },
                  { text: 'Permanently Delete', style: 'destructive', onPress: doDelete },
                ]
              );
            },
          },
        ]
      );
    }
  };

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={12} style={styles.backBtn}>
          <ChevronLeft size={20} color={colors.text.primary} strokeWidth={2.0} />
        </TouchableOpacity>
        <Text style={styles.topBarTitle}>Settings</Text>
        <View style={styles.topBarRight} />
      </View>

      <ScrollView contentContainerStyle={styles.container}>
        {/* Account & Sync Engine */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>ACCOUNT & SYNC</Text>
          <Card style={styles.card}>
            <View style={styles.accountHeader}>
              <View style={styles.accountInfo}>
                <Text style={styles.settingTitle}>
                  {isGuest ? 'Offline Guest Mode' : user?.email || 'Logged In Athlete'}
                </Text>
                <Text style={styles.settingDesc}>
                  {isGuest
                    ? 'All workout records and runs are stored locally in SQLite.'
                    : 'Cloud sync active with Supabase. Offline cache enabled.'}
                </Text>
              </View>
              <Button
                title={isGuest ? 'Sign In' : 'Sign Out'}
                variant={isGuest ? 'primary' : 'outline'}
                size="sm"
                fullWidth={false}
                style={styles.accountActionBtn}
                onPress={() => {
                  if (isGuest) {
                    router.push('/(auth)/sign-in');
                  } else {
                    if (Platform.OS === 'web') {
                      if (window.confirm('Sign out of your account?')) {
                        signOut();
                      }
                    } else {
                      Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
                        { text: 'Cancel', style: 'cancel' },
                        { text: 'Sign Out', style: 'destructive', onPress: signOut },
                      ]);
                    }
                  }
                }}
              />
            </View>
            <View style={styles.divider}>
              <View style={styles.row}>
                <Text style={styles.settingDesc}>Local Database Engine</Text>
                <Text style={[styles.settingDesc, { color: colors.accent, fontWeight: '700' }]}>
                  • SQLite Active
                </Text>
              </View>
            </View>
          </Card>
        </View>

        {/* Unit Selection */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>WEIGHT UNIT</Text>
          <Card style={styles.card}>
            <View style={styles.row}>
              <View style={{ flex: 1, marginRight: spacing.sm }}>
                <Text style={styles.settingTitle}>Display Unit</Text>
                <Text style={styles.settingDesc}>Weights are stored in kg and formatted in your choice.</Text>
              </View>
              <View style={styles.segmentContainer}>
                <TouchableOpacity
                  style={[styles.segmentBtn, settings.unit === 'kg' && styles.segmentActive]}
                  onPress={() => handleSetUnit('kg')}
                >
                  <Text style={[styles.segmentText, settings.unit === 'kg' && styles.segmentTextActive]}>
                    kg
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.segmentBtn, settings.unit === 'lb' && styles.segmentActive]}
                  onPress={() => handleSetUnit('lb')}
                >
                  <Text style={[styles.segmentText, settings.unit === 'lb' && styles.segmentTextActive]}>
                    lb
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </Card>
        </View>

        {/* Max HR */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>HEART RATE TARGETS</Text>
          <Card style={styles.card}>
            <View style={styles.row}>
              <View style={styles.flex1}>
                <Text style={styles.settingTitle}>Max Heart Rate</Text>
                <Text style={styles.settingDesc}>Used to anchor aerobic and threshold running zones.</Text>
              </View>
              <View style={styles.inputCol}>
                <TextInput
                  style={styles.numberInput}
                  keyboardType="numeric"
                  placeholder="e.g. 190"
                  placeholderTextColor={colors.text.muted}
                  value={settings.maxHr != null ? String(settings.maxHr) : ''}
                  onChangeText={(val) => {
                    const parsed = parseInt(val.trim(), 10);
                    updateSettings({ maxHr: Number.isFinite(parsed) ? parsed : null });
                  }}
                />
              </View>
            </View>
            <TouchableOpacity
              style={styles.estimateBtn}
              onPress={() => setShowAgeModal(true)}
            >
              <Text style={styles.estimateBtnText}>Estimate from age (Tanaka formula)</Text>
            </TouchableOpacity>
          </Card>
        </View>

        {/* Weekly Goal & Streak */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>WEEKLY TARGET</Text>
          <Card style={styles.card}>
            <View>
              <Text style={styles.settingTitle}>Weekly Session Goal</Text>
              <Text style={styles.settingDesc}>
                Target workouts and runs per week ({weeklyGoal} sessions) to build and keep your streak.
              </Text>
              <View style={styles.goalRow}>
                {[1, 2, 3, 4, 5, 6, 7].map((num) => (
                  <TouchableOpacity
                    key={num}
                    style={[
                      styles.goalBadge,
                      weeklyGoal === num && styles.goalBadgeActive,
                    ]}
                    onPress={() => updateWeeklyGoal(num)}
                    hitSlop={4}
                  >
                    <Text
                      style={[
                        styles.goalBadgeText,
                        weeklyGoal === num && styles.goalBadgeTextActive,
                      ]}
                    >
                      {num}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </Card>
        </View>

        {/* Rest Timer */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>REST TIMER</Text>
          <Card style={styles.card}>
            <View style={styles.row}>
              <View style={styles.flex1}>
                <Text style={styles.settingTitle}>Auto Rest Timer</Text>
                <Text style={styles.settingDesc}>Automatically start a countdown when ticking sets done.</Text>
              </View>
              <Switch
                value={settings.restTimerEnabled}
                onValueChange={(val) => updateSettings({ restTimerEnabled: val })}
                trackColor={{ false: colors.border, true: colors.accent }}
                thumbColor="#FFFFFF"
              />
            </View>

            {settings.restTimerEnabled && (
              <View style={[styles.row, styles.divider]}>
                <View style={styles.flex1}>
                  <Text style={styles.settingTitle}>Rest Duration</Text>
                  <Text style={styles.settingDesc}>
                    {settings.restOverrideSec
                      ? `Fixed ${settings.restOverrideSec}s override`
                      : 'Smart Auto (heavier = longer + RPE bonus)'}
                  </Text>
                </View>
                <View style={styles.stepperContainer}>
                  <TouchableOpacity
                    style={styles.stepBtn}
                    onPress={() => {
                      if (!settings.restOverrideSec) updateSettings({ restOverrideSec: 60 });
                      else if (settings.restOverrideSec <= 30) updateSettings({ restOverrideSec: null });
                      else updateSettings({ restOverrideSec: settings.restOverrideSec - 15 });
                    }}
                  >
                    <Text style={styles.stepBtnText}>−</Text>
                  </TouchableOpacity>
                  <Text style={styles.stepperValue}>
                    {settings.restOverrideSec ? `${settings.restOverrideSec}s` : 'Auto'}
                  </Text>
                  <TouchableOpacity
                    style={styles.stepBtn}
                    onPress={() => {
                      if (!settings.restOverrideSec) updateSettings({ restOverrideSec: 90 });
                      else updateSettings({ restOverrideSec: Math.min(600, settings.restOverrideSec + 15) });
                    }}
                  >
                    <Text style={styles.stepBtnText}>+</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </Card>
        </View>

        {/* Backup & Restore */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>DATA & BACKUP</Text>
          <Card style={styles.card}>
            <Text style={styles.settingTitle}>Offline-First Data Storage</Text>
            <Text style={styles.settingDesc}>
              Export a JSON file containing all workouts, templates, and custom exercises.
            </Text>
            <View style={styles.btnRow}>
              <Button
                title={loadingAction ? "Exporting..." : "Export Backup"}
                variant="outline"
                size="sm"
                onPress={handleExportBackup}
                style={styles.flex1}
              />
              <Button
                title="Import Backup"
                variant="outline"
                size="sm"
                onPress={handlePickBackup}
                style={styles.flex1}
              />
            </View>
          </Card>
        </View>

        {/* Legal & Licenses */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>LEGAL & LICENSES</Text>
          <Card style={styles.card}>
            <View style={styles.row}>
              <View style={styles.flex1}>
                <Text style={styles.settingTitle}>Third-Party Licenses</Text>
                <Text style={styles.settingDesc}>Free Exercise DB Public Domain (Unlicense)</Text>
              </View>
              <TouchableOpacity
                style={styles.viewLicenseBtn}
                onPress={() => setShowLicensesModal(true)}
              >
                <Text style={styles.viewLicenseBtnText}>View Notice</Text>
              </TouchableOpacity>
            </View>
          </Card>
        </View>

        {/* Danger Zone */}
        <View style={styles.section}>
          <Text style={[styles.sectionLabel, { color: colors.danger }]}>DANGER ZONE</Text>
          <Card style={[styles.card, styles.dangerCard]}>
            <Text style={styles.settingTitle}>Delete All User Data</Text>
            <Text style={styles.settingDesc}>
              Permanently wipes all lifting workouts, sets, runs, templates, and custom exercises. Built-in exercises are preserved.
            </Text>
            <Button
              title="Delete All Data"
              variant="outline"
              size="sm"
              onPress={handleDeleteAllData}
              style={styles.dangerBtn}
            />
          </Card>
        </View>
      </ScrollView>

      {/* Age Estimation Modal */}
      <Modal visible={showAgeModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Estimate Max Heart Rate</Text>
            <Text style={styles.modalDesc}>
              Tanaka Formula: HRmax = 208 − 0.7 × Age
            </Text>
            <TextInput
              style={styles.ageInput}
              placeholder="Enter your age (e.g. 25)"
              placeholderTextColor={colors.text.muted}
              keyboardType="numeric"
              value={ageInput}
              onChangeText={setAgeInput}
              autoFocus
            />
            <View style={styles.modalBtnRow}>
              <Button
                title="Cancel"
                variant="ghost"
                size="sm"
                onPress={() => setShowAgeModal(false)}
                style={styles.flex1}
              />
              <Button
                title="Calculate & Apply"
                size="sm"
                onPress={handleApplyAgeEstimate}
                style={styles.flex1}
              />
            </View>
          </View>
        </View>
      </Modal>

      {/* Import Confirmation Dialog */}
      <Modal visible={Boolean(importingPlan)} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Confirm Backup Import</Text>
            <Text style={styles.modalDesc}>
              The following new or updated records were detected in the backup file:
            </Text>

            <View style={styles.countsContainer}>
              {importingPlan &&
                Object.entries(importingPlan.counts).map(([tbl, count]) => (
                  <View key={tbl} style={styles.countRow}>
                    <Text style={styles.countTable}>{tbl}</Text>
                    <Text style={styles.countNum}>{count} rows</Text>
                  </View>
                ))}
            </View>

            <View style={styles.modalBtnRow}>
              <Button
                title="Cancel"
                variant="ghost"
                size="sm"
                onPress={() => setImportingPlan(null)}
                style={styles.flex1}
              />
              <Button
                title="Apply Import"
                size="sm"
                onPress={handleConfirmImport}
                style={styles.flex1}
              />
            </View>
          </View>
        </View>
      </Modal>

      {/* Licenses Modal */}
      <Modal visible={showLicensesModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalBox, styles.licenseBox]}>
            <Text style={styles.modalTitle}>Licenses & Third-Party Notices</Text>
            <ScrollView style={styles.licenseScroll}>
              <Text style={styles.licenseContentText}>{NOTICE_TEXT}</Text>
            </ScrollView>
            <Button
              title="Close"
              size="sm"
              onPress={() => setShowLicensesModal(false)}
              style={styles.fullWidth}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backBtn: {
    paddingVertical: spacing.xs,
    paddingRight: spacing.sm,
  },
  topBarTitle: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.bold,
    color: colors.text.primary,
  },
  topBarRight: {
    width: 48,
  },
  container: {
    padding: spacing.base,
    paddingBottom: spacing.xxxl,
  },
  section: {
    marginBottom: spacing.xl,
  },
  sectionLabel: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.bold,
    color: colors.text.secondary,
    letterSpacing: 1,
    marginBottom: spacing.xs,
  },
  card: {
    padding: spacing.base,
  },
  accountHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.md,
  },
  accountInfo: {
    flex: 1,
  },
  accountActionBtn: {
    minWidth: 88,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  divider: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    marginTop: spacing.md,
    paddingTop: spacing.md,
  },
  flex1: {
    flex: 1,
  },
  settingTitle: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.bold,
    color: colors.text.primary,
    marginBottom: 2,
  },
  settingDesc: {
    fontSize: typography.fontSize.xs,
    color: colors.text.secondary,
    lineHeight: typography.lineHeight.xs,
    marginTop: 2,
    marginRight: spacing.sm,
  },
  segmentContainer: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceElevated,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 2,
  },
  segmentBtn: {
    paddingVertical: 6,
    paddingHorizontal: 16,
    borderRadius: radii.sm,
  },
  segmentActive: {
    backgroundColor: colors.accentDim,
  },
  segmentText: {
    fontSize: typography.fontSize.sm,
    color: colors.text.muted,
    fontWeight: typography.fontWeight.bold,
  },
  segmentTextActive: {
    color: colors.accent,
  },
  inputCol: {
    width: 80,
  },
  numberInput: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.bold,
    color: colors.text.primary,
    textAlign: 'center',
  },
  estimateBtn: {
    marginTop: spacing.sm,
    paddingTop: spacing.xs,
  },
  estimateBtnText: {
    fontSize: typography.fontSize.xs,
    color: colors.accent,
    fontWeight: typography.fontWeight.semibold,
  },
  stepperContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceElevated,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  stepBtn: {
    width: 36,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepBtnText: {
    color: colors.accent,
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.bold,
  },
  stepperValue: {
    minWidth: 48,
    textAlign: 'center',
    fontSize: typography.fontSize.xs,
    color: colors.text.primary,
    fontWeight: typography.fontWeight.bold,
  },
  btnRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.md,
  },
  viewLicenseBtn: {
    paddingVertical: 6,
    paddingHorizontal: spacing.sm,
    borderRadius: radii.sm,
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.border,
  },
  viewLicenseBtnText: {
    fontSize: typography.fontSize.xs,
    color: colors.accent,
    fontWeight: typography.fontWeight.semibold,
  },
  dangerCard: {
    borderColor: 'rgba(255, 69, 58, 0.25)',
    borderWidth: 1,
  },
  dangerBtn: {
    borderColor: colors.danger,
    marginTop: spacing.md,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.base,
  },
  modalBox: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
  },
  modalTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.bold,
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  modalDesc: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
    marginBottom: spacing.base,
  },
  ageInput: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm,
    fontSize: typography.fontSize.base,
    color: colors.text.primary,
    marginBottom: spacing.base,
  },
  modalBtnRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  countsContainer: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: radii.md,
    padding: spacing.sm,
    marginBottom: spacing.base,
  },
  countRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  countTable: {
    fontSize: typography.fontSize.xs,
    color: colors.text.secondary,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  countNum: {
    fontSize: typography.fontSize.xs,
    color: colors.accent,
    fontWeight: typography.fontWeight.bold,
  },
  licenseBox: {
    maxHeight: '80%',
  },
  licenseScroll: {
    marginVertical: spacing.md,
    backgroundColor: colors.surfaceElevated,
    borderRadius: radii.md,
    padding: spacing.base,
  },
  licenseContentText: {
    fontSize: 11,
    color: colors.text.secondary,
    lineHeight: 18,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  fullWidth: {
    width: '100%',
  },
  goalRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.md,
  },
  goalBadge: {
    flex: 1,
    height: 38,
    borderRadius: radii.md,
    backgroundColor: colors.surfaceHighlight,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  goalBadgeActive: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  goalBadgeText: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.bold,
    color: colors.text.secondary,
  },
  goalBadgeTextActive: {
    color: '#000000',
  },
});
