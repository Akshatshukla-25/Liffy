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
import { ChevronLeft } from 'lucide-react-native';
import { supabase } from '../../src/db/supabase';
import { colors, spacing, typography, radii } from '../../src/theme';
import { Input } from '../../src/components/Input';
import { Button } from '../../src/components/Button';

export default function SignUpScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleSignUp = async () => {
    if (!email.trim() || !password || !confirmPassword) {
      setErrorMessage('All fields are required.');
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage('Passwords do not match.');
      return;
    }

    if (password.length < 6) {
      setErrorMessage('Password must be at least 6 characters long.');
      return;
    }

    setLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
      });

      if (error) {
        setErrorMessage(error.message);
      } else if (data.session) {
        router.replace('/(tabs)');
      } else {
        setSuccessMessage('Account created! Please check your email to confirm your account.');
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Failed to sign up. Please try again.');
    } finally {
      setLoading(false);
    }
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
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <ChevronLeft size={20} color={colors.text.primary} strokeWidth={2.0} />
          </TouchableOpacity>
          <Text style={styles.title}>Create Account</Text>
          <Text style={styles.subtitle}>
            Join Liffy to sync workouts across devices and track your hybrid journey.
          </Text>
        </View>

        {errorMessage && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{errorMessage}</Text>
          </View>
        )}

        {successMessage && (
          <View style={styles.successBox}>
            <Text style={styles.successText}>{successMessage}</Text>
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
            placeholder="At least 6 characters"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />

          <Input
            label="Confirm Password"
            placeholder="Re-enter password"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry
          />

          <Button
            title="Create Account"
            onPress={handleSignUp}
            loading={loading}
            style={styles.submitBtn}
          />
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Already have an account? </Text>
          <TouchableOpacity onPress={() => router.push('/(auth)/sign-in')}>
            <Text style={styles.footerLink}>Sign In</Text>
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
  backButton: {
    alignSelf: 'flex-start',
    marginBottom: spacing.md,
    paddingVertical: spacing.xs,
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
  successBox: {
    backgroundColor: colors.successDim,
    borderColor: colors.success,
    borderWidth: 1,
    borderRadius: radii.md,
    padding: spacing.md,
    marginBottom: spacing.base,
  },
  successText: {
    color: colors.success,
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
  },
  form: {
    width: '100%',
  },
  submitBtn: {
    marginTop: spacing.md,
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
