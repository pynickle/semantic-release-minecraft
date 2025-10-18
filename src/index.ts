import {
    PrepareContext,
    PublishContext,
    VerifyConditionsContext,
} from 'semantic-release';
import { publishToCurseforge } from './curseforge';
import { Plugin_config } from './definitions/plugin_config';
import { publishToModrinth } from './modrinth';
import { getCurseForgeGameVersionIds } from './prepare';

// 模块级变量存储 CurseForge 版本映射
let curseforgeGameVersionsIds: number[] | undefined;

export async function verifyConditions(
    pluginConfig: Plugin_config,
    context: VerifyConditionsContext
) {
    // 验证配置：只检查 project_id，token 通过环境变量验证
    if (pluginConfig.curseforge && !pluginConfig.curseforge.project_id) {
        throw new Error('CurseForge project ID is required');
    }

    if (pluginConfig.modrinth && !pluginConfig.modrinth.project_id) {
        throw new Error('Modrinth project ID is required');
    }
}

export async function prepare(
    pluginConfig: Plugin_config,
    context: PrepareContext
) {
    const { env, logger } = context;

    if (env.CURSEFORGE_TOKEN) {
        const apiKey = env.CURSEFORGE_TOKEN;
        try {
            logger.log('Fetching CurseForge game versions and types...');

            // 创建版本映射并存储在模块级变量中供后续使用
            curseforgeGameVersionsIds = await getCurseForgeGameVersionIds(
                apiKey,
                pluginConfig.curseforge!,
                env,
                context.nextRelease
            );

            logger.log(
                `Successfully transform ${Object.keys(curseforgeGameVersionsIds).length} CurseForge game versions`
            );
        } catch (error) {
            logger.warn(
                `Failed to fetch CurseForge game versions: ${error instanceof Error ? error.message : 'Unknown error'}`
            );
        }
    }
}

export async function publish(
    pluginConfig: Plugin_config,
    context: PublishContext
): Promise<{ url: string }[]> {
    const { env, logger } = context;
    const results: { url: string }[] = [];

    try {
        if (env.CURSEFORGE_TOKEN) {
            const curseforgeId = await publishToCurseforge(
                pluginConfig,
                context,
                curseforgeGameVersionsIds
            );
            results.push({
                url: `https://www.curseforge.com/minecraft/mc-mods/${pluginConfig.curseforge!.project_id}/files/${curseforgeId}`,
            });
        } else {
            logger.log(
                'CurseForge publishing is skipped: CURSEFORGE_TOKEN environment variable not found.'
            );
        }

        // 发布到 Modrinth（如果配置了 Modrinth 且存在环境变量）
        if (env.MODRINTH_TOKEN) {
            const modrinthId = await publishToModrinth(pluginConfig, context);
            results.push({
                url: `https://modrinth.com/mod/${pluginConfig.modrinth!.project_id}/version/${modrinthId}`,
            });
        } else {
            logger.log(
                'Modrinth publishing is skipped: MODRINTH_TOKEN environment variable not found.'
            );
        }

        return results;
    } catch (error) {
        logger.error('Failed to publish:', error);
        throw error;
    }
}
