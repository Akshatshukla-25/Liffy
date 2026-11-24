import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as Crypto from 'expo-crypto';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { Settings, Plus, Upload, Check, Activity, Heart, Footprints } from 'lucide-react-native';

import { useSettings } from '../../src/context/settings';
import { colors, spacing, typography, radii } from '../../src/theme';
import { Card } from '../../src/components/Card';
import { Button } from '../../src/components/Button';
import { ChunkyButton } from '../../src/motion/ChunkyButton';
import { RunAccomplishmentModal, type RunSummaryData } from '../../src/components/RunAccomplishmentModal';
import { repository } from '../../src/db/sqliteRepository';
import {
  type RunRow,
  type RunSummary,
  runSummary,
  zoneRanges,
  parseDuration,
} from '../../src/lib/runs';
import {
  parseGpx,
  summarizeGpx,
  gpxToRun,
  gpxType,
  looksLikeRun,
  type GpxSummary,
} from '../../src/lib/gpx';
import { paceSecPerKm, formatPace } from '../../src/lib/running';

if (typeof window !== 'undefined') {
  (window as any).__repository = repository;
}

function formatDate(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return iso;
  }
}

function formatDurationSeconds(sec: number): string {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  if (h > 0) {
    return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }
  return `${m}:${String(s).padStart(2, '0')}`;
}

