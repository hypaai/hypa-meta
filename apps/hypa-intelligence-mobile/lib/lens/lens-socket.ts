import { API_URL } from '@/api';
import { getSettingsJson, parseKeyboardSettings } from '@/lib/keyboard-settings';

const RECONNECT_MS = [300, 1000, 3000, 5000];
const UNAVAILABLE_FOR_MS = 30_000;
/** A line whose reply never comes must fail so it can retry, not sit as a skeleton forever. */
export const TRANSLATE_TIMEOUT_MS = 30_000;

export class LensSocketUnavailable extends Error {}
export class LensSocketOffline extends Error {}
export class LensSocketTimeout extends Error {}

type NativeWebSocket = new (
  url: string,
  protocols?: string | string[],
  options?: { headers: Record<string, string> },
) => WebSocket;

type Waiting = {
  message: string;
  resolve: (text: string) => void;
  reject: (error: Error) => void;
};
type Inbound = { type: 'translation'; id: string; text: string } | { type: 'error'; id: string; message: string };
export type LensTranslationMode = {
  type: 'agent' | 'mt';
  provider: string;
  model: string;
};

export function lensSocketUrl(base = API_URL) {
  return `${base.replace(/^http/i, 'ws').replace(/\/+$/, '')}/v2/agent/lens`;
}

export class LensSocket {
  private socket?: WebSocket;
  private open = false;
  private everOpened = false;
  private attempts = 0;
  private sequence = 0;
  private closed = false;
  private unavailableUntil = 0;
  private reconnect?: ReturnType<typeof setTimeout>;
  private readonly waiting = new Map<string, Waiting>();

  constructor(private readonly url = lensSocketUrl()) {}

  /** Each line uses either the agent pipeline or the selected MT model. */
  translate(text: string, target: string, mode: LensTranslationMode): Promise<string> {
    if (this.closed) return Promise.reject(new Error('Lens closed'));
    if (Date.now() < this.unavailableUntil) return Promise.reject(new LensSocketUnavailable());
    const id = String(++this.sequence);
    const message = JSON.stringify({
      type: 'translate',
      id,
      text,
      target,
      mode,
    });
    return new Promise<string>((resolve, reject) => {
      const timer = setTimeout(() => {
        if (this.waiting.delete(id)) reject(new LensSocketTimeout());
      }, TRANSLATE_TIMEOUT_MS);
      this.waiting.set(id, {
        message,
        resolve: (text) => {
          clearTimeout(timer);
          resolve(text);
        },
        reject: (error) => {
          clearTimeout(timer);
          reject(error);
        },
      });
      if (this.open) this.socket?.send(message);
      else this.connect();
    });
  }

  close() {
    this.closed = true;
    clearTimeout(this.reconnect);
    this.socket?.close();
    this.socket = undefined;
    this.failAll(new Error('Lens closed'));
  }

  private connect() {
    if (this.socket || this.reconnect || this.closed) return;
    const { token } = parseKeyboardSettings(getSettingsJson());
    const socket = new (WebSocket as unknown as NativeWebSocket)(this.url, undefined, {
      headers: token.trim() ? { Authorization: `Bearer ${token.trim()}` } : {},
    });
    this.socket = socket;

    socket.onopen = () => {
      if (this.socket !== socket) return;
      this.open = true;
      this.everOpened = true;
      this.attempts = 0;
      for (const { message } of this.waiting.values()) socket.send(message);
    };

    socket.onmessage = (event) => {
      let data: Inbound;
      try {
        data = JSON.parse(String(event.data)) as Inbound;
      } catch {
        return;
      }
      const waiting = this.waiting.get(data.id);
      if (!waiting) return;
      this.waiting.delete(data.id);
      if (data.type === 'translation') waiting.resolve(data.text);
      else waiting.reject(new Error(data.message || 'Translation failed'));
    };

    socket.onclose = () => {
      if (this.socket !== socket) return;
      this.socket = undefined;
      this.open = false;
      if (this.closed) return;
      this.attempts += 1;
      if (!this.everOpened && this.attempts >= 2) {
        this.unavailableUntil = Date.now() + UNAVAILABLE_FOR_MS;
        this.attempts = 0;
        this.failAll(new LensSocketUnavailable());
        return;
      }
      if (this.attempts > RECONNECT_MS.length) {
        this.attempts = 0;
        this.failAll(new LensSocketOffline());
        return;
      }
      if (!this.waiting.size) return;
      const delay = RECONNECT_MS[Math.min(this.attempts - 1, RECONNECT_MS.length - 1)];
      this.reconnect = setTimeout(() => {
        this.reconnect = undefined;
        if (this.waiting.size) this.connect();
      }, delay);
    };

    socket.onerror = () => {};
  }

  private failAll(error: Error) {
    const waiting = [...this.waiting.values()];
    this.waiting.clear();
    for (const entry of waiting) entry.reject(error);
  }
}
