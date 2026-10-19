import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { brandSvg, actionIconPaths, ICON_SIZES } from '../mark';

describe('brand mark', () => {
  it('icons/icon.svg is generated from the source mark', () => {
    expect(readFileSync('icons/icon.svg', 'utf8')).toBe(brandSvg());
  });

  it('scopes gradient ids so multiple marks can share a document', () => {
    const a = brandSvg({ idPrefix: 'a' });
    const b = brandSvg({ idPrefix: 'b' });
    expect(a).toContain('id="a-bg"');
    expect(b).toContain('id="b-bg"');
    expect(b).not.toContain('a-bg');
  });

  it('uses user-space stroke gradient so straight segments are painted', () => {
    expect(brandSvg()).toMatch(/id="ri-stroke" gradientUnits="userSpaceOnUse"/);
  });

  it('disabled variant differs and toolbar paths follow state', () => {
    expect(brandSvg({ disabled: true })).not.toBe(brandSvg());
    expect(Object.keys(actionIconPaths(true))).toEqual(ICON_SIZES.map(String));
    expect(actionIconPaths(true)['16']).toBe('icons/icon-16.png');
    expect(actionIconPaths(false)['16']).toBe('icons/icon-disabled-16.png');
  });
});
