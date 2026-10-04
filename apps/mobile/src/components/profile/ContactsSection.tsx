import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { LoadState } from '@/components/ui/LoadState';
import { SwitchRow } from '@/components/ui/SwitchRow';
import { TextField } from '@/components/ui/TextField';
import { CONTACTS, getMyContacts, saveMyContacts } from '@/lib/contacts';
import { useTheme, type Theme } from '@/theme';
import type { ContactKind, ContactSetting } from '@/types';

/** Social handles and e-transfer details, each hidden until the user switches it on. */
export function ContactsSection() {
  const theme = useTheme();
  const styles = createStyles(theme);
  const [saved, setSaved] = useState<ContactSetting[] | null>(null);
  const [draft, setDraft] = useState<ContactSetting[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const onLoaded = useCallback(({ contacts }: { contacts: ContactSetting[] }) => {
    setSaved(contacts);
    setDraft(contacts);
    setLoadError(null);
    setLoading(false);
  }, []);

  const onFailed = useCallback((err: unknown) => {
    setLoadError(err instanceof Error ? err.message : 'Could not load your contact info.');
    setLoading(false);
  }, []);

  function retry() {
    setLoading(true);
    getMyContacts().then(onLoaded, onFailed);
  }

  useEffect(() => {
    getMyContacts().then(onLoaded, onFailed);
  }, [onLoaded, onFailed]);

  function update(kind: ContactKind, change: Partial<ContactSetting>) {
    setDraft((current) => current.map((c) => (c.kind === kind ? { ...c, ...change } : c)));
    setSaveError(null);
    setNotice(null);
  }

  async function save() {
    setSaving(true);
    setSaveError(null);
    setNotice(null);
    try {
      const { contacts } = await saveMyContacts(draft);
      setSaved(contacts);
      setDraft(contacts);
      setNotice('Saved.');
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Could not save your contact info.');
    } finally {
      setSaving(false);
    }
  }

  let body: ReactNode;
  if (!saved) {
    body = (
      <LoadState
        loading={loading}
        error={loadError}
        fallbackError="Could not load your contact info."
        onRetry={retry}
      />
    );
  } else {
    const changed = JSON.stringify(draft) !== JSON.stringify(saved);
    body = (
      <>
        {draft.map((contact) => {
          const meta = CONTACTS[contact.kind];
          const hasValue = Boolean(contact.value?.trim());
          return (
            <View key={contact.kind} style={styles.field}>
              <TextField
                label={meta.label}
                prefix={meta.handle ? '@' : undefined}
                value={contact.value ?? ''}
                onChangeText={(text) =>
                  update(contact.kind, { value: text, visible: text.trim() ? contact.visible : false })
                }
                placeholder={meta.placeholder}
                keyboardType={meta.keyboardType}
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="off"
                maxLength={100}
                disabled={saving}
              />
              <SwitchRow
                label="Show to friends and event members"
                value={hasValue && contact.visible}
                onValueChange={(visible) => update(contact.kind, { visible })}
                disabled={saving || !hasValue}
                accessibilityLabel={`Show ${meta.label} to friends and event members`}
              />
            </View>
          );
        })}
        {saveError || notice ? (
          <Text
            style={[styles.message, saveError ? styles.messageError : null]}
            accessibilityLiveRegion="polite"
          >
            {saveError ?? notice}
          </Text>
        ) : null}
        <Button label="Save contact info" fullWidth loading={saving} disabled={!changed} onPress={save} />
      </>
    );
  }

  return (
    <View style={styles.section}>
      <View style={styles.heading}>
        <Text style={styles.title} accessibilityRole="header">
          Contact info
        </Text>
        <Text style={styles.description}>
          All optional. Only the ones you switch on are shown, so friends can find you or pay you back.
        </Text>
      </View>
      {body}
    </View>
  );
}

function createStyles(theme: Theme) {
  return StyleSheet.create({
    section: {
      gap: theme.spacing[6],
    },
    heading: {
      gap: theme.spacing[1],
    },
    title: {
      ...theme.typography.h4,
      color: theme.colors.textPrimary,
    },
    description: {
      ...theme.typography.bodySm,
      color: theme.colors.textSecondary,
    },
    field: {
      gap: theme.spacing[1],
    },
    message: {
      ...theme.typography.caption,
      color: theme.colors.textSecondary,
    },
    messageError: {
      color: theme.colors.danger,
    },
  });
}
