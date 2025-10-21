import {
    PrepareContext,
    PublishContext,
    VerifyConditionsContext,
} from 'semantic-release';
import { publishToCurseforge } from './curseforge.js';
import { PluginConfig } from './definitions/plugin-config.js';
import { publishToModrinth } from './modrinth.js';
import { getCurseForgeGameVersionIds } from './prepare.js';

// Game version IDs transformed from user's input, used during publishing to CurseForge
let curseforgeGameVersionsIdsPerStrategy: Array<number[]> = [];

export async function verifyConditions(
    pluginConfig: PluginConfig,
    context: VerifyConditionsContext
) {
    const { env } = context;

    if (env.CURSEFORGE_TOKEN && !pluginConfig.curseforge?.project_id) {
        throw new Error('CurseForge project ID is required');
    }

    if (env.MODRINTH_TOKEN && !pluginConfig.modrinth?.project_id) {
        throw new Error('Modrinth project ID is required');
    }
}

export async function prepare(
    pluginConfig: PluginConfig,
    context: PrepareContext
) {
    const { env, logger } = context;

    if (env.CURSEFORGE_TOKEN) {
        const apiToken = env.CURSEFORGE_TOKEN;
        logger.log('Fetching CurseForge game versions and types...');

        curseforgeGameVersionsIdsPerStrategy =
            await getCurseForgeGameVersionIds(apiToken, pluginConfig, context);

        logger.log(
            `Successfully transform into ${Object.keys(curseforgeGameVersionsIdsPerStrategy[0]).length} CurseForge game versions for each strategy`
        );
    }
}

export async function publish(
    pluginConfig: PluginConfig,
    context: PublishContext
): Promise<{ url: string }[]> {
    const { env, logger } = context;
    const results: { url: string }[] = [];

    for (const [index, strategy] of (
        pluginConfig.strategies || [{}]
    ).entries()) {
        if (env.CURSEFORGE_TOKEN) {
            const curseforgeId = await publishToCurseforge(
                pluginConfig,
                context,
                strategy,
                curseforgeGameVersionsIdsPerStrategy[index]
            );
            results.push({
                url: `https://www.curseforge.com/minecraft/mc-mods/${pluginConfig.curseforge!.project_id}/files/${curseforgeId}`,
            });
        } else {
            logger.log(
                'CurseForge publishing is skipped: CURSEFORGE_TOKEN environment variable not found.'
            );
        }

        if (env.MODRINTH_TOKEN) {
            const modrinthId = await publishToModrinth(
                pluginConfig,
                context,
                strategy
            );
            results.push({
                url: `https://modrinth.com/mod/${pluginConfig.modrinth!.project_id}/version/${modrinthId}`,
            });
        } else {
            logger.log(
                'Modrinth publishing is skipped: MODRINTH_TOKEN environment variable not found.'
            );
        }
    }

    return results;
}
