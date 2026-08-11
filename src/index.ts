import type { PrepareContext, PublishContext, VerifyConditionsContext } from 'semantic-release';

import { publishToCurseforge } from './curseforge.js';
import type { PluginConfig } from './definitions/plugin-config.js';
import { publishToModrinth } from './modrinth.js';
import { getCurseForgeGameVersionIds } from './prepare.js';
import { getStrategies } from './utils/utils.js';

// Game version IDs transformed from user's input, used during publishing to CurseForge
let curseforgeGameVersionsIdsPerStrategy: Array<number[]> = [];

export interface PublishResults {
  curseforge: Array<{ url: string }>;
  modrinth: Array<{ url: string }>;
}

export async function verifyConditions(
  pluginConfig: PluginConfig,
  context: VerifyConditionsContext
): Promise<void> {
  const { env } = context;

  if (env.CURSEFORGE_TOKEN && !pluginConfig.curseforge?.project_id) {
    throw new Error('CurseForge project ID is required');
  }

  if (env.MODRINTH_TOKEN && !pluginConfig.modrinth?.project_id) {
    throw new Error('Modrinth project ID is required');
  }
}

export async function prepare(pluginConfig: PluginConfig, context: PrepareContext): Promise<void> {
  const { env, logger } = context;

  if (env.CURSEFORGE_TOKEN) {
    const apiToken = env.CURSEFORGE_TOKEN;
    logger.log('Fetching CurseForge game versions and types...');

    curseforgeGameVersionsIdsPerStrategy = await getCurseForgeGameVersionIds(
      apiToken,
      pluginConfig,
      context
    );

    logger.log(
      `Successfully transform into ${curseforgeGameVersionsIdsPerStrategy[0].length} CurseForge game versions for each strategy`
    );
  }
}

export async function publish(
  pluginConfig: PluginConfig,
  context: PublishContext
): Promise<PublishResults> {
  const { env, logger } = context;
  const results: PublishResults = { curseforge: [], modrinth: [] };

  for (const [index, strategy] of getStrategies(pluginConfig.strategies).entries()) {
    if (env.CURSEFORGE_TOKEN) {
      const curseforgeId = await publishToCurseforge(
        pluginConfig,
        context,
        strategy,
        curseforgeGameVersionsIdsPerStrategy[index]
      );
      results.curseforge.push({
        url: `https://www.curseforge.com/minecraft/mc-mods/${pluginConfig.curseforge!.project_id}/files/${curseforgeId}`,
      });
    } else {
      logger.log(
        'CurseForge publishing is skipped: CURSEFORGE_TOKEN environment variable not found.'
      );
    }

    if (env.MODRINTH_TOKEN) {
      const modrinthId = await publishToModrinth(pluginConfig, context, strategy);
      results.modrinth.push({
        url: `https://modrinth.com/mod/${pluginConfig.modrinth!.project_id}/version/${modrinthId}`,
      });
    } else {
      logger.log('Modrinth publishing is skipped: MODRINTH_TOKEN environment variable not found.');
    }
  }

  return results;
}
