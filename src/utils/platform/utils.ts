import type { PublishContext } from 'semantic-release';

import type {
  PluginConfig,
  PublishingPlatform,
  Strategy,
} from '../../definitions/plugin-config.js';
import { findFilesByGlob, findGlobMatches } from '../glob-utils.js';
import { createTemplateContext, resolveAndRenderTemplates } from '../template-utils.js';

interface PublishingFiles {
  files: string[];
  primaryFile: string;
}

async function selectPrimaryFile(
  files: string[],
  primaryPatterns: string[] | undefined,
  context: PublishContext
): Promise<string> {
  const { logger } = context;

  if (!primaryPatterns) {
    if (files.length > 1) {
      throw new Error(
        'Multiple files found but no primary file glob specified. Please specify which file should be primary.'
      );
    }
    return files[0];
  }

  const primaryCandidates = (
    await findGlobMatches(primaryPatterns, context, 'Searching for primary file with pattern')
  ).filter((file) => files.includes(file));

  if (primaryCandidates.length > 1) {
    throw new Error(
      `Multiple files matched primary file glob. Please specify a more specific pattern. Found: ${primaryCandidates.join(', ')}`
    );
  }
  if (primaryCandidates.length === 0) {
    throw new Error('No files matched primary file glob that were also in the main file list.');
  }

  const primaryFile = primaryCandidates[0];
  logger.log(`Selected primary file: ${primaryFile}`);
  return primaryFile;
}

/**
 * Find files and primary file for publishing.
 */
export async function findFilesAndPrimaryFile(
  pluginConfig: PluginConfig,
  context: PublishContext,
  strategy: Strategy,
  platform: PublishingPlatform
): Promise<PublishingFiles> {
  const { logger } = context;
  const platformConfig = pluginConfig[platform];
  const templateContext = createTemplateContext(context, strategy);

  const filesGlob = resolveAndRenderTemplates(
    [platformConfig?.glob, pluginConfig.glob],
    templateContext
  );

  const files = await findFilesByGlob(filesGlob, context);
  logger.log(`Found ${files.length} file(s) for publishing: ${files.join(', ')}`);

  if (files.length === 0) {
    throw new Error('No files found for publishing.');
  }

  const primaryPatterns = resolveAndRenderTemplates(
    [platformConfig?.primary_file_glob, pluginConfig.primary_file_glob],
    templateContext
  );
  const primaryFile = await selectPrimaryFile(files, primaryPatterns, context);

  return { files, primaryFile };
}
