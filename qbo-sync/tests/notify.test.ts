import { describe, it, expect, vi } from 'vitest';
import { deliverOpsAlert } from '../src/notify.js';

describe('deliverOpsAlert', () => {
  it('does not attempt delivery when no URL is configured', async () => {
    const fetchSpy = vi.fn();
    const ok = await deliverOpsAlert(undefined, 'subj', 'body', fetchSpy as unknown as typeof fetch);
    expect(ok).toBe(false);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('POSTs a Slack-compatible payload when a URL is set', async () => {
    const fetchSpy = vi.fn(
      async (_url: string | URL | Request, _init?: RequestInit) => new Response(null, { status: 200 }),
    );
    const ok = await deliverOpsAlert(
      'https://hooks.example.com/abc',
      'Job dead-lettered',
      'event wh:Invoice:42 failed',
      fetchSpy as unknown as typeof fetch,
    );
    expect(ok).toBe(true);
    expect(fetchSpy).toHaveBeenCalledOnce();
    const [url, init] = fetchSpy.mock.calls[0]!;
    expect(url).toBe('https://hooks.example.com/abc');
    const body = JSON.parse(init!.body as string) as { text: string };
    expect(body.text).toContain('Job dead-lettered');
    expect(body.text).toContain('event wh:Invoice:42 failed');
  });

  it('returns false (does not throw) when the webhook responds non-2xx', async () => {
    const fetchSpy = vi.fn(async () => new Response('nope', { status: 500 }));
    const ok = await deliverOpsAlert('https://hooks.example.com/abc', 's', 'b', fetchSpy as unknown as typeof fetch);
    expect(ok).toBe(false);
  });

  it('returns false (does not throw) when fetch itself rejects', async () => {
    const fetchSpy = vi.fn(async () => {
      throw new Error('network down');
    });
    const ok = await deliverOpsAlert('https://hooks.example.com/abc', 's', 'b', fetchSpy as unknown as typeof fetch);
    expect(ok).toBe(false);
  });
});
