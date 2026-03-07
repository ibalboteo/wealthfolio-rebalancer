/**
 * Tests for the HoldingPlanData validator and plan-merge logic.
 *
 * These are the most critical tests in the suite: the validator is the
 * safety net that prevents crashes when localStorage holds malformed,
 * missing, or legacy data on first run.
 */
import { describe, expect, it } from 'vitest';
import { isHoldingPlanDataArray } from './use-holdings';

describe('isHoldingPlanDataArray', () => {
  // --- happy path ---

  it('accepts an empty array (first-run cold start)', () => {
    expect(isHoldingPlanDataArray([])).toBe(true);
  });

  it('accepts a valid array with one entry', () => {
    expect(isHoldingPlanDataArray([{ id: 'a', target: 50, enabled: true }])).toBe(true);
  });

  it('accepts a valid array with multiple entries', () => {
    const plan = [
      { id: 'a', target: 60, enabled: true },
      { id: 'b', target: 30, enabled: false },
      { id: 'c', target: 10, enabled: true },
    ];
    expect(isHoldingPlanDataArray(plan)).toBe(true);
  });

  it('accepts target = 0 (valid, unconfigured holding)', () => {
    expect(isHoldingPlanDataArray([{ id: 'a', target: 0, enabled: true }])).toBe(true);
  });

  it('accepts target = 100 (valid, entire portfolio in one holding)', () => {
    expect(isHoldingPlanDataArray([{ id: 'a', target: 100, enabled: true }])).toBe(true);
  });

  // --- null / undefined / primitive ---

  it('rejects null', () => {
    expect(isHoldingPlanDataArray(null)).toBe(false);
  });

  it('rejects undefined', () => {
    expect(isHoldingPlanDataArray(undefined)).toBe(false);
  });

  it('rejects a plain object (not an array)', () => {
    expect(isHoldingPlanDataArray({ id: 'a', target: 50, enabled: true })).toBe(false);
  });

  it('rejects a string', () => {
    expect(isHoldingPlanDataArray('[]')).toBe(false);
  });

  it('rejects a number', () => {
    expect(isHoldingPlanDataArray(42)).toBe(false);
  });

  // --- invalid numeric targets ---

  it('rejects target: NaN', () => {
    expect(isHoldingPlanDataArray([{ id: 'a', target: Number.NaN, enabled: true }])).toBe(false);
  });

  it('rejects target: Infinity', () => {
    expect(isHoldingPlanDataArray([{ id: 'a', target: Infinity, enabled: true }])).toBe(false);
  });

  it('rejects target: -Infinity', () => {
    expect(isHoldingPlanDataArray([{ id: 'a', target: -Infinity, enabled: true }])).toBe(false);
  });

  // --- wrong field types ---

  it('rejects when id is a number instead of string', () => {
    expect(isHoldingPlanDataArray([{ id: 123, target: 50, enabled: true }])).toBe(false);
  });

  it('rejects when target is a string instead of number', () => {
    expect(isHoldingPlanDataArray([{ id: 'a', target: '50', enabled: true }])).toBe(false);
  });

  it('rejects when enabled is a number instead of boolean', () => {
    expect(isHoldingPlanDataArray([{ id: 'a', target: 50, enabled: 1 }])).toBe(false);
  });

  // --- missing fields ---

  it('rejects when id is missing', () => {
    expect(isHoldingPlanDataArray([{ target: 50, enabled: true }])).toBe(false);
  });

  it('rejects when target is missing', () => {
    expect(isHoldingPlanDataArray([{ id: 'a', enabled: true }])).toBe(false);
  });

  it('rejects when enabled is missing', () => {
    expect(isHoldingPlanDataArray([{ id: 'a', target: 50 }])).toBe(false);
  });

  // --- mixed valid/invalid ---

  it('rejects an array where one entry is invalid', () => {
    const plan = [
      { id: 'ok', target: 50, enabled: true },
      { id: 'bad', target: Number.NaN, enabled: true }, // NaN target
    ];
    expect(isHoldingPlanDataArray(plan)).toBe(false);
  });

  // --- critical regression guard ---
  // Before the fix, useConfigure read the plan key with isPlannedHoldingArray
  // (which checked for value.plan.id), so a valid HoldingPlanData[] was always
  // rejected and the addon kept asking for configuration.
  it('accepts data that was incorrectly rejected by the old PlannedHolding validator', () => {
    // HoldingPlanData does NOT have a nested "plan" field — that was the bug.
    const storedPlan = [
      { id: 'AAPL', target: 60, enabled: true },
      { id: 'BONDS', target: 40, enabled: false },
    ];
    expect(isHoldingPlanDataArray(storedPlan)).toBe(true);
  });
});
