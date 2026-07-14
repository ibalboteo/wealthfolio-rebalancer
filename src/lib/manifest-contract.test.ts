import { describe, expect, it } from 'vitest';
import manifest from '../../manifest.json';

describe('manifest contract', () => {
  it('declares 3.6+ routing contributions', () => {
    expect(manifest.minWealthfolioVersion).toBe('3.6.0');
    expect(manifest.contributes.routes).toEqual(
      expect.arrayContaining([expect.objectContaining({ id: 'main' })])
    );
    expect(manifest.contributes.links.sidebar).toEqual(
      expect.arrayContaining([expect.objectContaining({ route: 'main' })])
    );
  });
});
