import { describe, expect, it } from 'vitest';
import { toKebabCase, toDisplayName } from './names.js';

describe('toKebabCase', () => {
  it('splits PascalCase words', () => {
    expect(toKebabCase('RedHulkFracturedFrontier')).toBe('red-hulk-fractured-frontier');
  });

  it('keeps acronyms attached to the following word', () => {
    expect(toKebabCase('ABCDefinition')).toBe('abc-definition');
  });

  it('handles digits', () => {
    expect(toKebabCase('Agent13')).toBe('agent13');
    expect(toKebabCase('Spider2099')).toBe('spider2099');
  });

  it('leaves a single lowercase word alone', () => {
    expect(toKebabCase('abomination')).toBe('abomination');
  });
});

describe('toDisplayName', () => {
  it('spaces out PascalCase words', () => {
    expect(toDisplayName('RedHulkFracturedFrontier')).toBe('Red Hulk Fractured Frontier');
  });

  it('keeps an acronym then spaces before the next word', () => {
    expect(toDisplayName('ABCDefinition')).toBe('ABC Definition');
  });

  it('does not add a leading/trailing space', () => {
    expect(toDisplayName('Thor')).toBe('Thor');
  });
});
