export type PlatformKey = 'whatsapp' | 'messenger' | 'line';

export type PlatformMeta = {
  key: PlatformKey;
  name: string;
  color: string; // hex
};

const PLATFORM_META: Record<PlatformKey, PlatformMeta> = {
  whatsapp: { key: 'whatsapp', name: 'WhatsApp', color: '#25D366' },
  messenger: { key: 'messenger', name: 'Messenger', color: '#0084FF' },
  line: { key: 'line', name: 'LINE', color: '#00C300' },
};

export function normalizePlatform(platform?: string | null): PlatformKey | null {
  if (!platform) return null;
  const p = platform.toLowerCase();
  if (p === 'whatsapp') return 'whatsapp';
  if (p === 'facebook' || p === 'messenger') return 'messenger';
  if (p === 'line') return 'line';
  return null;
}

export function getPlatformMeta(platform?: string | null): PlatformMeta | null {
  const key = normalizePlatform(platform);
  if (!key) return null;
  return PLATFORM_META[key];
}

