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
    const fileBuffers: Buffer[] = [];
    const fileNames: string[] = [];

    for (let i = 0; i < files.length; i++) {
        const filePath = files[i];
        const fileBuffer = readFileSync(filePath);
        fileBuffers.push(fileBuffer);
        const fileName = basename(filePath);
        fileNames.push(fileName);

        const filePartName = `file-${i}`;

        filePartNames.push(filePartName);

        if (filePath === primaryFile) {
            primaryFilePartName = filePartName;
        }
    }

    const versionData: any = {
        project_id: projectId,
        file_parts: filePartNames,
        version_type: pluginConfig.release_type || 'release',
        featured: modrinth?.featured || false,
        status: modrinth?.status || 'listed',
        requested_status: modrinth?.requested_status || 'listed',
    };

    if (primaryFilePartName) {
        versionData.primary_file = primaryFilePartName;
    }

    if (modrinth?.dependencies) {
        versionData.dependencies = modrinth?.dependencies;
    } else {
        let dependencies = [];
        for (const dependency of pluginConfig.dependencies || []) {
            dependencies.push({
                project_id:
                    dependency.modrinth_project_id ||
                    (await getModrinthProjectBySlug(dependency.slug, token)),
                dependency_type: dependency.type,
            });
        }
        versionData.dependencies = dependencies;
    }

    const changelog = resolveAndRenderTemplate(
        [modrinth?.changelog, nextRelease.notes],
        {
            ...context,
            ...strategy,
        }
    );

    if (changelog) {
        versionData.changelog = changelog;
    }

    versionData.name =
        resolveAndRenderTemplate(
            [modrinth?.display_name, pluginConfig.display_name],
            {
                ...context,
                ...strategy,
            }
        ) || nextRelease.name;

    versionData.version_number =
        resolveAndRenderTemplate([modrinth?.version_number], {
            ...context,
            ...strategy,
        }) || nextRelease.version;

    versionData.game_versions =
        resolveAndRenderTemplates(
            [modrinth?.game_versions, pluginConfig.game_versions],
            {
                ...context,
                ...strategy,
            }
        ) || [];

    versionData.loaders =
        resolveAndRenderTemplates(
            [modrinth?.mod_loaders, pluginConfig.mod_loaders],
            {
                ...context,
                ...strategy,
            }
        ) || [];

    form.append('data', JSON.stringify(versionData), {
        contentType: 'application/json',
    });

    for (let i = 0; i < files.length; i++) {
        const filePartName = filePartNames[i];
        const fileBuffer = fileBuffers[i];
        const fileName = fileNames[i];

        form.append(filePartName, fileBuffer, { filename: fileName });
    }

    const headers = form.getHeaders();
    headers['Content-Length'] = form.getLengthSync();

    const versionRes = await axios.post(
        'https://api.modrinth.com/v2/version',
        form,
        {
            headers: {
                ...headers,
                Authorization: token,
            },
            validateStatus: (status) => status < 500,
        }
    );

    const resData = versionRes.data;

    if (versionRes.status === 200) {
        logger.log(
            `Successfully published to Modrinth: ${resData.project_id} (File ID: ${resData.file_id})`
        );
        return versionRes.data.id;
    } else if (versionRes.status === 400 || versionRes.status === 401) {
        throw new Error(
            `Failed to publish to Modrinth (${versionRes.status}): ${resData.error}\n${resData.description}`
        );
    } else {
        logger.log('Headers:', versionRes.headers);
        logger.log('Data:', resData);
        throw new Error(
            `Failed to publish to Modrinth (${versionRes.status}): ${versionRes.statusText}`
        );
    }
}

async function getModrinthProjectBySlug(
    slug: string,
    token: string
): Promise<string | undefined> {
    const projectRes = await axios.get(
        `https://api.modrinth.com/v2/project/${slug}`,
        {
            headers: {
                Authorization: token,
            },
        }
    );
    if (projectRes.status === 200) {
        return projectRes.data.id;
    }
}
