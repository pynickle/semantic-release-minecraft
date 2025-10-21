import axios from 'axios';
import FormData from 'form-data';
import { readFileSync } from 'fs';
import { basename } from 'path';
import { PublishContext } from 'semantic-release';
import { PluginConfig } from './definitions/plugin-config.js';
import { findFilesAndPrimaryFile } from './utils/platform/utils.js';
import {
    resolveAndRenderTemplate,
    resolveAndRenderTemplates,
} from './utils/template-utils.js';
import lodash from "lodash";

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
        strategy,
        'curseforge'
    );
    logger.log(
        `Publishing ${files.length} file(s) to CurseForge project ${projectId}...`
    );

    const metadata = prepareMetadata(
        pluginConfig,
        context,
        strategy,
        curseforgeGameVersionIds
    );

    let primaryFileId = await uploadCurseForgeFile(
        pluginConfig,
        context,
        metadata,
        primaryFile
    );

    for (const filePath of files) {
        if (filePath === primaryFile) {
            continue;
        }

        await uploadCurseForgeFile(
            pluginConfig,
            context,
            metadata,
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
    metadata: any,
    filePath: string,
    primaryFileId?: number
): Promise<number> {
    const { env, logger } = context;
    const { curseforge } = pluginConfig;

    const apiKey = env.CURSEFORGE_TOKEN!;
    const projectId = curseforge!.project_id!;

    // add file to form data
    const form = new FormData();
    const file = readFileSync(filePath);
    form.append('file', file, {
        filename: basename(filePath),
    });

    if (primaryFileId) {
        metadata.parentFileID = primaryFileId;
    }

    form.append('metadata', JSON.stringify(metadata));

    // post to CurseForge API
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
            `Successfully published to CurseForge, ${primaryFileId ? 'Primary ' : ''}File ID: ${resData.id}`
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
    strategy: Record<string, string>,
    curseforgeGameVersionIds: number[] | undefined
) {
    const { curseforge } = pluginConfig;
    const metadata: any = {
        gameVersions: curseforgeGameVersionIds,
        releaseType: pluginConfig.release_type || 'release',
        changelog: lodash.template(curseforge?.changelog || context.nextRelease.notes)({...context, ...strategy}),
        changelogType: curseforge?.changelog_type || 'markdown',
        isMarkedForManualRelease:
            curseforge?.is_marked_for_manual_release || false,
        relations: curseforge?.relations
            ? {
                  projects: curseforge?.relations,
              }
            : {},
    };

    metadata.displayName =
        resolveAndRenderTemplate(
            [curseforge?.display_name, pluginConfig.display_name],
            {

                ...context,
                ...strategy,
            }
        ) || context.nextRelease.name;

    metadata.modLoaders =
        resolveAndRenderTemplates(
            [pluginConfig.curseforge?.mod_loaders, pluginConfig.mod_loaders],
            {
                ...context,
                ...strategy,
            }
        ) || [];

    return metadata;
}
