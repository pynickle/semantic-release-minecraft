import axios from 'axios';
import FormData from 'form-data';
import { readFile } from 'fs/promises';
import { basename } from 'path';
import { PublishContext } from 'semantic-release';
import { PluginConfig } from './definitions/plugin-config.js';
import { getCurseForgeModLoaders } from './utils/platform/curseforge-utils.js';
import { findFilesAndPrimaryFile } from './utils/platform/utils.js';
import { resolveAndRenderTemplate } from './utils/template-utils.js';

/**
 * Publishes files to CurseForge.
 */
export async function publishToCurseforge(
    pluginConfig: PluginConfig,
    context: PublishContext,
    strategy: Record<string, string>,
    curseforgeGameVersionIds?: number[]
): Promise<number> {
    const { logger } = context;
    const { curseforge } = pluginConfig;

    const projectId = curseforge!.project_id!;

    const { files, primaryFile } = await findFilesAndPrimaryFile(
        pluginConfig,
        context,
        strategy
    );
    logger.log(
        `Publishing ${files.length} file(s) to CurseForge project ${projectId}...`
    );

    let primaryFileId = await uploadCurseForgeFile(
        pluginConfig,
        context,
        curseforgeGameVersionIds,
        primaryFile
    );

    for (const filePath of files) {
        if (filePath === primaryFile) {
            continue;
        }

        await uploadCurseForgeFile(
            pluginConfig,
            context,
            curseforgeGameVersionIds,
            filePath,
            primaryFileId
        );
    }

    return primaryFileId;
}

/**
 * Uploads a single file to CurseForge.
 */
async function uploadCurseForgeFile(
    pluginConfig: PluginConfig,
    context: PublishContext,
    curseforgeGameVersionIds: number[] | undefined,
    filePath: string,
    primaryFileId?: number
): Promise<number> {
    const { env, logger } = context;
    const { curseforge } = pluginConfig;

    const apiKey = env.CURSEFORGE_TOKEN!;
    const projectId = curseforge!.project_id!;

    const form = new FormData();
    const file = await readFile(filePath);
    form.append('file', file, {
        filename: basename(filePath),
    });

    const metadata = prepareMetadata(
        pluginConfig,
        context,
        curseforgeGameVersionIds
    );

    if (primaryFileId) {
        metadata.parentFileID = primaryFileId;
    }

    form.append('metadata', metadata);

    const response = await axios.post(
        `https://upload.curseforge.com/api/projects/${projectId}/upload-file`,
        form,
        {
            headers: {
                ...form.getHeaders(),
                'X-API-TOKEN': apiKey,
            },
        }
    );

    const resData = response.data;

    if (resData && typeof resData.id === 'number') {
        logger.log(
            `Successfully published to CurseForge, File ID: ${resData.id}`
        );
        return resData.id;
    } else {
        throw new Error(
            `CurseForge API returned unexpected response: ${resData}`
        );
    }
}

/**
 * Prepares metadata for the CurseForge file upload.
 */
function prepareMetadata(
    pluginConfig: PluginConfig,
    context: PublishContext,
    curseforgeGameVersionIds: number[] | undefined
) {
    const { nextRelease } = context;
    const { curseforge } = pluginConfig;
    const metadata: any = {
        gameVersions: curseforgeGameVersionIds,
        releaseType: pluginConfig.release_type || 'release',
        changelog: curseforge?.changelog || context.nextRelease.notes,
        changelogType: curseforge?.changelog_type || 'markdown',
        isMarkedForManualRelease:
            curseforge?.is_marked_for_manual_release || false,
        relations: curseforge?.relations || [],
    };

    const displayName = resolveAndRenderTemplate(
        [curseforge?.display_name, pluginConfig.display_name],
        { nextRelease }
    );

    metadata.display_name = displayName || context.nextRelease.name;

    metadata.modLoaders = getCurseForgeModLoaders(pluginConfig, nextRelease);

    return metadata;
}
