import { useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useState } from 'react';
import { View } from 'react-native';

import * as authApi from '@/api/auth.api';
import { ApiError } from '@/api/client';
import { SegmentTabs } from '@/care/doctor/parts';
import { eraseDevice } from '@/db/queries';
import { LANGUAGES, useLanguage, useSetLanguage, useT, type Lang } from '@/i18n';
import { useAuth } from '@/store/auth';
import { useSession } from '@/store/session';
import { space } from '@/theme/tokens';
import { Banner, Button, Card, Screen, ScreenHeader, Text, TextField } from '@/ui';

/**
 * Language, the legal texts, and the two ways of removing data: from this
 * phone, and (signed in) the account itself. Both removals ask twice; deleting
 * the account also asks for the password, because it cannot be undone.
 */
export default function Settings() {
  const router = useRouter();
  const db = useSQLiteContext();
  const t = useT();
  const lang = useLanguage((s) => s.lang);
  const setLanguage = useSetLanguage();
  const setPlayer = useSession((s) => s.setPlayer);
  const { user, accessToken, signOut } = useAuth();

  const [confirmErase, setConfirmErase] = useState(false);
  const [erased, setErased] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isDoctor = user?.role === 'DOCTOR';

  async function erase() {
    setBusy(true);
    try {
      await eraseDevice(db);
      setPlayer(null);
      setErased(true);
      setConfirmErase(false);
    } finally {
      setBusy(false);
    }
  }

  async function deleteAccount() {
    if (!accessToken) return;
    setBusy(true);
    setError(null);
    try {
      // Straight to the server with the current token: a refresh-and-retry
      // here could replay a deletion.
      await authApi.deleteAccount(accessToken, password);
      if (!isDoctor) await eraseDevice(db);
      setPlayer(null);
      await signOut().catch(() => undefined);
      router.replace('/login');
    } catch (e) {
      setError(
        e instanceof ApiError && e.code === 'INVALID_CREDENTIALS'
          ? t('settings.wrongPassword')
          : e instanceof ApiError
            ? e.message
            : t('settings.failed')
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen>
      <ScreenHeader title={t('settings.title')} onBack={() => router.back()} />

      <Card style={{ gap: space.md }}>
        <Text variant="heading">{t('settings.language')}</Text>
        <SegmentTabs<Lang> tabs={LANGUAGES} value={lang} onChange={(l) => setLanguage(l)} />
        <Text variant="caption" color="textMuted">
          {t('settings.languageNote')}
        </Text>
      </Card>

      <Card style={{ gap: space.sm }}>
        <Text variant="heading">{t('settings.legal')}</Text>
        <Button
          label={t('legal.terms')}
          variant="secondary"
          icon="document-text-outline"
          onPress={() => router.push('/terms')}
        />
        <Button
          label={t('legal.privacy')}
          variant="secondary"
          icon="shield-outline"
          onPress={() => router.push('/privacy')}
        />
      </Card>

      <Card style={{ gap: space.md }}>
        <Text variant="heading">{t('settings.thisPhone')}</Text>
        <Text variant="body" color="textMuted">
          {t('settings.eraseNote')}
        </Text>
        {erased && <Banner tone="success">{t('settings.erased')}</Banner>}
        {confirmErase ? (
          <View style={{ gap: space.sm }}>
            <Button label={t('settings.eraseConfirm')} icon="trash-outline" busy={busy} onPress={erase} />
            <Button label={t('settings.cancel')} variant="secondary" onPress={() => setConfirmErase(false)} />
          </View>
        ) : (
          <Button
            label={t('settings.erase')}
            variant="secondary"
            icon="trash-outline"
            onPress={() => setConfirmErase(true)}
          />
        )}
      </Card>

      {user && (
        <Card style={{ gap: space.md }}>
          <Text variant="heading">{t('settings.account')}</Text>
          {user.role === 'ADMIN' ? (
            <Text variant="body" color="textMuted">
              {t('settings.adminNote')}
            </Text>
          ) : (
            <>
              <Text variant="body" color="textMuted">
                {isDoctor ? t('settings.closeDoctorNote') : t('settings.deletePatientNote')}
              </Text>
              {confirmDelete ? (
                <View style={{ gap: space.sm }}>
                  <TextField
                    label={t('settings.password')}
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry
                    autoCapitalize="none"
                    textContentType="password"
                  />
                  {error && <Banner tone="error">{error}</Banner>}
                  <Button
                    label={isDoctor ? t('settings.confirmClose') : t('settings.confirmDelete')}
                    icon="warning-outline"
                    busy={busy}
                    disabled={!password}
                    onPress={deleteAccount}
                  />
                  <Button
                    label={t('settings.cancel')}
                    variant="secondary"
                    onPress={() => {
                      setConfirmDelete(false);
                      setPassword('');
                      setError(null);
                    }}
                  />
                </View>
              ) : (
                <Button
                  label={isDoctor ? t('settings.closeDoctor') : t('settings.deletePatient')}
                  variant="secondary"
                  icon="person-remove-outline"
                  onPress={() => setConfirmDelete(true)}
                />
              )}
            </>
          )}
        </Card>
      )}
    </Screen>
  );
}
