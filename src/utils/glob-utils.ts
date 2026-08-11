import { resolve } from 'path';

import { glob } from 'glob';
import type { PublishContext } from 'semantic-release';

const DEFAULT_FILE_PATTERNS = [
  'build/libs/!(*-@(dev|sources|javadoc)).jar',
  'build/libs/*-@(dev|sources|javadoc).jar',
];

type GlobContext = Pick<PublishContext, 'cwd' | 'logger'>;

/**
 * Collects absolute file paths for the provided glob patterns.
 */
export async function findGlobMatches(
  patterns: string[],
  context: GlobContext,
  logPrefix = 'Searching for files with pattern'
): Promise<string[]> {
  const { logger, cwd } = context;
  const matches: string[] = [];

  for (const pattern of patterns) {
    logger.log(`${logPrefix}: ${pattern}`);
    matches.push(
      ...(await glob(pattern, {
        cwd,
        nodir: true,
      }))
    );
  }

  return matches.map((file) => resolve(cwd!, file));
}

/**
 * Find files based on provided glob patterns.
 */
export async function findFilesByGlob(
  patterns: string[] = DEFAULT_FILE_PATTERNS,
  context: GlobContext
): Promise<string[]> {
  const files = await findGlobMatches(patterns, context);

  if (files.length === 0) {
    throw new Error(`No files found matching patterns: ${patterns.join(', ')}`);
  }

  return files;
}
