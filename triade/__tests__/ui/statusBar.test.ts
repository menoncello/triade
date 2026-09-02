import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { statusBarStyle } from '../../src/ui/statusBar.ts';

describe('statusBarStyle — DW-7 dark in landscape', () => {
  it('returns auto in portrait (isLandscape=false)', () => {
    assert.equal(statusBarStyle(false), 'auto');
  });
  it('returns dark in landscape (isLandscape=true)', () => {
    assert.equal(statusBarStyle(true), 'dark');
  });
  it('is pure and deterministic', () => {
    assert.equal(statusBarStyle(false), statusBarStyle(false));
    assert.equal(statusBarStyle(true), statusBarStyle(true));
  });
});
