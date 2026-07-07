/**
 * Parses simple duration strings like "15m", "7d", "1h", "30s" into milliseconds.
 * Falls back to treating a bare number as seconds. Mirrors the subset of formats
 * accepted by jsonwebtoken's `expiresIn` option so both stay in sync.
 */
export const parseDurationToMs = (value: string): number => {
  const match = /^(\d+)\s*(ms|s|m|h|d)?$/i.exec(value.trim());

  if (!match) {
    const asNumber = Number(value);
    return Number.isNaN(asNumber) ? 0 : asNumber * 1000;
  }

  const amount = Number(match[1]);
  const unit = (match[2] || 's').toLowerCase();

  const multipliers: Record<string, number> = {
    ms: 1,
    s: 1000,
    m: 60 * 1000,
    h: 60 * 60 * 1000,
    d: 24 * 60 * 60 * 1000,
  };

  return amount * (multipliers[unit] ?? 1000);
};
