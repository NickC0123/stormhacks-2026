import { router } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { SFSymbolIcon } from '@/components/ui/SFSymbolIcon';
import { useSnackbar } from '@/components/ui/Snackbar';
import { apiFetch } from '@/lib/api';
import { useTheme, type Theme } from '@/theme';

type CreatedEvent = { id: string; title: string };

export default function NewEventScreen() {
  const theme = useTheme();
  const { showSnackbar } = useSnackbar();
  const styles = createStyles(theme);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [busy, setBusy] = useState(false);
  const canCreate = title.trim().length > 0;
  const disabled = !canCreate || busy;

  async function createEvent() {
    if (!canCreate || busy) return;
    const eventTitle = title.trim();
    setBusy(true);
    try {
      const event = await apiFetch<CreatedEvent>('/events', {
        method: 'POST',
        body: JSON.stringify({ title: eventTitle, description: description.trim() || null }),
      });
      router.replace({ pathname: '/events/[eventId]', params: { eventId: event.id } });
      // Wait for the modal dismiss so the toast doesn't play under the closing drawer.
      setTimeout(() => {
        showSnackbar({ message: 'Event created successfully.', variant: 'success' });
      }, theme.motion.modal.closeDur + theme.motion.duration.fast);
    } catch (error) {
      Alert.alert('Could not create event', error instanceof Error ? error.message : 'Please try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.form}>
          <View style={styles.headerRow}>
            <Text style={styles.pageTitle} accessibilityRole="header">
              Add Event
            </Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Close"
              hitSlop={theme.spacing[2]}
              onPress={() => router.back()}
              style={({ pressed }) => [styles.closeButton, pressed && styles.closePressed]}
            >
              <SFSymbolIcon name="xmark" color={theme.colors.textPrimary} />
            </Pressable>
          </View>
          <Text style={styles.label}>Event Name</Text>
          <View style={[styles.fieldWrap, styles.titleField]}>
            {title.length === 0 ? (
              <Text style={styles.inputPlaceholder} pointerEvents="none">
                e.g. Weekend Trip
              </Text>
            ) : null}
            <TextInput
              style={styles.input}
              value={title}
              onChangeText={setTitle}
              maxLength={200}
            />
          </View>
          <Text style={[styles.label, styles.descriptionLabel]}>Description</Text>
          <View style={styles.fieldWrap}>
            {/* Native multiline placeholders don't wrap on iOS — overlay does. */}
            {description.length === 0 ? (
              <Text style={styles.inputPlaceholder} pointerEvents="none">
                A weekend of exploring, good food, and good company.
              </Text>
            ) : null}
            <TextInput
              style={[styles.input, styles.description]}
              value={description}
              onChangeText={setDescription}
              multiline
              textAlignVertical="top"
            />
          </View>
        </View>

        <Pressable
          style={({ pressed }) => [
            styles.button,
            pressed && canCreate && styles.buttonPressed,
            disabled && styles.buttonDisabled,
          ]}
          disabled={disabled}
          onPress={createEvent}
          accessibilityRole="button"
          accessibilityLabel="Create Event"
          accessibilityState={{ disabled }}
        >
          {busy ? (
            <ActivityIndicator color={theme.colors.onAccent} />
          ) : (
            <Text style={styles.buttonText}>Create Event</Text>
          )}
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

function createStyles(theme: Theme) {
  const m = theme.createActionModal;

  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.bgSurface,
    },
    content: {
      paddingHorizontal: theme.spacing[9], // 36
      paddingBottom: theme.spacing[9],
      paddingTop: theme.spacing[12], // 48
    },
    form: {
      gap: theme.spacing[3],
    },
    headerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing[3],
      marginBottom: theme.spacing[5],
    },
    closeButton: {
      width: theme.sizes.touchTarget,
      height: theme.sizes.touchTarget,
      alignItems: 'center',
      justifyContent: 'center',
    },
    closePressed: {
      opacity: 0.7,
    },
    pageTitle: {
      ...theme.typography.h2,
      fontFamily: theme.fonts.sans.semibold,
      color: theme.colors.textPrimary,
      textAlign: 'left',
      flex: 1,
    },
    label: {
      fontFamily: theme.fonts.sans.semibold,
      fontSize: 15,
      lineHeight: 20,
      color: theme.colors.textPrimary,
    },
    titleField: {
      marginBottom: theme.spacing[4],
    },
    descriptionLabel: {
      marginTop: theme.spacing[2],
    },
    input: {
      borderWidth: 1,
      borderColor: theme.colors.borderSubtle,
      borderRadius: theme.radius.md,
      padding: theme.spacing[3],
      fontFamily: theme.fonts.sans.regular,
      fontSize: 16,
      lineHeight: 22,
      color: theme.colors.textPrimary,
    },
    fieldWrap: {
      position: 'relative',
      alignSelf: 'stretch',
    },
    description: {
      minHeight: 100,
      textAlignVertical: 'top',
    },
    inputPlaceholder: {
      position: 'absolute',
      zIndex: 1,
      top: theme.spacing[3],
      right: theme.spacing[3],
      left: theme.spacing[3],
      fontFamily: theme.fonts.sans.light,
      fontSize: 16,
      lineHeight: 22,
      color: theme.colors.textPlaceholder,
    },
    button: {
      height: m.actionHeight,
      marginTop: theme.spacing[8], // 16 below description
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: theme.spacing[4],
      borderRadius: theme.radius.full,
      backgroundColor: theme.colors.accent,
    },
    buttonPressed: {
      backgroundColor: theme.colors.accentActive,
    },
    buttonDisabled: {
      opacity: theme.opacity.disabled,
    },
    buttonText: {
      fontFamily: theme.fonts.sans.medium,
      fontSize: 17,
      lineHeight: 22,
      color: theme.colors.onAccent,
      textAlign: 'center',
    },
  });
}
