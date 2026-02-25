import { redis } from '../../config/redis';

export interface SessionState {
  callId: string;
  agentId: string;
  tenantId: string;
  workflowId: string;
  currentNodeId: string;
  language: string;
  variables: Record<string, unknown>;
  retryCount: number;
  transcript: { role: string; text: string; timestamp: string }[];
}

const SESSION_TTL = 60 * 30; // 30 minutes

export class SessionManager {
  private key: string;

  constructor(callId: string) {
    this.key = `session:${callId}`;
  }

  async init(state: SessionState): Promise<void> {
    await redis.set(this.key, JSON.stringify(state), 'EX', SESSION_TTL);
  }

  async getState(): Promise<SessionState> {
    const data = await redis.get(this.key);
    if (!data) throw new Error('Session not found');
    return JSON.parse(data);
  }

  async update(partial: Partial<SessionState>): Promise<void> {
    const state = await this.getState();
    const updated = { ...state, ...partial };
    await redis.set(this.key, JSON.stringify(updated), 'EX', SESSION_TTL);
  }

  async setVariable(key: string, value: unknown): Promise<void> {
    const state = await this.getState();
    state.variables[key] = value;
    await redis.set(this.key, JSON.stringify(state), 'EX', SESSION_TTL);
  }

  async addTranscriptEntry(role: string, text: string): Promise<void> {
    const state = await this.getState();
    state.transcript.push({ role, text, timestamp: new Date().toISOString() });
    await redis.set(this.key, JSON.stringify(state), 'EX', SESSION_TTL);
  }

  async incrementRetry(): Promise<number> {
    const state = await this.getState();
    state.retryCount += 1;
    await redis.set(this.key, JSON.stringify(state), 'EX', SESSION_TTL);
    return state.retryCount;
  }

  async resetRetry(): Promise<void> {
    await this.update({ retryCount: 0 });
  }

  async destroy(): Promise<void> {
    await redis.del(this.key);
  }
}