export default function RunScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { settings } = useSettings();

  const [runs, setRuns] = useState<RunRow[]>([]);
  const [loading, setLoading] = useState(true);

  // Add Run Form State
  const [showAddModal, setShowAddModal] = useState(false);
  const [addDate, setAddDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [addDistance, setAddDistance] = useState('');
  const [addTime, setAddTime] = useState('');
  const [addHr, setAddHr] = useState('');
  const [addRpe, setAddRpe] = useState('');
  const [addNotes, setAddNotes] = useState('');

  // GPX Preview Modal State
  const [gpxPreview, setGpxPreview] = useState<GpxSummary | null>(null);
  const [selectedRunDetail, setSelectedRunDetail] = useState<RunRow | null>(null);
  const [accomplishmentData, setAccomplishmentData] = useState<RunSummaryData | null>(null);

  const loadRuns = useCallback(async () => {
    try {
      await repository.init();
      const list = await repository.listRuns(100, 0);
      setRuns(list);
    } catch (err) {
      console.error('Failed to load runs:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRuns();
  }, [loadRuns]);

  // Unit conversions
  const isImperial = settings.unit === 'lb';
  const distUnit = isImperial ? 'mi' : 'km';
  const paceUnit = isImperial ? '/mi' : '/km';

  const formatDistanceM = (meters: number): string => {
    if (isImperial) {
      const mi = meters / 1609.344;
      return `${mi.toFixed(2)} mi`;
    }
    const km = meters / 1000;
    return `${km.toFixed(2)} km`;
  };

  const formatDistValue = (km: number): string => {
    if (isImperial) {
      return (km * 0.621371).toFixed(1);
    }
    return km.toFixed(1);
  };

  const formatPaceValue = (secPerKm: number | null): string => {
    if (secPerKm === null) return '--:--';
    if (isImperial) {
      const secPerMi = secPerKm * 1.609344;
      return formatPace(secPerMi);
    }
    return formatPace(secPerKm);
  };

  // Run Summary
  const summary: RunSummary = runSummary(runs, new Date().toISOString());

  // Heart Rate Zones
  const hrZones = settings.maxHr ? zoneRanges(settings.maxHr) : null;
  const zoneColors = [colors.info, colors.success, colors.accent, colors.warning, colors.danger];
  const zoneLabels = [
    'Recovery (50-60%)',
    'Aerobic Base (60-70%)',
    'Tempo Steady (70-80%)',
    'Threshold (80-90%)',
    'Peak Effort (90-100%)',
  ];

  // Handle Save Manual Run
  const handleSaveManualRun = async () => {
    const distNum = parseFloat(addDistance.trim().replace(',', '.'));
    if (!distNum || distNum <= 0 || isNaN(distNum)) {
      const msg = `Please enter a valid distance in ${distUnit}.`;
      if (Platform.OS === 'web') window.alert(msg);
      else Alert.alert('Invalid Distance', msg);
      return;
    }

    const durSec = parseDuration(addTime);
    if (!durSec) {
      const msg = 'Please enter duration as mm:ss or h:mm:ss (e.g. 25:30 or 1:05:00).';
      if (Platform.OS === 'web') window.alert(msg);
      else Alert.alert('Invalid Duration', msg);
      return;
    }

    const distanceM = isImperial
      ? Math.round(distNum * 1609.344)
      : Math.round(distNum * 1000);

    const hrNum = parseInt(addHr.trim(), 10);
    const avgHr = !isNaN(hrNum) && hrNum > 30 && hrNum < 250 ? hrNum : null;

    const rpeNum = parseFloat(addRpe.trim().replace(',', '.'));
    const rpe = !isNaN(rpeNum) && rpeNum >= 1 && rpeNum <= 10 ? rpeNum : null;

    let startedAtIso = new Date().toISOString();
    try {
      const parsed = Date.parse(addDate);
      if (!isNaN(parsed)) {
        startedAtIso = new Date(parsed).toISOString();
      }
    } catch (_) {}

    const newRun: RunRow = {
      id: Crypto.randomUUID(),
      startedAt: startedAtIso,
      distanceM,
      durationS: durSec,
      avgHr,
      rpe,
      notes: addNotes.trim() || null,
      source: 'manual',
      externalId: null,
    };

    try {
      await repository.saveRun(newRun);
      setShowAddModal(false);
      setAddDistance('');
      setAddTime('');
      setAddHr('');
      setAddRpe('');
      setAddNotes('');
      await loadRuns();

      const distKm = distanceM / 1000;
      const paceVal = distKm > 0 ? (durSec / 60) / distKm : 0;
      const isLongest = summary.longestKm > 0 && distKm >= summary.longestKm;
      setAccomplishmentData({
        distanceKm: distKm,
        durationSeconds: durSec,
        avgHr: avgHr || null,
        rpe: rpe || null,
        paceMinKm: paceVal,
        isLongest,
      });
    } catch (err: any) {
      console.error('Failed to save run:', err);
      const msg = `Could not save run: ${err.message || 'Database error'}`;
      if (Platform.OS === 'web') window.alert(msg);
      else Alert.alert('Error', msg);
    }
  };

  // Handle Pick & Parse GPX File
  const handlePickGpx = async () => {
    try {
      let content = '';
      let filename = '';

      if (typeof window !== 'undefined' && (window as any).__testGpxContent) {
        content = (window as any).__testGpxContent;
        filename = (window as any).__testGpxFilename || 'test_activity.gpx';
        (window as any).__testGpxContent = null;
      } else if (Platform.OS === 'web') {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.gpx,application/gpx+xml,text/xml';
        const filePromise = new Promise<{ content: string; name: string }>((resolve, reject) => {
          input.onchange = (e: any) => {
            const file = e.target.files?.[0];
            if (!file) return reject(new Error('No file selected'));
            const reader = new FileReader();
            reader.onload = (event) =>
              resolve({ content: event.target?.result as string, name: file.name });
            reader.onerror = () => reject(new Error('Failed to read file'));
            reader.readAsText(file);
          };
        });
        input.click();
        const res = await filePromise;
        content = res.content;
        filename = res.name;
      } else {
        const res = await DocumentPicker.getDocumentAsync({
          type: '*/*',
          copyToCacheDirectory: true,
        });
        if (res.canceled || !res.assets?.[0]) return;
        filename = res.assets[0].name || '';
        content = await FileSystem.readAsStringAsync(res.assets[0].uri);
      }

      if (!filename.toLowerCase().endsWith('.gpx')) {
        const msg = 'Please choose a file ending with .gpx';
        if (Platform.OS === 'web') window.alert(msg);
        else Alert.alert('Invalid File', msg);
        return;
      }

      // Check track type
      const type = gpxType(content);
      if (!looksLikeRun(type)) {
        const proceed = Platform.OS === 'web'
          ? window.confirm(`This looks like a ${type || 'non-running'} activity. Import as a run anyway?`)
          : await new Promise<boolean>((resolve) => {
              Alert.alert(
                'Activity Type Notice',
                `This looks like a ${type || 'non-running'} activity. Import as a run anyway?`,
                [
                  { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
                  { text: 'Import Anyway', onPress: () => resolve(true) },
                ]
              );
            });
        if (!proceed) return;
      }

      const points = parseGpx(content);
      const summ = summarizeGpx(points);
      if (!summ) {
        const msg = "Couldn't read a run from this file.";
        if (Platform.OS === 'web') window.alert(msg);
        else Alert.alert('Import Failed', msg);
        return;
      }

      setGpxPreview(summ);
    } catch (err: any) {
      console.error('GPX parse error:', err);
      const msg = `Failed to process GPX file: ${err.message || 'File error'}`;
      if (Platform.OS === 'web') window.alert(msg);
      else Alert.alert('GPX Error', msg);
    }
  };

  // Confirm GPX Import
  const handleConfirmGpxImport = async () => {
    if (!gpxPreview) return;
    try {
      const runRow = gpxToRun(gpxPreview);
      const res = await repository.importRun(runRow);
      setGpxPreview(null);
      if (res === 'duplicate') {
        const msg = 'Already imported';
        if (Platform.OS === 'web') window.alert(msg);
        else Alert.alert('Notice', msg);
      } else {
        await loadRuns();
        const distKm = gpxPreview.distanceM / 1000;
        const paceVal = distKm > 0 ? (gpxPreview.movingS / 60) / distKm : 0;
        const isLongest = summary.longestKm > 0 && distKm >= summary.longestKm;
        setAccomplishmentData({
          distanceKm: distKm,
          durationSeconds: gpxPreview.movingS,
          avgHr: gpxPreview.avgHr || null,
          rpe: null,
          paceMinKm: paceVal,
          isLongest,
        });
      }
    } catch (err: any) {
      console.error('Failed to import GPX run:', err);
      const msg = `Import failed: ${err.message || 'Database error'}`;
      if (Platform.OS === 'web') window.alert(msg);
      else Alert.alert('Error', msg);
    }
  };

  // Delete Run Confirmation
  const handleDeleteRun = (runItem: RunRow) => {
    const doDelete = async () => {
      try {
        await repository.deleteRun(runItem.id);
        if (selectedRunDetail?.id === runItem.id) {
          setSelectedRunDetail(null);
        }
        await loadRuns();
      } catch (err: any) {
        console.error('Failed to delete run:', err);
      }
    };

    if (Platform.OS === 'web') {
      if (window.confirm('Delete this run activity?')) {
        doDelete();
      }
    } else {
      Alert.alert('Delete Run', 'Are you sure you want to delete this run record?', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: doDelete },
      ]);
    }
  };

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <ScrollView contentContainerStyle={styles.container}>
        {/* Header Row */}
        <View style={styles.headerRow}>
          <View style={styles.headerTitleCol}>
            <Text style={styles.screenTitle}>Run</Text>
            <Text style={styles.screenSubtitle}>
              Aerobic volume, pacing & GPX logs
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => router.push('/settings')}
            hitSlop={12}
            style={styles.settingsGearBtn}
            accessibilityLabel="Settings"
          >
            <Settings size={22} color={colors.text.secondary} />
          </TouchableOpacity>
        </View>

        {/* 1. Real Summary Card */}
        <Card elevated style={styles.summaryCard}>
          <Text style={styles.cardHeaderTag}>AEROBIC ENGINE SUMMARY</Text>
          <View style={styles.summaryGrid}>
            <View style={styles.summaryCol}>
              <Text style={styles.summaryVal}>
                {formatDistValue(summary.weekKm)}
                <Text style={styles.summaryUnit}> {distUnit}</Text>
              </Text>
              <Text style={styles.summaryLabel}>This Week</Text>
            </View>
            <View style={styles.summaryCol}>
              <Text style={styles.summaryVal}>
                {formatDistValue(summary.prev4AvgKm)}
                <Text style={styles.summaryUnit}> {distUnit}</Text>
              </Text>
              <Text style={styles.summaryLabel}>Prev 4-Wk Avg</Text>
            </View>
            <View style={styles.summaryCol}>
              <Text style={styles.summaryVal}>
                {formatDistValue(summary.longestKm)}
                <Text style={styles.summaryUnit}> {distUnit}</Text>
              </Text>
              <Text style={styles.summaryLabel}>Longest (28d)</Text>
            </View>
            <View style={styles.summaryCol}>
              <Text style={styles.summaryVal}>
                {formatPaceValue(summary.avgPaceSecPerKm)}
                <Text style={styles.summaryUnit}> {paceUnit}</Text>
              </Text>
              <Text style={styles.summaryLabel}>Avg Pace (28d)</Text>
            </View>
          </View>
        </Card>

        {/* 2. Action Controls: Add Run & Import GPX */}
        <View style={styles.actionRow}>
          <ChunkyButton
            title="+ Add Run"
            variant="primary"
            onPress={() => setShowAddModal(true)}
            style={styles.flex1}
            leftIcon={<Plus size={18} color={colors.text.inverse || '#050507'} />}
          />
          <ChunkyButton
            title="Import GPX"
            variant="secondary"
            onPress={handlePickGpx}
            style={styles.flex1}
            leftIcon={<Upload size={18} color="#FFFFFF" />}
          />
        </View>
        <Text style={styles.helpText}>
          Export a GPX file from your watch app or from strava.com (activity menu), then import it here.
        </Text>

        {/* 3. Heart Rate Target Zones */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Heart Rate Target Zones</Text>
          {hrZones ? (
            <Card style={styles.zonesCard}>
              {hrZones.map((z, idx) => (
                <View
                  key={z.zone}
                  style={[styles.zoneRow, idx > 0 && styles.zoneDivider]}
                >
                  <View
                    style={[styles.zoneIndicator, { backgroundColor: zoneColors[idx] }]}
                  />
                  <View style={styles.zoneInfo}>
                    <Text style={styles.zoneName}>
                      Zone {z.zone}: {zoneLabels[idx]}
                    </Text>
                    <Text style={styles.zoneRange}>
                      {z.minBpm} - {z.maxBpm} bpm
                    </Text>
                  </View>
                </View>
              ))}
            </Card>
          ) : (
            <Card style={styles.noHrCard}>
              <Text style={styles.noHrTitle}>Heart rate zones unavailable</Text>
              <Text style={styles.noHrDesc}>
                Set your max HR in Settings to anchor aerobic and threshold zones.
              </Text>
              <Button
                title="Configure in Settings"
                variant="ghost"
                size="sm"
                onPress={() => router.push('/settings')}
                style={styles.settingsLinkBtn}
              />
            </Card>
          )}
        </View>

        {/* 4. Run Activity List */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recent Runs</Text>
          {loading ? (
            <ActivityIndicator color={colors.accent} style={{ marginTop: spacing.md }} />
          ) : runs.length === 0 ? (
            <Card style={styles.emptyCard}>
              <Text style={styles.emptyTitle}>No Runs Recorded</Text>
              <Text style={styles.emptyDesc}>
                Log a manual run or import a GPX track from your GPS device or watch.
              </Text>
            </Card>
          ) : (
            <View style={styles.listWrapper}>
              {runs.map((item) => {
                const pace = formatPaceValue(
                  paceSecPerKm(item.distanceM, item.durationS)
                );
                return (
                  <TouchableOpacity
                    key={item.id}
                    activeOpacity={0.7}
                    onPress={() => setSelectedRunDetail(item)}
                    onLongPress={() => handleDeleteRun(item)}
                    style={styles.runCard}
                  >
                    <View style={styles.runCardHeader}>
                      <View style={styles.runSourceBadgeRow}>
                        <Text style={styles.runDateText}>
                          {formatDate(item.startedAt)}
                        </Text>
                        {item.source === 'gpx' ? (
                          <View style={styles.gpxBadge}>
                            <Text style={styles.gpxBadgeText}>GPX</Text>
                          </View>
                        ) : (
                          <View style={styles.manualBadge}>
                            <Text style={styles.manualBadgeText}>MANUAL</Text>
                          </View>
                        )}
                      </View>
                      {item.rpe != null && (
                        <Text style={styles.rpePill}>@{item.rpe}</Text>
                      )}
                    </View>

                    <View style={styles.runMetricsRow}>
                      <View style={styles.runMetricCol}>
                        <Text style={styles.runMetricVal}>
                          {formatDistanceM(item.distanceM)}
                        </Text>
                        <Text style={styles.runMetricLabel}>Distance</Text>
                      </View>
                      <View style={styles.runMetricCol}>
                        <Text style={styles.runMetricVal}>
                          {formatDurationSeconds(item.durationS)}
                        </Text>
                        <Text style={styles.runMetricLabel}>Time</Text>
                      </View>
                      <View style={styles.runMetricCol}>
                        <Text style={styles.runMetricVal}>{pace}</Text>
                        <Text style={styles.runMetricLabel}>Pace {paceUnit}</Text>
                      </View>
                      {item.avgHr != null && (
                        <View style={styles.runMetricCol}>
                          <Text style={styles.runMetricVal}>{item.avgHr}</Text>
                          <Text style={styles.runMetricLabel}>bpm</Text>
                        </View>
                      )}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Manual Add Run Modal */}
      <Modal
        visible={showAddModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowAddModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Log Run</Text>
            <Text style={styles.modalSubtitle}>Enter details of your run session.</Text>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Date (YYYY-MM-DD)</Text>
              <TextInput
                style={styles.textInput}
                value={addDate}
                onChangeText={setAddDate}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={colors.text.muted}
              />
            </View>

            <View style={styles.inputRow}>
              <View style={[styles.inputGroup, styles.flex1]}>
                <Text style={styles.inputLabel}>Distance ({distUnit})</Text>
                <TextInput
                  style={styles.textInput}
                  value={addDistance}
                  onChangeText={setAddDistance}
                  placeholder="e.g. 5.0"
                  placeholderTextColor={colors.text.muted}
                  keyboardType="decimal-pad"
                />
              </View>
              <View style={[styles.inputGroup, styles.flex1]}>
                <Text style={styles.inputLabel}>Time (mm:ss or h:mm:ss)</Text>
                <TextInput
                  style={styles.textInput}
                  value={addTime}
                  onChangeText={setAddTime}
                  placeholder="e.g. 25:30"
                  placeholderTextColor={colors.text.muted}
                />
              </View>
            </View>

            <View style={styles.inputRow}>
              <View style={[styles.inputGroup, styles.flex1]}>
                <Text style={styles.inputLabel}>Avg HR (bpm, opt)</Text>
                <TextInput
                  style={styles.textInput}
                  value={addHr}
                  onChangeText={setAddHr}
                  placeholder="e.g. 152"
                  placeholderTextColor={colors.text.muted}
                  keyboardType="number-pad"
                />
              </View>
              <View style={[styles.inputGroup, styles.flex1]}>
                <Text style={styles.inputLabel}>RPE (1-10, opt)</Text>
                <TextInput
                  style={styles.textInput}
                  value={addRpe}
                  onChangeText={setAddRpe}
                  placeholder="e.g. 7.5"
                  placeholderTextColor={colors.text.muted}
                  keyboardType="decimal-pad"
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Notes (optional)</Text>
              <TextInput
                style={[styles.textInput, styles.notesInput]}
                value={addNotes}
                onChangeText={setAddNotes}
                placeholder="Route, weather, effort notes..."
                placeholderTextColor={colors.text.muted}
                multiline
              />
            </View>

            <View style={styles.modalBtnRow}>
              <Button
                title="Cancel"
                variant="ghost"
                size="sm"
                onPress={() => setShowAddModal(false)}
                style={styles.flex1}
              />
              <ChunkyButton
                title="Save Run"
                size="sm"
                variant="primary"
                onPress={handleSaveManualRun}
                leftIcon={<Check size={16} strokeWidth={2.2} color={colors.text.inverse || '#050507'} />}
                style={styles.flex1}
              />
            </View>
          </View>
        </View>
      </Modal>

      {/* GPX Import Preview Modal */}
      <Modal
        visible={gpxPreview !== null}
        transparent
        animationType="slide"
        onRequestClose={() => setGpxPreview(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>GPX Run Preview</Text>
            <Text style={styles.modalSubtitle}>
              Activity parsed successfully from file. Verify before adding:
            </Text>

            {gpxPreview && (
              <View style={styles.previewBox}>
                <View style={styles.previewRow}>
                  <Text style={styles.previewLabel}>Started At</Text>
                  <Text style={styles.previewVal}>
                    {formatDate(gpxPreview.startedAt)}
                  </Text>
                </View>
                <View style={styles.previewRow}>
                  <Text style={styles.previewLabel}>Distance</Text>
                  <Text style={[styles.previewVal, styles.accentVal]}>
                    {formatDistanceM(gpxPreview.distanceM)}
                  </Text>
                </View>
                <View style={styles.previewRow}>
                  <Text style={styles.previewLabel}>Moving Time</Text>
                  <Text style={styles.previewVal}>
                    {formatDurationSeconds(gpxPreview.movingS)}
                  </Text>
                </View>
                <View style={styles.previewRow}>
                  <Text style={styles.previewLabel}>Avg Pace</Text>
                  <Text style={styles.previewVal}>
                    {formatPaceValue(
                      paceSecPerKm(gpxPreview.distanceM, gpxPreview.movingS)
                    )}{' '}
                    {paceUnit}
                  </Text>
                </View>
                <View style={styles.previewRow}>
                  <Text style={styles.previewLabel}>Avg Heart Rate</Text>
                  <Text style={styles.previewVal}>
                    {gpxPreview.avgHr ? `${gpxPreview.avgHr} bpm` : 'N/A'}
                  </Text>
                </View>
                <View style={styles.previewRow}>
                  <Text style={styles.previewLabel}>GPS Points</Text>
                  <Text style={styles.previewVal}>{gpxPreview.points} trackpoints</Text>
                </View>
              </View>
            )}

            <View style={styles.modalBtnRow}>
              <Button
                title="Cancel"
                variant="ghost"
                size="sm"
                onPress={() => setGpxPreview(null)}
                style={styles.flex1}
              />
              <ChunkyButton
                title="Confirm & Import"
                size="sm"
                variant="primary"
                onPress={handleConfirmGpxImport}
                leftIcon={<Check size={16} strokeWidth={2.2} color={colors.text.inverse || '#050507'} />}
                style={styles.flex1}
              />
            </View>
          </View>
        </View>
      </Modal>

      {/* Run Detail Modal */}
      <Modal
        visible={selectedRunDetail !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedRunDetail(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.detailHeaderRow}>
              <Text style={styles.modalTitle}>Run Details</Text>
              {selectedRunDetail?.source === 'gpx' ? (
                <View style={styles.gpxBadge}>
                  <Text style={styles.gpxBadgeText}>GPX</Text>
                </View>
              ) : (
                <View style={styles.manualBadge}>
                  <Text style={styles.manualBadgeText}>MANUAL</Text>
                </View>
              )}
            </View>

            {selectedRunDetail && (
              <View style={styles.previewBox}>
                <View style={styles.previewRow}>
                  <Text style={styles.previewLabel}>Date</Text>
                  <Text style={styles.previewVal}>
                    {formatDate(selectedRunDetail.startedAt)}
                  </Text>
                </View>
                <View style={styles.previewRow}>
                  <Text style={styles.previewLabel}>Distance</Text>
                  <Text style={[styles.previewVal, styles.accentVal]}>
                    {formatDistanceM(selectedRunDetail.distanceM)}
                  </Text>
                </View>
                <View style={styles.previewRow}>
                  <Text style={styles.previewLabel}>Duration</Text>
                  <Text style={styles.previewVal}>
                    {formatDurationSeconds(selectedRunDetail.durationS)}
                  </Text>
                </View>
                <View style={styles.previewRow}>
                  <Text style={styles.previewLabel}>Pace</Text>
                  <Text style={styles.previewVal}>
                    {formatPaceValue(
                      paceSecPerKm(selectedRunDetail.distanceM, selectedRunDetail.durationS)
                    )}{' '}
                    {paceUnit}
                  </Text>
                </View>
                {selectedRunDetail.avgHr != null && (
                  <View style={styles.previewRow}>
                    <Text style={styles.previewLabel}>Heart Rate</Text>
                    <Text style={styles.previewVal}>{selectedRunDetail.avgHr} bpm</Text>
                  </View>
                )}
                {selectedRunDetail.rpe != null && (
                  <View style={styles.previewRow}>
                    <Text style={styles.previewLabel}>RPE (Effort)</Text>
                    <Text style={styles.previewVal}>@{selectedRunDetail.rpe}</Text>
                  </View>
                )}
                {selectedRunDetail.notes && (
                  <View style={[styles.previewRow, { flexDirection: 'column', alignItems: 'flex-start' }]}>
                    <Text style={styles.previewLabel}>Notes</Text>
                    <Text style={styles.notesText}>{selectedRunDetail.notes}</Text>
                  </View>
                )}
              </View>
            )}

            <View style={styles.modalBtnRow}>
              <Button
                title="Delete Activity"
                variant="ghost"
                size="sm"
                onPress={() => {
                  if (selectedRunDetail) handleDeleteRun(selectedRunDetail);
                }}
                style={styles.flex1}
              />
              <Button
                title="Close"
                size="sm"
                onPress={() => setSelectedRunDetail(null)}
                style={styles.flex1}
              />
            </View>
          </View>
        </View>
      </Modal>

      {/* Run Accomplishment Celebration Modal */}
      <RunAccomplishmentModal
        visible={accomplishmentData !== null}
        data={accomplishmentData}
        onDone={() => setAccomplishmentData(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    padding: spacing.base,
    paddingBottom: spacing.xxxl,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
    paddingTop: spacing.xs,
  },
  headerTitleCol: {
    flex: 1,
    marginRight: spacing.md,
  },
  settingsGearBtn: {
    padding: spacing.xs,
    justifyContent: 'center',
    alignItems: 'center',
  },
  screenTitle: {
    fontSize: typography.fontSize.display,
    fontWeight: typography.fontWeight.black,
    color: colors.text.primary,
  },
  screenSubtitle: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
    flexWrap: 'wrap',
    marginTop: 2,
  },
  summaryCard: {
    padding: spacing.base,
    marginBottom: spacing.md,
  },
  cardHeaderTag: {
    fontSize: 10,
    fontWeight: typography.fontWeight.bold,
    letterSpacing: 0.8,
    color: colors.text.muted,
    marginBottom: spacing.sm,
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  summaryCol: {
    width: '47%',
    backgroundColor: colors.surfaceElevated,
    borderRadius: radii.sm,
    padding: spacing.sm,
  },
  summaryVal: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.black,
    color: colors.text.primary,
  },
  summaryUnit: {
    fontSize: typography.fontSize.xs,
    color: colors.accent,
    fontWeight: typography.fontWeight.bold,
  },
  summaryLabel: {
    fontSize: typography.fontSize.xs - 1,
    color: colors.text.muted,
    marginTop: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  actionRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  helpText: {
    fontSize: typography.fontSize.xs - 1,
    color: colors.text.muted,
    marginBottom: spacing.lg,
    lineHeight: 16,
  },
  section: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.bold,
    color: colors.text.primary,
    marginBottom: spacing.sm,
  },
  zonesCard: {
    padding: spacing.sm,
  },
  zoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.xs + 2,
  },
  zoneDivider: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  zoneIndicator: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: spacing.sm,
  },
  zoneInfo: {
    flex: 1,
  },
  zoneName: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text.primary,
  },
  zoneRange: {
    fontSize: typography.fontSize.xs,
    color: colors.text.muted,
    marginTop: 1,
  },
  noHrCard: {
    padding: spacing.base,
    alignItems: 'center',
  },
  noHrTitle: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.bold,
    color: colors.text.primary,
    marginBottom: 4,
  },
  noHrDesc: {
    fontSize: typography.fontSize.xs,
    color: colors.text.muted,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  settingsLinkBtn: {
    marginTop: 2,
  },
  emptyCard: {
    padding: spacing.xl,
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.bold,
    color: colors.text.primary,
    marginBottom: 4,
  },
  emptyDesc: {
    fontSize: typography.fontSize.xs,
    color: colors.text.muted,
    textAlign: 'center',
  },
  listWrapper: {
    minHeight: 150,
  },
  runCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.sm,
    padding: spacing.base,
    marginBottom: spacing.sm,
  },
  runCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  runSourceBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  runDateText: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.bold,
    color: colors.text.primary,
  },
  gpxBadge: {
    backgroundColor: 'rgba(56, 189, 248, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.35)',
    borderRadius: radii.xs,
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
  gpxBadgeText: {
    fontSize: 9,
    fontWeight: typography.fontWeight.black,
    color: '#38BDF8',
    letterSpacing: 0.5,
  },
  manualBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: radii.xs,
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
  manualBadgeText: {
    fontSize: 9,
    fontWeight: typography.fontWeight.bold,
    color: colors.text.muted,
    letterSpacing: 0.5,
  },
  rpePill: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.bold,
    color: colors.accent,
  },
  runMetricsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  runMetricCol: {
    alignItems: 'flex-start',
  },
  runMetricVal: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.bold,
    color: colors.text.primary,
  },
  runMetricLabel: {
    fontSize: 10,
    color: colors.text.muted,
    marginTop: 1,
    textTransform: 'uppercase',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.base,
  },
  modalCard: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: colors.surfaceElevated,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
  },
  modalTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.bold,
    color: colors.text.primary,
    marginBottom: 4,
  },
  modalSubtitle: {
    fontSize: typography.fontSize.xs,
    color: colors.text.muted,
    marginBottom: spacing.md,
  },
  inputGroup: {
    marginBottom: spacing.sm,
  },
  inputRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  inputLabel: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text.secondary,
    marginBottom: 4,
  },
  textInput: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.sm,
    color: colors.text.primary,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs + 2,
    fontSize: typography.fontSize.sm,
  },
  notesInput: {
    minHeight: 60,
    textAlignVertical: 'top',
  },
  modalBtnRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  previewBox: {
    backgroundColor: colors.surface,
    borderRadius: radii.sm,
    padding: spacing.sm,
    marginBottom: spacing.md,
  },
  previewRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  previewLabel: {
    fontSize: typography.fontSize.xs,
    color: colors.text.muted,
  },
  previewVal: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text.primary,
  },
  accentVal: {
    color: colors.accent,
    fontWeight: typography.fontWeight.bold,
  },
  detailHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  notesText: {
    fontSize: typography.fontSize.xs,
    color: colors.text.secondary,
    marginTop: 4,
  },
  flex1: {
    flex: 1,
  },
  cockpitCard: {
    marginBottom: spacing.base,
    padding: spacing.base,
  },
  cockpitHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  cockpitGpsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cockpitGpsText: {
    fontSize: 10,
    fontWeight: typography.fontWeight.bold,
    color: colors.accent,
    letterSpacing: 0.8,
  },
  cockpitLiveBadge: {
    backgroundColor: colors.accentDim,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radii.full,
    borderWidth: 1,
    borderColor: 'rgba(0, 229, 255, 0.3)',
  },
  cockpitLiveBadgeText: {
    fontSize: 9,
    fontWeight: typography.fontWeight.bold,
    color: colors.accent,
    letterSpacing: 1,
  },
  cockpitGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: spacing.xs,
  },
  cockpitCol: {
    flex: 1,
    alignItems: 'center',
  },
  cockpitLabel: {
    fontSize: typography.fontSize.xs - 2,
    color: colors.text.muted,
    fontWeight: typography.fontWeight.semibold,
    marginBottom: 2,
    letterSpacing: 0.5,
  },
  cockpitValueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  cockpitValue: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.black,
    color: colors.text.primary,
  },
  cockpitUnit: {
    fontSize: typography.fontSize.xs,
    color: colors.text.secondary,
    fontWeight: typography.fontWeight.medium,
  },
  radarContainer: {
    width: 12,
    height: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radarHalo: {
    position: 'absolute',
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.accent,
  },
  radarDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: colors.accent,
  },
});
