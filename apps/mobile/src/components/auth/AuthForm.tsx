import { Link, router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { supabase } from '@/lib/supabase';

export function AuthForm({ mode }: { mode: 'sign-in' | 'sign-up' }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const signingUp = mode === 'sign-up';

  async function submit() {
    if (!email.trim() || !password) {
      Alert.alert('Missing details', 'Enter your email and password.');
      return;
    }
    setBusy(true);
    try {
      const result = signingUp
        ? await supabase.auth.signUp({ email: email.trim(), password })
        : await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (result.error) throw result.error;
      if (signingUp && !result.data.session) {
        Alert.alert('Check your email', 'Confirm your account, then sign in.', [
          { text: 'OK', onPress: () => router.replace('/sign-in') },
        ]);
      }
    } catch (error) {
      Alert.alert(signingUp ? 'Could not create account' : 'Could not sign in', error instanceof Error ? error.message : 'Please try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.form}>
        <Text style={styles.title}>{signingUp ? 'Create account' : 'Sign in'}</Text>
        <TextInput style={styles.input} placeholder="Email" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" autoComplete="email" />
        <TextInput style={styles.input} placeholder="Password" value={password} onChangeText={setPassword} secureTextEntry autoComplete={signingUp ? 'new-password' : 'password'} />
        <Pressable style={styles.button} disabled={busy} onPress={submit} accessibilityRole="button">
          {busy ? <ActivityIndicator color="#ffffff" /> : <Text style={styles.buttonText}>{signingUp ? 'Create account' : 'Sign in'}</Text>}
        </Pressable>
        <Link href={signingUp ? '/sign-in' : '/sign-up'} style={styles.link}>
          {signingUp ? 'Already have an account? Sign in' : 'New here? Create an account'}
        </Link>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', backgroundColor: '#ffffff' },
  form: { padding: 24, gap: 16 },
  title: { fontSize: 28, fontWeight: '700', color: '#111827', marginBottom: 8 },
  input: { borderWidth: 1, borderColor: '#d1d5db', borderRadius: 10, padding: 12, fontSize: 16 },
  button: { minHeight: 48, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: '#111827' },
  buttonText: { color: '#ffffff', fontSize: 16, fontWeight: '600' },
  link: { textAlign: 'center', color: '#111827', padding: 8 },
});
