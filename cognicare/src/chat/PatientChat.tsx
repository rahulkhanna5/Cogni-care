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
import { colors, radius, space, TOUCH_MIN } from '@/theme/tokens';
import { Text } from '@/ui';

type Props = {
  patientId: string;
  /** Shown above the empty state and as the placeholder starting point. */
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

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={insetOffset}
    >
      <ScrollView
        ref={scrollRef}
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: space.lg, gap: space.md, flexGrow: 1 }}
        onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
      >
        {messages.length === 0 ? (
          <View style={{ gap: space.md, marginTop: space.lg }}>
            <Text variant="body" color="textMuted">
              Ask a question to get started. For example:
            </Text>
            {suggestions.map((s) => (
              <Pressable
                key={s}
                onPress={() => send(s)}
                accessibilityRole="button"
                style={{
                  minHeight: TOUCH_MIN,
                  justifyContent: 'center',
                  paddingHorizontal: space.md,
                  borderRadius: radius.md,
                  borderWidth: 2,
                  borderColor: colors.border,
                  backgroundColor: colors.surface,
                }}
              >
                <Text variant="body">{s}</Text>
              </Pressable>
            ))}
          </View>
        ) : (
          messages.map((m, i) => <Bubble key={i} turn={m} />)
        )}

        {sending && (
          <View style={{ alignSelf: 'flex-start' }}>
            <Text variant="caption" color="textMuted">
              Thinking…
            </Text>
          </View>
        )}

        {error && (
          <View
            style={{
              backgroundColor: colors.dangerSoft,
              borderRadius: radius.md,
              borderWidth: 2,
              borderColor: colors.danger,
              padding: space.md,
            }}
          >
            <Text variant="body" color="danger">
              {error}
            </Text>
          </View>
        )}
      </ScrollView>

      <View
        style={{
          flexDirection: 'row',
          gap: space.sm,
          alignItems: 'flex-end',
          padding: space.md,
          borderTopWidth: 2,
          borderTopColor: colors.border,
          backgroundColor: colors.bg,
        }}
      >
        <TextInput
          value={input}
          onChangeText={setInput}
          placeholder="Ask a question…"
          placeholderTextColor={colors.disabled}
          multiline
          style={{
            flex: 1,
            minHeight: TOUCH_MIN,
            maxHeight: 140,
            borderWidth: 2,
            borderColor: colors.border,
            borderRadius: radius.md,
            backgroundColor: colors.surface,
            paddingHorizontal: space.md,
            paddingVertical: space.sm,
            fontSize: 20,
            color: colors.text,
          }}
        />
        <Pressable
          onPress={() => send(input)}
          disabled={!input.trim() || sending}
          accessibilityRole="button"
          accessibilityLabel="Send"
          style={{
            width: TOUCH_MIN,
            height: TOUCH_MIN,
            borderRadius: radius.md,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: input.trim() && !sending ? colors.accent : colors.surface,
          }}
        >
          <Ionicons
            name="arrow-up"
            size={26}
            color={input.trim() && !sending ? colors.textInverse : colors.disabled}
          />
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
    <View style={{ alignItems: mine ? 'flex-end' : 'flex-start', gap: space.xs }}>
      <Text variant="caption" color="textMuted">
        {mine ? 'You' : 'Assistant'}
      </Text>
      <View
        style={{
          maxWidth: '85%',
          backgroundColor: mine ? colors.accentSoft : colors.surface,
          borderRadius: radius.lg,
          paddingHorizontal: space.md,
          paddingVertical: space.sm,
        }}
      >
        <Text variant="body">{turn.content}</Text>
      </View>
    </View>
  );
}
