import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { supabase } from '../../src/db/supabase';
import { useAuth } from '../../src/context/auth';
import { colors, spacing, typography, radii } from '../../src/theme';
import { Input } from '../../src/components/Input';
import { Button } from '../../src/components/Button';

export default function SignInScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { setGuestMode } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSignIn = async () => {
    if (!email.trim() || !password) {
      setErrorMessage('Please enter both email and password.');
      return;
    }

    setLoading(true);
    setErrorMessage(null);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) {
        setErrorMessage(error.message);
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Failed to sign in. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleContinueGuest = () => {
    setGuestMode(true);
    router.replace('/(tabs)');
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.keyboardContainer}
    >
      <ScrollView
        contentContainerStyle={[
          styles.container,
          { paddingTop: Math.max(insets.top, spacing.xl) },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>LIFFY ATHLETIC</Text>
          </View>
          <Text style={styles.title}>Welcome Back</Text>
          <Text style={styles.subtitle}>
            Offline-first hybrid athlete tracking for lifting and running.
          </Text>
        </View>

        {errorMessage && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{errorMessage}</Text>
          </View>
        )}

        <View style={styles.form}>
          <Input
            label="Email Address"
            placeholder="you@domain.com"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
          />

          <Input
            label="Password"
            placeholder="••••••••••••"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />

          <Button
            title="Sign In"
            onPress={handleSignIn}
            loading={loading}
            style={styles.submitBtn}
          />

          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>OR</Text>
            <View style={styles.dividerLine} />
          </View>

          <Button
            title="Continue as Guest (Offline Mode)"
            variant="secondary"
            onPress={handleContinueGuest}
            style={styles.guestBtn}
          />
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Don't have an account? </Text>
          <TouchableOpacity onPress={() => router.push('/(auth)/sign-up')}>
            <Text style={styles.footerLink}>Sign Up</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  keyboardContainer: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: spacing.xl,
    backgroundColor: colors.background,
  },
  header: {
    marginBottom: spacing.xxl,
  },
  badge: {
    alignSelf: 'flex-start',
    backgroundColor: colors.accentDim,
    paddingVertical: spacing.xxs + 2,
    paddingHorizontal: spacing.sm,
    borderRadius: radii.full,
    marginBottom: spacing.md,
  },
  badgeText: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.bold,
    color: colors.accent,
    letterSpacing: 1.2,
  },
  title: {
    fontSize: typography.fontSize.display,
    fontWeight: typography.fontWeight.bold,
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: typography.fontSize.base,
    color: colors.text.secondary,
    lineHeight: typography.lineHeight.base,
  },
  errorBox: {
    backgroundColor: colors.dangerDim,
    borderColor: colors.danger,
    borderWidth: 1,
    borderRadius: radii.md,
    padding: spacing.md,
    marginBottom: spacing.base,
  },
  errorText: {
    color: colors.danger,
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
  },
  form: {
    width: '100%',
  },
  submitBtn: {
    marginTop: spacing.sm,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: spacing.xl,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.border,
  },
  dividerText: {
    marginHorizontal: spacing.md,
    color: colors.text.muted,
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.semibold,
  },
  guestBtn: {
    width: '100%',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: spacing.xxl,
  },
  footerText: {
    color: colors.text.secondary,
    fontSize: typography.fontSize.base,
  },
  footerLink: {
    color: colors.accent,
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.bold,
  },
});
