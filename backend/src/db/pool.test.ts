import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { test } from 'node:test';

import { guardCheckedOut, pool } from './pool.js';

const killed = () =>
  Object.assign(new Error('terminating connection due to idle-in-transaction timeout'), {
    code: '25P03',
    severity: 'FATAL',
  });

/**
 * The server died with an uncaught "Emitted 'error' event on Client instance"
 * after Postgres closed a connection (FATAL 25P03). Node throws synchronously
 * from EventEmitter#emit('error', ...) when nothing is listening.
 */
test('the pool survives a dropped idle connection', () => {
  assert.doesNotThrow(() => pool.emit('error', killed()));
});

/** A stand-in for a client checked out of the pool: an emitter with release(). */
function fakeClient() {
  const emitter = new EventEmitter() as EventEmitter & { release: (err?: Error) => void; releasedWith?: Error | null };
  emitter.release = (err?: Error) => {
    emitter.releasedWith = err ?? null;
  };
  return emitter;
}

test('without a guard, a checked-out client losing its connection throws — the original crash', () => {
  // pg-pool removes its own listener on checkout, so this is the real state
  // of a client inside a transaction.
  const client = fakeClient();
  assert.throws(() => client.emit('error', killed()), /idle-in-transaction/);
});

test('a guarded client survives losing its connection mid-transaction', () => {
  const client = fakeClient();
  const guard = guardCheckedOut(client as never);
  assert.doesNotThrow(() => client.emit('error', killed()));
  guard.release();
  // The dead connection is destroyed, not handed to the next request.
  assert.equal((client.releasedWith as Error | null)?.message, killed().message);
  assert.equal(client.listenerCount('error'), 0);
});

test('a healthy guarded client goes back to the pool normally', () => {
  const client = fakeClient();
  guardCheckedOut(client as never).release();
  assert.equal(client.releasedWith, null);
  assert.equal(client.listenerCount('error'), 0);
});
