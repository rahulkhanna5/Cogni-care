import { useRouter } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import * as api from '@/api/auth.api';
import { ApiError } from '@/api/client';
import { useAuth } from '@/store/auth';
import { colors, space } from '@/theme/tokens';
import { LEGAL_VERSION } from '@/legal/content';
import { Banner, Button, Card, Checkbox, RoleToggle, Screen, Text, TextField } from '@/ui';

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
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [acceptPrivacy, setAcceptPrivacy] = useState(false);
  const [doctorDeclares, setDoctorDeclares] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const doctorFieldsOk =
    role === 'PATIENT' || (specialty.trim().length > 1 && licenseNumber.trim().length > 2);
  const consentOk = acceptTerms && acceptPrivacy && (role === 'PATIENT' || doctorDeclares);
  const ready =
    name.trim().length > 0 && email.trim().length > 0 && password.length >= 10 && doctorFieldsOk && consentOk;

  // The first thing still missing, in plain words.
  const reason = !name.trim()
    ? 'Type your full name to continue.'
    : !email.trim()
      ? 'Type your email to continue.'
      : password.length < 10
        ? 'Your password needs at least 10 characters.'
        : !doctorFieldsOk
          ? 'Add your specialty and registration ID to continue.'
          : !acceptTerms
            ? 'Tick the box to agree to the terms and conditions.'
            : !acceptPrivacy
              ? 'Tick the box to agree to the privacy policy.'
              : 'Tick the box to confirm your registration details are true.';

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
        acceptedTermsVersion: LEGAL_VERSION,
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
          { value: 'PATIENT', label: 'I am a member' },
          { value: 'DOCTOR', label: 'I am a specialist' },
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
              label="Unique ID / registration ID"
              value={licenseNumber}
              onChangeText={setLicenseNumber}
              autoCapitalize="characters"
              autoCorrect={false}
            />
            <TextField label="Short bio (optional)" value={bio} onChangeText={setBio} multiline minLines={3} />

            <Card style={{ gap: space.md }}>
              <Text variant="heading">What happens next</Text>
              {[
                'An administrator checks your registration ID.',
                'Once approved, members can ask to be connected to you.',
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
                You can sign in while you wait. No member information is visible until
                both your account and each member connection are approved.
              </Text>
            </Card>
          </>
        )}
      </View>

      <View style={{ gap: space.xs }}>
        <Text variant="heading">Before you continue</Text>
        <Checkbox
          checked={acceptTerms}
          onChange={setAcceptTerms}
          label="I have read and agree to the terms and conditions. Required."
        >
          <Text variant="body">
            I have read and agree to the{' '}
            <Text variant="body" color="accent" onPress={() => router.push('/terms')} style={{ textDecorationLine: 'underline' }}>
              terms and conditions
            </Text>
            . (Required)
          </Text>
        </Checkbox>
        <Checkbox
          checked={acceptPrivacy}
          onChange={setAcceptPrivacy}
          label="I have read the privacy policy and agree to my health information being used as it describes. Required."
        >
          <Text variant="body">
            I have read the{' '}
            <Text variant="body" color="accent" onPress={() => router.push('/privacy')} style={{ textDecorationLine: 'underline' }}>
              privacy policy
            </Text>{' '}
            and agree to my health information being used as it describes. (Required)
          </Text>
        </Checkbox>
        {role === 'DOCTOR' && (
          <Checkbox
            checked={doctorDeclares}
            onChange={setDoctorDeclares}
            label="I confirm I am a registered medical practitioner and the details I gave are true. Required."
          >
            <Text variant="body">
              I confirm I am a registered medical practitioner and the details I gave are true. (Required)
            </Text>
          </Checkbox>
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
