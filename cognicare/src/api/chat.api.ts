import { request } from './client';

export type ChatTurn = { role: 'user' | 'assistant'; content: string };

/**
 * One shared endpoint for both roles — the backend decides tone from who is
 * asking, not from anything the app sends. A doctor gets clinical terms; a
 * patient gets plain language and is pointed at their doctor for anything
 * medical. Access is the same guard used everywhere else a patient's data is
 * read: a patient may only ever open this on themselves.
 */
export const sendChatMessage = (accessToken: string, patientId: string, messages: ChatTurn[]) =>
  request<{ reply: string }>(`/patients/${patientId}/chat`, {
    method: 'POST',
    body: { messages },
    accessToken,
  });
