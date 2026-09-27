import Ionicons from '@expo/vector-icons/Ionicons';
import { useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  TextInput,
  View,
} from 'react-native';

import { sendChatMessage, type ChatTurn } from '@/api/chat.api';
import { ApiError } from '@/api/client';
import { useAuth } from '@/store/auth';
import { colors, fonts, radius, space, TOUCH_MIN } from '@/theme/tokens';
import { Banner, Chip, SurfaceProvider, Text } from '@/ui';

type Props = {
  patientId: string;
  /** Tappable example questions shown before the first message. */
  suggestions: string[];
};

/**
 * The message list, input, and the request/response cycle. Shared by both
 * entry points — a doctor asking about a patient and a patient asking about
 * themselves send to the exact same endpoint with the exact same shape. The
 * backend, not this component, decides the tone and the limits of the reply
 * from who is asking; this component has no role-specific branches at all.
 */
export function PatientChat({ patientId, suggestions }: Props) {
  const { authedFetch } = useAuth();
  const scrollRef = useRef<ScrollView>(null);

  const [messages, setMessages] = useState<ChatTurn[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [focused, setFocused] = useState(false);

  async function send(text: string) {
    const content = text.trim();
    if (!content || sending) return;

    const next = [...messages, { role: 'user' as const, content }];
    setMessages(next);
    setInput('');
    setError(null);
    setSending(true);

    try {
      const { reply } = await authedFetch((token) => sendChatMessage(token, patientId, next));
      setMessages([...next, { role: 'assistant', content: reply }]);
    } catch (e) {
      // The question stays on screen rather than being rolled back — losing
      // what someone just typed to a network blip is worse than showing an
      // error next to it.
      setError(e instanceof ApiError ? e.message : 'Could not reach the assistant.');
    } finally {
      setSending(false);
      requestAnimationFrame(() => scrollRef.current?.scrollToEnd({ animated: true }));
    }
  }

  const canSend = input.trim().length > 0 && !sending;

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={insetOffset}
    >
      <ScrollView
        ref={scrollRef}
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: space.gutter, gap: space.md, flexGrow: 1 }}
        onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
        keyboardShouldPersistTaps="handled"
      >
        {messages.length === 0 ? (
          <View style={{ gap: space.sm + 4, marginTop: space.sm }}>
            <Text variant="body" color="textMuted">
              Ask a question to get started. For example:
            </Text>
            {suggestions.map((s) => (
              <Chip key={s} label={s} onPress={() => send(s)} />
            ))}
          </View>
        ) : (
          messages.map((m, i) => <Bubble key={i} turn={m} />)
        )}

        {sending && <Thinking />}

        {error && <Banner tone="error">{error}</Banner>}
      </ScrollView>

      <View
        style={{
          flexDirection: 'row',
          gap: space.sm,
          alignItems: 'flex-end',
          padding: space.md,
          borderTopWidth: 1,
          borderTopColor: colors.divider,
          backgroundColor: colors.bg,
        }}
      >
        <TextInput
          value={input}
          onChangeText={setInput}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder="Ask a question…"
          placeholderTextColor={colors.placeholder}
          selectionColor={colors.accent}
          accessibilityLabel="Your question"
          multiline
          style={{
            flex: 1,
            minHeight: TOUCH_MIN,
            maxHeight: 140,
            borderWidth: focused ? 3 : 2,
            borderColor: focused ? colors.accent : colors.edge,
            borderRadius: radius.md,
            backgroundColor: colors.field,
            paddingHorizontal: space.md - (focused ? 1 : 0),
            paddingVertical: space.sm + 4,
            fontSize: 20,
            fontFamily: fonts.regular,
            color: colors.text,
          }}
        />
        <Pressable
          onPress={() => send(input)}
          disabled={!canSend}
          accessibilityRole="button"
          accessibilityLabel="Send"
          accessibilityState={{ disabled: !canSend }}
          style={{
            width: TOUCH_MIN,
            height: TOUCH_MIN,
            borderRadius: TOUCH_MIN / 2,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: canSend ? colors.accent : colors.surfaceRaised,
            borderWidth: canSend ? 0 : 2,
            borderStyle: 'dashed',
            borderColor: colors.edge,
          }}
        >
          <Ionicons name="arrow-up" size={28} color={canSend ? colors.textInverse : colors.textMuted} />
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

// A fixed estimate rather than measuring the header: close enough that the
// input never lands under the keyboard, which is the only failure that
// matters here — a few extra pixels of gap above it does not.
const insetOffset = Platform.OS === 'ios' ? 100 : 0;

function Bubble({ turn }: { turn: ChatTurn }) {
  const mine = turn.role === 'user';
  return (
    <View style={{ alignItems: mine ? 'flex-end' : 'flex-start' }}>
      <SurfaceProvider value={mine ? 'selected' : 'surface'}>
        <View
          style={{
            maxWidth: '86%',
            backgroundColor: mine ? colors.selected : colors.surface,
            borderRadius: radius.lg,
            // The corner nearest the speaker is squared off, like a tail.
            borderBottomRightRadius: mine ? 6 : radius.lg,
            borderBottomLeftRadius: mine ? radius.lg : 6,
            paddingHorizontal: space.md,
            paddingVertical: space.sm + 4,
            gap: 2,
          }}
        >
          <Text variant="caption" color="textMuted">
            {mine ? 'You' : 'Assistant'}
          </Text>
          <Text variant="body">{turn.content}</Text>
        </View>
      </SurfaceProvider>
    </View>
  );
}

function Thinking() {
  return (
    <View
      accessibilityLiveRegion="polite"
      accessibilityLabel="The assistant is thinking"
      style={{
        alignSelf: 'flex-start',
        flexDirection: 'row',
        alignItems: 'center',
        gap: space.sm,
        paddingHorizontal: space.md,
        paddingVertical: space.sm,
        borderRadius: radius.pill,
        backgroundColor: colors.surface,
      }}
    >
      {[1, 0.7, 0.45].map((o) => (
        <View key={o} style={{ width: 9, height: 9, borderRadius: 5, backgroundColor: colors.accent, opacity: o }} />
      ))}
      <SurfaceProvider value="surface">
        <Text variant="label">Thinking…</Text>
      </SurfaceProvider>
    </View>
  );
}
