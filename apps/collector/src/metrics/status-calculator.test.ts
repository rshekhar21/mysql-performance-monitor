import { describe, expect, it } from 'vitest';
import { buildServerStatusSnapshot } from './status-calculator.js';

describe('buildServerStatusSnapshot', () => {
  it('maps gauges and suppresses rates for the first snapshot', () => {
    const snapshot = buildServerStatusSnapshot(
      {
        Uptime: '100',
        Threads_connected: '12',
        Threads_running: '3',
        Max_used_connections: '20',
        Questions: '1000',
        Queries: '1200',
        Bytes_received: '4096',
        Bytes_sent: '8192'
      },
      { max_connections: '200' },
      new Date('2026-01-01T00:00:00Z'),
      null
    );

    expect(snapshot.threadsConnected).toBe(12);
    expect(snapshot.maxConnections).toBe(200);
    expect(snapshot.questionsPerSecond).toBeNull();
  });

  it('calculates rates from the previous snapshot', () => {
    const snapshot = buildServerStatusSnapshot(
      {
        Uptime: '130',
        Questions: '1060',
        Queries: '1260',
        Bytes_received: '4696',
        Bytes_sent: '8792'
      },
      { max_connections: '200' },
      new Date('2026-01-01T00:00:30Z'),
      {
        collectedAt: new Date('2026-01-01T00:00:00Z'),
        uptimeSeconds: 100,
        questions: 1000,
        queries: 1200,
        bytesReceived: 4096,
        bytesSent: 8192
      }
    );

    expect(snapshot.questionsPerSecond).toBe(2);
    expect(snapshot.queriesPerSecond).toBe(2);
    expect(snapshot.bytesReceivedPerSecond).toBe(20);
    expect(snapshot.bytesSentPerSecond).toBe(20);
  });

  it('suppresses rates when uptime indicates restart', () => {
    const snapshot = buildServerStatusSnapshot(
      { Uptime: '5', Questions: '20' },
      {},
      new Date('2026-01-01T00:00:30Z'),
      {
        collectedAt: new Date('2026-01-01T00:00:00Z'),
        uptimeSeconds: 100,
        questions: 1000,
        queries: null,
        bytesReceived: null,
        bytesSent: null
      }
    );

    expect(snapshot.questionsPerSecond).toBeNull();
  });
});
