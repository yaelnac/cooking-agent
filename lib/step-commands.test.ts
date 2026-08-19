import { describe, expect, it } from 'vitest';
import {
  detectStepCommand,
  resolveStepMove,
  screenCompletedMessage,
  screenStepMessage,
} from './step-commands';

describe('detectStepCommand', () => {
  it('treats completion words as next', () => {
    expect(detectStepCommand('done')).toBe('next');
    expect(detectStepCommand("I'm done!")).toBe('next');
    expect(detectStepCommand('next step')).toBe('next');
    expect(detectStepCommand('ok, move on')).toBe('next');
    expect(detectStepCommand('finished')).toBe('next');
  });

  it('treats soft go-aheads as begin', () => {
    expect(detectStepCommand('ready')).toBe('begin');
    expect(detectStepCommand('all set')).toBe('begin');
    expect(detectStepCommand("let's start")).toBe('begin');
    expect(detectStepCommand('got it, keep going')).toBe('begin');
  });

  it('detects going back', () => {
    expect(detectStepCommand('go back')).toBe('back');
    expect(detectStepCommand('back please')).toBe('back');
    expect(detectStepCommand('previous step')).toBe('back');
  });

  it('ignores repeat requests', () => {
    expect(detectStepCommand('repeat')).toBeNull();
    expect(detectStepCommand('say that again')).toBeNull();
  });

  it('ignores long utterances — conversation, not commands', () => {
    expect(
      detectStepCommand('I am done with the yogurt but what do I do with it'),
    ).toBeNull();
  });

  it('ignores empty and unrelated input', () => {
    expect(detectStepCommand('')).toBeNull();
    expect(detectStepCommand('how much honey?')).toBeNull();
  });

  it('is immune to screen-action messages', () => {
    expect(detectStepCommand(screenStepMessage(2))).toBeNull();
    expect(detectStepCommand(screenStepMessage(5))).toBeNull();
    expect(detectStepCommand(screenCompletedMessage())).toBeNull();
  });
});

describe('resolveStepMove', () => {
  const TOTAL = 3;

  it('begin with no step highlighted lands on step 1, not step 2', () => {
    expect(resolveStepMove('begin', null, TOTAL)).toEqual({
      kind: 'go',
      index: 1,
      total: TOTAL,
    });
  });

  it('next with no step highlighted moves past the displayed step 1', () => {
    // The screen shows step 1 before any highlight, so "done" means step 2.
    expect(resolveStepMove('next', null, TOTAL)).toEqual({
      kind: 'go',
      index: 2,
      total: TOTAL,
    });
  });

  it('next advances one step', () => {
    expect(resolveStepMove('next', { index: 1, total: TOTAL }, TOTAL)).toEqual({
      kind: 'go',
      index: 2,
      total: TOTAL,
    });
  });

  it('begin behaves like next once a step is highlighted', () => {
    expect(resolveStepMove('begin', { index: 2, total: TOTAL }, TOTAL)).toEqual(
      { kind: 'go', index: 3, total: TOTAL },
    );
  });

  it('next on the last step completes the recipe', () => {
    expect(resolveStepMove('next', { index: 3, total: TOTAL }, TOTAL)).toEqual({
      kind: 'complete',
    });
  });

  it('back stays put on step 1 or before any highlight', () => {
    expect(resolveStepMove('back', { index: 1, total: TOTAL }, TOTAL)).toEqual({
      kind: 'stay',
    });
    expect(resolveStepMove('back', null, TOTAL)).toEqual({ kind: 'stay' });
  });

  it('back moves one step back', () => {
    expect(resolveStepMove('back', { index: 3, total: TOTAL }, TOTAL)).toEqual({
      kind: 'go',
      index: 2,
      total: TOTAL,
    });
  });

  it('falls back to the recipe step count when the step carries no total', () => {
    expect(resolveStepMove('next', { index: 4, total: 4 }, 0)).toEqual({
      kind: 'complete',
    });
  });
});
