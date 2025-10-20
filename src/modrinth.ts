import axios from 'axios';
import FormData from 'form-data';
import { createReadStream } from 'node:fs';
import { basename } from 'path';
import { PublishContext } from 'semantic-release';
import { PluginConfig } from './definitions/plugin-config.js';
import { findFilesAndPrimaryFile } from './utils/platform/utils.js';
import {
    resolveAndRenderTemplate,
    resolveAndRenderTemplates,
} from './utils/template-utils.js';

/**
 * Publishes files to Modrinth.
 */
export async function publishToModrinth(
    pluginConfig: PluginConfig,
    context: PublishContext,
    strategy: Record<string, string>
): Promise<string> {
    const { env, logger, nextRelease } = context;
    const { modrinth } = pluginConfig;
    const token = env.MODRINTH_TOKEN!;
    const projectId = modrinth?.project_id!;

    const { files, primaryFile } = await findFilesAndPrimaryFile(
        pluginConfig,
        context,
        strategy,
        'modrinth'
    );
    logger.log(
        `Publishing ${files.length} file(s) to Modrinth project ${projectId}...`
    );

    // use multipart/form-data to upload files and version data
    const form = new FormData();
    const filePartNames: string[] = [];
    let primaryFilePartName: string | undefined = undefined;

    for (let i = 0; i < files.length; i++) {
        const filePath = files[i];
        const file = createReadStream(filePath);
        const fileName = basename(filePath);

        const filePartName = `file-${i}`;

        form.append(filePartName, file, { filename: fileName });
        filePartNames.push(filePartName);

        if (filePath === primaryFile) {
            primaryFilePartName = filePartName;
        }
    }

    const versionData: any = {
        project_id: projectId,
        file_parts: filePartNames,
        changelog: modrinth?.changelog || nextRelease.notes || '',
        loaders: modrinth?.mod_loaders || [],
        version_type: pluginConfig.release_type || 'release',
        dependencies: modrinth?.dependencies || [],
        featured: modrinth?.featured || false,
        status: modrinth?.status || 'listed',
        requested_status: modrinth?.requested_status || 'listed',
        primary_file: primaryFilePartName,
    };

    const displayName = resolveAndRenderTemplate(
        [modrinth?.display_name, pluginConfig.display_name],
        {
            nextRelease,
            ...strategy,
        }
    );

    versionData.name = displayName || nextRelease.name;

    const versionNumber = resolveAndRenderTemplate([modrinth?.version_number], {
        nextRelease,
        ...strategy,
    });

    versionData.version_number = versionNumber || nextRelease.version;

    const gameVersions = resolveAndRenderTemplates(
        [modrinth?.game_versions, pluginConfig.game_versions],
        {
            nextRelease,
            ...strategy,
        }
    );

    versionData.game_versions = gameVersions || [];

    const modLoaders = resolveAndRenderTemplates(
        [modrinth?.mod_loaders, pluginConfig.mod_loaders],
        {
            nextRelease,
            ...strategy,
        }
    );

    versionData.mod_loaders = modLoaders || [];

    form.append('data', JSON.stringify(versionData));

    const versionResponse = await axios.post(
        'https://api.modrinth.com/v2/version',
        form,
        {
            headers: {
                ...form.getHeaders(),
                Authorization: token,
            },
            validateStatus: (status) => status < 500,
        }
    );

    const resData = versionResponse.data;

    if (versionResponse.status === 200) {
        logger.log(
            `Successfully published to Modrinth: ${resData.project_id} (File ID: ${resData.file_id})`
        );
        return versionResponse.data.id;
    } else if (
        versionResponse.status === 400 ||
        versionResponse.status === 401
    ) {
        throw new Error(
            `Failed to publish to Modrinth (${versionResponse.status}): ${resData}`
        );
    } else {
        throw new Error(
            `Failed to publish to Modrinth (${versionResponse.status}): ${resData}`
        );
    }
}
