import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TextInput,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Pressable,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Plus, Info } from 'lucide-react-native';
import { colors, spacing, typography, radii } from '../theme';
import type { ExerciseRow } from '../db/repository';
import { repository } from '../db/sqliteRepository';
import { BodyMap } from './body';
import { ExerciseIllustration } from './ExerciseIllustration';

const BACK_MUSCLES = new Set([
  'lats',
  'traps',
  'glutes',
  'hamstrings',
  'lower back',
  'lower_back',
  'calves',
  'triceps',
  'upper back',
  'upper_back',
  'middle back',
]);

function getExerciseView(primaryMuscles: string[]): 'front' | 'back' {
  const hasBack = primaryMuscles.some((m) => BACK_MUSCLES.has(m.toLowerCase()));
  return hasBack ? 'back' : 'front';
}

interface ExercisePickerSheetProps {
  visible: boolean;
  onClose: () => void;
  onSelectExercise: (exercise: ExerciseRow) => void;
}

const CATEGORIES: Array<'all' | ExerciseRow['category']> = [
  'all',
  'strength',
  'bodyweight',
  'cardio',
  'mobility',
];

export function ExercisePickerSheet({
  visible,
  onClose,
  onSelectExercise,
}: ExercisePickerSheetProps) {
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<'all' | ExerciseRow['category']>('all');
  const [exercises, setExercises] = useState<ExerciseRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [previewExercise, setPreviewExercise] = useState<ExerciseRow | null>(null);

  const loadExercises = useCallback(async (q: string) => {
    setLoading(true);
    try {
      const results = await repository.searchExercises(q, 80);
      setExercises(results);
    } catch (err) {
      console.error('Failed to search exercises:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (visible) {
      loadExercises(query);
    }
  }, [visible, query, loadExercises]);

  const filteredExercises = exercises.filter((e) => {
    if (selectedCategory === 'all') return true;
    return e.category === selectedCategory;
  });

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={onClose} />
        <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 16) }]}>
          <View style={styles.handleBar} />

          <View style={styles.header}>
            <Text style={styles.title}>Add Exercise</Text>
            <TouchableOpacity onPress={onClose} hitSlop={12} style={styles.closeBtn}>
              <Text style={styles.closeText}>Cancel</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.searchContainer}>
            <TextInput
              style={styles.searchInput}
              placeholder="Search exercise by name..."
              placeholderTextColor={colors.text.muted}
              value={query}
              onChangeText={setQuery}
              autoCorrect={false}
              clearButtonMode="while-editing"
            />
          </View>

          <View style={styles.categoriesRow}>
            {CATEGORIES.map((cat) => {
              const active = selectedCategory === cat;
              return (
                <TouchableOpacity
                  key={cat}
                  style={[styles.categoryPill, active && styles.categoryPillActive]}
                  onPress={() => setSelectedCategory(cat)}
                >
                  <Text style={[styles.categoryText, active && styles.categoryTextActive]}>
                    {cat.toUpperCase()}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator color={colors.accent} size="small" />
            </View>
          ) : (
            <FlatList
              data={filteredExercises}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.listContent}
              keyboardShouldPersistTaps="handled"
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.exerciseItem}
                  onPress={() => {
                    onSelectExercise(item);
                    onClose();
                  }}
                >
                  <TouchableOpacity
                    onPress={() => setPreviewExercise(item)}
                    activeOpacity={0.8}
                  >
                    <ExerciseIllustration
                      name={item.name}
                      id={item.id}
                      primaryMuscles={item.primaryMuscles}
                      secondaryMuscles={item.secondaryMuscles}
                      size={52}
                      style={styles.thumbBox}
                    />
                  </TouchableOpacity>
                  <View style={styles.exerciseInfo}>
                    <Text style={styles.exerciseName}>{item.name}</Text>
                    <View style={styles.tagsRow}>
                      <View style={styles.categoryBadge}>
                        <Text style={styles.categoryBadgeText}>{item.category}</Text>
                      </View>
                      {item.equipment && (
                        <Text style={styles.equipmentText}>{item.equipment}</Text>
                      )}
                      {item.primaryMuscles.length > 0 && (
                        <Text style={styles.muscleText}>
                          • {item.primaryMuscles.join(', ')}
                        </Text>
                      )}
                    </View>
                  </View>
                  <TouchableOpacity
                    style={styles.infoBtn}
                    hitSlop={8}
                    onPress={() => setPreviewExercise(item)}
                  >
                    <Info size={15} color={colors.text.muted} strokeWidth={2.0} />
                  </TouchableOpacity>
                  <View style={styles.addBtn}>
                    <Plus size={16} color={colors.accent} strokeWidth={2.5} />
                  </View>
                </TouchableOpacity>
              )}
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <Text style={styles.emptyText}>No exercises found.</Text>
                </View>
              }
            />
          )}
        </View>
      </View>

      {previewExercise && (
        <Modal
          visible={!!previewExercise}
          animationType="fade"
          transparent
          onRequestClose={() => setPreviewExercise(null)}
        >
          <View style={styles.previewOverlay}>
            <Pressable style={styles.backdrop} onPress={() => setPreviewExercise(null)} />
            <View style={styles.previewCard}>
              <View style={styles.previewHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.previewTitle}>{previewExercise.name}</Text>
                  <Text style={styles.previewSub}>
                    {previewExercise.category.toUpperCase()} • {previewExercise.equipment || 'Bodyweight'}
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => setPreviewExercise(null)}
                  style={styles.closeBtn}
                >
                  <Text style={styles.closeText}>Close</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.previewVisualsRow}>
                <View style={styles.previewIllustrationBox}>
                  <Text style={styles.visualLabel}>MOVEMENT SVG</Text>
                  <ExerciseIllustration
                    name={previewExercise.name}
                    id={previewExercise.id}
                    primaryMuscles={previewExercise.primaryMuscles}
                    secondaryMuscles={previewExercise.secondaryMuscles}
                    size={110}
                    style={styles.largeIllustration}
                  />
                </View>

                <View style={styles.previewBodyMapBox}>
                  <Text style={styles.visualLabel}>TARGET MUSCLES</Text>
                  <BodyMap
                    highlightedMuscles={previewExercise.primaryMuscles}
                    secondaryMuscles={previewExercise.secondaryMuscles}
                    viewMode="both"
                    height={110}
                    showLegend={false}
                  />
                </View>
              </View>

              <View style={styles.previewMusclesSection}>
                <Text style={styles.previewMusclesTitle}>Muscle Activation</Text>
                <View style={styles.previewBadgeRow}>
                  {previewExercise.primaryMuscles.map((m) => (
                    <View key={m} style={styles.primaryMuscleBadge}>
                      <Text style={styles.primaryMuscleText}>Primary: {m}</Text>
                    </View>
                  ))}
                  {previewExercise.secondaryMuscles.map((m) => (
                    <View key={m} style={styles.secondaryMuscleBadge}>
                      <Text style={styles.secondaryMuscleText}>Synergist: {m}</Text>
                    </View>
                  ))}
                </View>
              </View>

              <TouchableOpacity
                style={styles.addExerciseCTA}
                onPress={() => {
                  const ex = previewExercise;
                  setPreviewExercise(null);
                  onSelectExercise(ex);
                  onClose();
                }}
              >
                <Plus size={18} color="#050507" strokeWidth={2.5} />
                <Text style={styles.addExerciseCTAText}>Add to Workout</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      )}
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radii.xl,
    borderTopRightRadius: radii.xl,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    maxHeight: '85%',
    minHeight: '65%',
  },
  handleBar: {
    width: 36,
    height: 4,
    backgroundColor: colors.border,
    borderRadius: radii.full,
    alignSelf: 'center',
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm,
  },
  title: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.bold,
    color: colors.text.primary,
  },
  closeBtn: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
  },
  closeText: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
    fontWeight: typography.fontWeight.semibold,
  },
  searchContainer: {
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.xs,
  },
  searchInput: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm,
    fontSize: typography.fontSize.sm,
    color: colors.text.primary,
  },
  categoriesRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.xs,
    gap: spacing.xs,
    flexWrap: 'wrap',
  },
  categoryPill: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radii.full,
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.border,
  },
  categoryPillActive: {
    backgroundColor: colors.accentDim,
    borderColor: colors.accent,
  },
  categoryText: {
    fontSize: 10,
    fontWeight: typography.fontWeight.bold,
    color: colors.text.muted,
    letterSpacing: 0.5,
  },
  categoryTextActive: {
    color: colors.accent,
  },
  listContent: {
    paddingHorizontal: spacing.base,
    paddingBottom: spacing.xl,
  },
  exerciseItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm + 2,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  thumbBox: {
    width: 52,
    height: 52,
    backgroundColor: '#161924',
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm + 4,
    overflow: 'hidden',
  },
  exerciseInfo: {
    flex: 1,
    marginRight: spacing.sm,
  },
  exerciseName: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text.primary,
    marginBottom: 2,
  },
  tagsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  categoryBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: radii.xs,
  },
  categoryBadgeText: {
    fontSize: 10,
    color: colors.text.secondary,
    fontWeight: typography.fontWeight.medium,
    textTransform: 'capitalize',
  },
  equipmentText: {
    fontSize: typography.fontSize.xs,
    color: colors.text.muted,
    textTransform: 'capitalize',
  },
  muscleText: {
    fontSize: typography.fontSize.xs,
    color: colors.text.muted,
  },
  addBtn: {
    width: 32,
    height: 32,
    borderRadius: radii.full,
    backgroundColor: 'rgba(0, 229, 255, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0, 229, 255, 0.28)',
  },
  infoBtn: {
    padding: spacing.xs,
    marginRight: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  previewOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.82)',
    padding: spacing.base,
  },
  previewCard: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 10,
  },
  previewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  previewTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.bold,
    color: colors.text.primary,
  },
  previewSub: {
    fontSize: 11,
    color: colors.accent,
    fontWeight: typography.fontWeight.semibold,
    letterSpacing: 0.5,
    marginTop: 2,
  },
  previewVisualsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.md,
    marginBottom: spacing.base,
  },
  previewIllustrationBox: {
    flex: 1,
    alignItems: 'center',
  },
  previewBodyMapBox: {
    flex: 1,
    alignItems: 'center',
  },
  visualLabel: {
    fontSize: 9,
    fontWeight: typography.fontWeight.bold,
    letterSpacing: 1,
    color: colors.text.muted,
    marginBottom: spacing.xs,
  },
  largeIllustration: {
    width: '100%',
    height: 120,
    backgroundColor: '#161924',
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  previewMusclesSection: {
    marginBottom: spacing.lg,
  },
  previewMusclesTitle: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.bold,
    color: colors.text.secondary,
    marginBottom: spacing.xs,
  },
  previewBadgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  primaryMuscleBadge: {
    backgroundColor: 'rgba(0, 229, 255, 0.14)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radii.xs,
    borderWidth: 1,
    borderColor: 'rgba(0, 229, 255, 0.32)',
  },
  primaryMuscleText: {
    fontSize: 10,
    fontWeight: typography.fontWeight.bold,
    color: colors.accent,
    textTransform: 'capitalize',
  },
  secondaryMuscleBadge: {
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radii.xs,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  secondaryMuscleText: {
    fontSize: 10,
    fontWeight: typography.fontWeight.semibold,
    color: colors.success,
    textTransform: 'capitalize',
  },
  addExerciseCTA: {
    backgroundColor: colors.accent,
    borderRadius: radii.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm + 2,
  },
  addExerciseCTAText: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.bold,
    color: '#050507',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  emptyContainer: {
    padding: spacing.xl,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: typography.fontSize.sm,
    color: colors.text.muted,
  },
});
