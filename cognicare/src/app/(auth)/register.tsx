import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, TextInput, View } from 'react-native';

import * as api from '@/api/auth.api';
import { ApiError } from '@/api/client';
import { useAuth } from '@/store/auth';
import { colors, radius, space, TOUCH_MIN } from '@/theme/tokens';
import { Button, Card, Screen, Text } from '@/ui';

type Role = 'PATIENT' | 'DOCTOR';

export default function Register() {
  const router = useRouter();
  const signIn = useAuth((s) => s.signIn);

  const [role, setRole] = useState<Role>('PATIENT');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [specialty, setSpecialty] = useState('');
  const [licenseNumber, setLicenseNumber] = useState('');
  const [bio, setBio] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const doctorFieldsOk =
    role === 'PATIENT' || (specialty.trim().length > 1 && licenseNumber.trim().length > 2);
  const canSubmit =
    name.trim().length > 0 &&
    email.trim().length > 0 &&
    password.length >= 10 &&
    doctorFieldsOk &&
    !busy;

  async function submit() {
    setBusy(true);
    setError(null);
    try {
      const result = await api.register({
        role,
        name: name.trim(),
        email: email.trim(),
        password,
        ...(role === 'DOCTOR'
          ? { specialty: specialty.trim(), licenseNumber: licenseNumber.trim(), bio: bio.trim() }
          : {}),
      });

      // Development convenience: the server returns the verification token
      // outside production, so the flow is testable without a mail provider.
      if (result.devEmailVerifyToken) {
        await api.verifyEmail(result.devEmailVerifyToken).catch(() => undefined);
      }

      await signIn(email.trim(), password);
      router.replace(role === 'DOCTOR' ? '/pending' : '/dashboard');
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not create the account.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen>
      <View style={{ gap: space.sm, marginTop: space.lg }}>
        <Text variant="display">Create an account</Text>
      </View>

      <View style={{ flexDirection: 'row', gap: space.md, marginTop: space.md }}>
        {(['PATIENT', 'DOCTOR'] as Role[]).map((option) => (
          <Pressable
            key={option}
            accessibilityRole="button"
            accessibilityState={{ selected: role === option }}
            onPress={() => setRole(option)}
            style={{
              flex: 1,
              minHeight: TOUCH_MIN,
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: radius.md,
              borderWidth: 2,
              borderColor: role === option ? colors.accent : colors.border,
              backgroundColor: role === option ? colors.accentSoft : colors.surface,
            }}
          >
            <Text variant="label" color={role === option ? 'accent' : 'text'}>
              {option === 'PATIENT' ? 'I am a patient' : 'I am a doctor'}
            </Text>
          </Pressable>
        ))}
      </View>

      <View style={{ gap: space.md, marginTop: space.lg }}>
        <Field label="Full name" value={name} onChange={setName} autoCapitalize="words" />
        <Field
          label="Email"
          value={email}
          onChange={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
        />
        <Field
          label="Password (at least 10 characters)"
          value={password}
          onChange={setPassword}
          secure
          autoCapitalize="none"
        />

        {role === 'DOCTOR' && (
          <>
            <Field label="Specialty" value={specialty} onChange={setSpecialty} />
            <Field
              label="Registration / licence number"
              value={licenseNumber}
              onChange={setLicenseNumber}
              autoCapitalize="characters"
            />
            <Field label="Short bio (optional)" value={bio} onChange={setBio} multiline />

            <Card>
              <Text variant="label">What happens next</Text>
              <Text variant="body" color="textMuted">
                1. Confirm your email address.
              </Text>
              <Text variant="body" color="textMuted">
                2. An administrator checks your registration number against the medical
                council register.
              </Text>
              <Text variant="body" color="textMuted">
                3. Once approved, patients can ask to be connected to you.
              </Text>
              <Text variant="caption" color="textMuted">
                You can sign in while you wait. No patient information is visible until
                both your account and each patient connection are approved.
              </Text>
            </Card>
          </>
        )}
      </View>

      {error && (
        <View
          style={{
            backgroundColor: colors.dangerSoft,
            borderRadius: radius.md,
            borderWidth: 2,
            borderColor: colors.danger,
            padding: space.md,
            marginTop: space.md,
          }}
        >
          <Text variant="body" color="danger">
            {error}
          </Text>
        </View>
      )}

      <Button
        label={busy ? 'Creating…' : 'Create account'}
        onPress={submit}
        disabled={!canSubmit}
        style={{ marginTop: space.lg }}
      />

      <Button
        label="I already have an account"
        variant="quiet"
        onPress={() => router.replace('/login')}
        style={{ marginTop: space.sm }}
      />
    </Screen>
  );
}

function Field({
  label,
  value,
  onChange,
  secure,
  multiline,
  autoCapitalize = 'sentences',
  keyboardType,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  secure?: boolean;
  multiline?: boolean;
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  keyboardType?: 'default' | 'email-address';
}) {
  return (
    <View style={{ gap: space.sm }}>
      <Text variant="label">{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChange}
        secureTextEntry={secure}
        multiline={multiline}
        autoCapitalize={autoCapitalize}
        autoCorrect={false}
        keyboardType={keyboardType}
        placeholderTextColor={colors.disabled}
        style={{
          minHeight: multiline ? TOUCH_MIN * 1.6 : TOUCH_MIN,
          borderWidth: 2,
          borderColor: colors.border,
          borderRadius: radius.md,
          backgroundColor: colors.surface,
          paddingHorizontal: space.md,
          paddingTop: multiline ? space.sm : 0,
          fontSize: 20,
          color: colors.text,
          textAlignVertical: multiline ? 'top' : 'center',
        }}
      />
    </View>
  );
}
