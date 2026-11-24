import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Crypto from 'expo-crypto';
import { ChevronLeft } from 'lucide-react-native';

import { colors, spacing, typography, radii } from '../../src/theme';
import { Card } from '../../src/components/Card';
import { Button } from '../../src/components/Button';
import { ExercisePickerSheet } from '../../src/components/ExercisePickerSheet';
import { useSettings } from '../../src/context/settings';
import { formatWeight, lbToKg } from '../../src/lib/units';
import type { Template, TemplateExercise } from '../../src/lib/templates';
import type { ExerciseRow } from '../../src/db/repository';
import { repository } from '../../src/db/sqliteRepository';

export default function TemplateEditorScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { settings } = useSettings();

  const isNew = id === 'new';
  const [templateId] = useState(() => (isNew ? Crypto.randomUUID() : (id as string)));
  const [name, setName] = useState('');
  const [exercises, setExercises] = useState<TemplateExercise[]>([]);
  const [exerciseMap, setExerciseMap] = useState<Record<string, ExerciseRow>>({});
  const [loading, setLoading] = useState(!isNew);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  // Load existing template if editing
  const loadExistingTemplate = useCallback(async () => {
    if (isNew) return;
    try {
      await repository.init();
      const templates = await repository.listTemplates();
      const found = templates.find((t) => t.id === id);
      if (found) {
        setName(found.name);
        setExercises(found.exercises);

        const ids = found.exercises.map((e) => e.exerciseId);
        if (ids.length > 0) {
          const allExercises = await repository.searchExercises('', 200);
          const mapped: Record<string, ExerciseRow> = {};
          for (const ex of allExercises) {
            mapped[ex.id] = ex;
          }
          setExerciseMap(mapped);
        }
      }
    } catch (err) {
      console.error('Failed to load template:', err);
    } finally {
      setLoading(false);
    }
  }, [id, isNew]);

  useEffect(() => {
    loadExistingTemplate();
  }, [loadExistingTemplate]);

  const handleAddExercise = (exercise: ExerciseRow) => {
    setExerciseMap((prev) => ({ ...prev, [exercise.id]: exercise }));
    setExercises((prev) => [
      ...prev,
      {
        exerciseId: exercise.id,
        sets: 3,
        repMin: 8,
        repMax: 12,
        incrementKg: 2.5,
      },
    ]);
  };

  const handleRemoveExercise = (index: number) => {
    setExercises((prev) => prev.filter((_, i) => i !== index));
  };

  const handleUpdateExercise = (
    index: number,
    patch: Partial<TemplateExercise>
  ) => {
    setExercises((prev) =>
      prev.map((item, i) => (i === index ? { ...item, ...patch } : item))
    );
  };

  const handleSave = async () => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      if (Platform.OS === 'web') {
        window.alert('Please enter a routine name.');
      } else {
        Alert.alert('Missing Name', 'Please enter a routine name.');
      }
      return;
    }

    if (exercises.length === 0) {
      if (Platform.OS === 'web') {
        window.alert('Please add at least one exercise to the routine.');
      } else {
        Alert.alert('No Exercises', 'Please add at least one exercise to the routine.');
      }
      return;
    }

    setSaving(true);
    try {
      const template: Template = {
        id: templateId,
        name: trimmedName,
        exercises,
      };
      await repository.saveTemplate(template);
      router.back();
    } catch (err) {
      console.error('Failed to save template:', err);
      if (Platform.OS === 'web') {
        window.alert('Failed to save routine. Please try again.');
      } else {
        Alert.alert('Error', 'Failed to save routine. Please try again.');
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = () => {
    const doDelete = async () => {
      try {
        await repository.deleteTemplate(templateId);
        router.back();
      } catch (err) {
        console.error('Failed to delete template:', err);
      }
    };

    if (Platform.OS === 'web') {
      if (window.confirm('Delete this routine?')) {
        doDelete();
      }
    } else {
      Alert.alert(
        'Delete Routine',
        'Are you sure you want to delete this routine?',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Delete', style: 'destructive', onPress: doDelete },
        ]
      );
    }
  };

  if (loading) {
    return (
      <View style={[styles.screen, styles.center]}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={12} style={styles.backBtn}>
          <ChevronLeft size={20} color={colors.text.primary} strokeWidth={2.0} />
        </TouchableOpacity>
        <Text style={styles.topBarTitle}>
          {isNew ? 'New Routine' : 'Edit Routine'}
        </Text>
        <TouchableOpacity
          onPress={handleSave}
          disabled={saving}
          style={styles.saveHeaderBtn}
        >
          <Text style={[styles.saveHeaderBtnText, saving && styles.disabledText]}>
            {saving ? 'Saving...' : 'Save'}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        {/* Routine Name Input */}
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>ROUTINE NAME</Text>
          <TextInput
            style={styles.textInput}
            placeholder="e.g. Upper Body Power (A)"
            placeholderTextColor={colors.text.muted}
            value={name}
            onChangeText={setName}
            autoFocus={isNew}
          />
        </View>

        {/* Exercises Section */}
        <View style={styles.exercisesSection}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Exercises ({exercises.length})</Text>
          </View>

          {exercises.map((te, idx) => {
            const exMeta = exerciseMap[te.exerciseId];
            const exName = exMeta?.name ?? 'Exercise';

            return (
              <Card key={`${te.exerciseId}_${idx}`} elevated style={styles.exerciseCard}>
                <View style={styles.cardHeader}>
                  <View style={styles.exerciseNameCol}>
                    <Text style={styles.exerciseName}>{exName}</Text>
                    {exMeta?.category && (
                      <View style={styles.categoryBadge}>
                        <Text style={styles.categoryBadgeText}>{exMeta.category}</Text>
                      </View>
                    )}
                  </View>
                  <TouchableOpacity
                    onPress={() => handleRemoveExercise(idx)}
                    hitSlop={10}
                    style={styles.removeBtn}
                  >
                    <Text style={styles.removeBtnText}>Remove</Text>
                  </TouchableOpacity>
                </View>

                {/* Sets Stepper */}
                <View style={styles.configRow}>
                  <Text style={styles.configLabel}>Sets</Text>
                  <View style={styles.stepperContainer}>
                    <TouchableOpacity
                      style={styles.stepBtn}
                      onPress={() =>
                        handleUpdateExercise(idx, {
                          sets: Math.max(1, te.sets - 1),
                        })
                      }
                    >
                      <Text style={styles.stepBtnText}>−</Text>
                    </TouchableOpacity>
                    <Text style={styles.stepperValue}>{te.sets}</Text>
                    <TouchableOpacity
                      style={styles.stepBtn}
                      onPress={() =>
                        handleUpdateExercise(idx, {
                          sets: Math.min(20, te.sets + 1),
                        })
                      }
                    >
                      <Text style={styles.stepBtnText}>+</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Rep Range Stepper */}
                <View style={styles.configRow}>
                  <Text style={styles.configLabel}>Rep Range</Text>
                  <View style={styles.repRangeContainer}>
                    <View style={styles.stepperContainer}>
                      <TouchableOpacity
                        style={styles.stepBtnSm}
                        onPress={() =>
                          handleUpdateExercise(idx, {
                            repMin: Math.max(1, te.repMin - 1),
                          })
                        }
                      >
                        <Text style={styles.stepBtnText}>−</Text>
                      </TouchableOpacity>
                      <Text style={styles.stepperValueSm}>{te.repMin}</Text>
                      <TouchableOpacity
                        style={styles.stepBtnSm}
                        onPress={() =>
                          handleUpdateExercise(idx, {
                            repMin: Math.min(te.repMax, te.repMin + 1),
                          })
                        }
                      >
                        <Text style={styles.stepBtnText}>+</Text>
                      </TouchableOpacity>
                    </View>
                    <Text style={styles.rangeDash}>to</Text>
                    <View style={styles.stepperContainer}>
                      <TouchableOpacity
                        style={styles.stepBtnSm}
                        onPress={() =>
                          handleUpdateExercise(idx, {
                            repMax: Math.max(te.repMin, te.repMax - 1),
                          })
                        }
                      >
                        <Text style={styles.stepBtnText}>−</Text>
                      </TouchableOpacity>
                      <Text style={styles.stepperValueSm}>{te.repMax}</Text>
                      <TouchableOpacity
                        style={styles.stepBtnSm}
                        onPress={() =>
                          handleUpdateExercise(idx, {
                            repMax: Math.min(100, te.repMax + 1),
                          })
                        }
                      >
                        <Text style={styles.stepBtnText}>+</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>

                {/* Weight Increment Stepper */}
                <View style={styles.configRow}>
                  <Text style={styles.configLabel}>Increment</Text>
                  <View style={styles.stepperContainer}>
                    <TouchableOpacity
                      style={styles.stepBtn}
                      onPress={() => {
                        const delta = settings.unit === 'lb' ? lbToKg(2.5) : 0.5;
                        handleUpdateExercise(idx, {
                          incrementKg: Math.max(0.5, Math.round((te.incrementKg - delta) * 10) / 10),
                        });
                      }}
                    >
                      <Text style={styles.stepBtnText}>−</Text>
                    </TouchableOpacity>
                    <Text style={styles.stepperValue}>
                      {formatWeight(te.incrementKg, settings.unit, true)}
                    </Text>
                    <TouchableOpacity
                      style={styles.stepBtn}
                      onPress={() => {
                        const delta = settings.unit === 'lb' ? lbToKg(2.5) : 0.5;
                        handleUpdateExercise(idx, {
                          incrementKg: Math.round((te.incrementKg + delta) * 10) / 10,
                        });
                      }}
                    >
                      <Text style={styles.stepBtnText}>+</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </Card>
            );
          })}

          <Button
            title="+ Add Exercise"
            variant="outline"
            style={styles.addExBtn}
            onPress={() => setPickerOpen(true)}
          />
        </View>

        {/* Delete Routine Button if editing */}
        {!isNew && (
          <TouchableOpacity
            style={styles.deleteRoutineBtn}
            onPress={handleDelete}
          >
            <Text style={styles.deleteRoutineText}>Delete Routine</Text>
          </TouchableOpacity>
        )}
      </ScrollView>

      <ExercisePickerSheet
        visible={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onSelectExercise={handleAddExercise}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  center: {
    justifyContent: 'center',
    alignItems: 'center',
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
  saveHeaderBtn: {
    paddingVertical: spacing.xs,
    paddingLeft: spacing.sm,
  },
  saveHeaderBtnText: {
    color: colors.accent,
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.bold,
  },
  disabledText: {
    color: colors.text.muted,
  },
  container: {
    padding: spacing.base,
    paddingBottom: spacing.xxxl,
  },
  inputGroup: {
    marginBottom: spacing.xl,
  },
  inputLabel: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.bold,
    color: colors.text.secondary,
    letterSpacing: 1,
    marginBottom: spacing.xs,
  },
  textInput: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
    fontSize: typography.fontSize.base,
    color: colors.text.primary,
    fontWeight: typography.fontWeight.semibold,
  },
  exercisesSection: {
    marginBottom: spacing.xl,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.bold,
    color: colors.text.primary,
  },
  exerciseCard: {
    padding: spacing.base,
    marginBottom: spacing.md,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingBottom: spacing.sm,
  },
  exerciseNameCol: {
    flex: 1,
    marginRight: spacing.sm,
  },
  exerciseName: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.bold,
    color: colors.text.primary,
  },
  categoryBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: radii.xs,
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  categoryBadgeText: {
    fontSize: 10,
    color: colors.text.secondary,
    textTransform: 'capitalize',
  },
  removeBtn: {
    paddingVertical: 4,
    paddingHorizontal: spacing.xs,
  },
  removeBtnText: {
    fontSize: typography.fontSize.xs,
    color: colors.danger,
    fontWeight: typography.fontWeight.semibold,
  },
  configRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.xs,
  },
  configLabel: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
    fontWeight: typography.fontWeight.medium,
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
  stepBtnSm: {
    width: 30,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepBtnText: {
    color: colors.accent,
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.bold,
  },
  stepperValue: {
    minWidth: 44,
    textAlign: 'center',
    fontSize: typography.fontSize.sm,
    color: colors.text.primary,
    fontWeight: typography.fontWeight.bold,
  },
  stepperValueSm: {
    minWidth: 28,
    textAlign: 'center',
    fontSize: typography.fontSize.xs,
    color: colors.text.primary,
    fontWeight: typography.fontWeight.bold,
  },
  repRangeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  rangeDash: {
    fontSize: typography.fontSize.xs,
    color: colors.text.muted,
  },
  addExBtn: {
    width: '100%',
    marginTop: spacing.xs,
  },
  deleteRoutineBtn: {
    marginTop: spacing.lg,
    paddingVertical: spacing.md,
    alignItems: 'center',
    borderRadius: radii.md,
    backgroundColor: 'rgba(255, 69, 58, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 69, 58, 0.3)',
  },
  deleteRoutineText: {
    color: colors.danger,
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.bold,
  },
});
