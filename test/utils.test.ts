import { afterEach, describe, expect, test } from 'bun:test';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

import type { PublishContext } from 'semantic-release';

import { findFilesByGlob, findGlobMatches } from '../src/utils/glob-utils.js';
import {
  createTemplateContext,
  resolveAndRenderTemplate,
  resolveAndRenderTemplates,
} from '../src/utils/template-utils.js';
import { getStrategies, toArray } from '../src/utils/utils.js';

describe('array and strategy normalization', () => {
  test('normalizes nullable and scalar values without copying arrays', () => {
    const values = ['one', 'two'];

    expect(toArray(undefined)).toEqual([]);
    expect(toArray('one')).toEqual(['one']);
    expect(toArray(values)).toBe(values);
  });

  test('uses one empty strategy only when strategies are absent', () => {
    const strategies = [{ channel: 'beta' }];

    expect(getStrategies(strategies)).toBe(strategies);
    expect(getStrategies(undefined)).toEqual([{}]);
    expect(getStrategies([])).toEqual([]);
  });
});

describe('template resolution', () => {
  test('merges strategy values over release context values', () => {
    const context = createTemplateContext(
      { channel: 'stable', version: '1.0.0' },
      { channel: 'beta' }
    );

    expect(resolveAndRenderTemplate(['<%= version %>-<%= channel %>'], context)).toBe('1.0.0-beta');
  });

  test('preserves existing truthy-source fallback behavior', () => {
    expect(resolveAndRenderTemplate(['', 'fallback'], {})).toBe('fallback');
    expect(resolveAndRenderTemplates([[], ['fallback']], {})).toEqual([]);
    expect(resolveAndRenderTemplates([undefined, ['<%= value %>']], { value: 'rendered' })).toEqual(
      ['rendered']
    );
  });
});

describe('glob matching', () => {
  let temporaryDirectory: string | undefined;

  afterEach(async () => {
    if (temporaryDirectory) await rm(temporaryDirectory, { recursive: true, force: true });
    temporaryDirectory = undefined;
  });

  test('returns absolute file paths and logs each pattern', async () => {
    temporaryDirectory = await mkdtemp(join(tmpdir(), 'semantic-release-minecraft-'));
    await writeFile(join(temporaryDirectory, 'artifact.jar'), 'artifact');
    await writeFile(join(temporaryDirectory, 'notes.txt'), 'notes');
    const logs: string[] = [];
    const context = {
      cwd: temporaryDirectory,
      logger: { log: (message: string) => logs.push(message) },
    } as unknown as Pick<PublishContext, 'cwd' | 'logger'>;

    await expect(findGlobMatches(['*.jar'], context)).resolves.toEqual([
      resolve(temporaryDirectory, 'artifact.jar'),
    ]);
    expect(logs).toEqual(['Searching for files with pattern: *.jar']);
  });

  test('reports patterns when no files match', async () => {
    temporaryDirectory = await mkdtemp(join(tmpdir(), 'semantic-release-minecraft-'));
    const context = {
      cwd: temporaryDirectory,
      logger: { log: () => undefined },
    } as unknown as Pick<PublishContext, 'cwd' | 'logger'>;

    await expect(findFilesByGlob(['*.jar'], context)).rejects.toThrow(
      'No files found matching patterns: *.jar'
    );
  });
});
