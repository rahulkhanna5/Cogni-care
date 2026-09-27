import { useRouter } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import * as api from '@/api/auth.api';
import { ApiError } from '@/api/client';
import { useAuth } from '@/store/auth';
import { colors, space } from '@/theme/tokens';
import { Banner, Button, Card, RoleToggle, Screen, Text, TextField } from '@/ui';

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
  const ready =
    name.trim().length > 0 && email.trim().length > 0 && password.length >= 10 && doctorFieldsOk;

  // The first thing still missing, in plain words.
  const reason = !name.trim()
    ? 'Type your full name to continue.'
    : !email.trim()
      ? 'Type your email to continue.'
      : password.length < 10
        ? 'Your password needs at least 10 characters.'
        : 'Add your specialty and registration number to continue.';

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
      // A patient goes through the boot router, which makes their local
      // profile from the name just typed rather than asking for it again.
      router.replace(role === 'DOCTOR' ? '/pending' : '/');
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
        <Text variant="body" color="textMuted">
          First, which describes you?
        </Text>
      </View>

      <RoleToggle
        options={[
          { value: 'PATIENT', label: 'I am a patient' },
          { value: 'DOCTOR', label: 'I am a doctor' },
        ]}
        value={role}
        onChange={setRole}
      />

      <View style={{ gap: space.md, marginTop: space.sm }}>
        <TextField
          label="Full name"
          value={name}
          onChangeText={setName}
          autoCapitalize="words"
          autoCorrect={false}
          textContentType="name"
        />
        <TextField
          label="Email"
          value={email}
          onChangeText={setEmail}
          placeholder="you@example.com"
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
          textContentType="emailAddress"
        />
        <TextField
          label="Password (at least 10 characters)"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoCapitalize="none"
          textContentType="newPassword"
        />

        {role === 'DOCTOR' && (
          <>
            <TextField label="Specialty" value={specialty} onChangeText={setSpecialty} placeholder="e.g. Neurology" />
            <TextField
              label="Registration / licence number"
              value={licenseNumber}
              onChangeText={setLicenseNumber}
              autoCapitalize="characters"
              autoCorrect={false}
            />
            <TextField label="Short bio (optional)" value={bio} onChangeText={setBio} multiline minLines={3} />

            <Card style={{ gap: space.md }}>
              <Text variant="heading">What happens next</Text>
              {[
                'Confirm your email address.',
                'An administrator checks your registration number against the medical council register.',
                'Once approved, patients can ask to be connected to you.',
              ].map((step, i) => (
                <View key={step} style={{ flexDirection: 'row', gap: space.md, alignItems: 'flex-start' }}>
                  <View
                    style={{
                      width: 30,
                      height: 30,
                      borderRadius: 15,
                      backgroundColor: colors.accent,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Text variant="label" color="textInverse">
                      {i + 1}
                    </Text>
                  </View>
                  <Text variant="body" style={{ flex: 1 }}>
                    {step}
                  </Text>
                </View>
              ))}
              <Text variant="caption" color="textMuted">
                You can sign in while you wait. No patient information is visible until
                both your account and each patient connection are approved.
              </Text>
            </Card>
          </>
        )}
      </View>

      {error && <Banner tone="error">{error}</Banner>}

      <Button
        label={busy ? 'Creating…' : 'Create account'}
        onPress={submit}
        busy={busy}
        disabled={!ready}
        disabledReason={reason}
      />

      <Button label="I already have an account" variant="quiet" onPress={() => router.replace('/login')} />
    </Screen>
  );
}
