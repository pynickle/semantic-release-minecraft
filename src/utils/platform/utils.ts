import { glob } from 'glob';
import { resolve } from 'path';
import { PublishContext } from 'semantic-release';
import { PluginConfig } from '../../definitions/plugin-config.js';
import { findFilesByGlob } from '../glob-utils.js';
import { resolveAndRenderTemplates } from '../template-utils.js';

/**
 * Find files and primary file for publishing.
 */
export async function findFilesAndPrimaryFile(
    pluginConfig: PluginConfig,
    context: PublishContext,
    strategy: Record<string, string>,
    platform: 'curseforge' | 'modrinth'
): Promise<{ files: string[]; primaryFile: string }> {
    const { nextRelease, logger } = context;

    const filesGlob = resolveAndRenderTemplates(
        [
            platform === 'modrinth'
                ? pluginConfig.modrinth?.glob
                : pluginConfig.curseforge?.glob,
            pluginConfig.glob,
        ],
        {
            nextRelease,
            ...strategy,
        }
    );

    const files = await findFilesByGlob(filesGlob, context);
    logger.log(
        `Found ${files.length} file(s) for publishing: ${files.join(', ')}`
    );

    if (files.length === 0) {
        throw new Error('No files found for publishing.');
    }

    const primaryPatterns = resolveAndRenderTemplates(
        [
            platform === 'modrinth'
                ? pluginConfig.modrinth?.primary_file_glob
                : pluginConfig.curseforge?.primary_file_glob,
            pluginConfig.primary_file_glob,
        ],
        {
            nextRelease,
            ...strategy,
        }
    );

    if (primaryPatterns) {
        let primaryCandidates: string[] = [];

        for (const pattern of primaryPatterns) {
            logger.log(`Searching for primary file with pattern: ${pattern}`);
            const matches = await glob(pattern, {
                cwd: context.cwd,
                nodir: true,
            });
            primaryCandidates.push(
                ...matches.map((file) => resolve(context.cwd!, file))
            );
        }

        primaryCandidates = primaryCandidates.filter((file) =>
            files.includes(file)
        );

        if (primaryCandidates.length === 1) {
            const primaryFile = primaryCandidates[0];
            logger.log(`Selected primary file: ${primaryFile}`);
            return { files: files, primaryFile };
        } else if (primaryCandidates.length > 1) {
            throw new Error(
                `Multiple files matched primary file glob. Please specify a more specific pattern. Found: ${primaryCandidates.join(', ')}`
            );
        } else {
            throw new Error(
                `No files matched primary file glob that were also in the main file list.`
            );
        }
    } else if (files.length > 1) {
        throw new Error(
            `Multiple files found but no primary file glob specified. Please specify which file should be primary.`
        );
    } else {
        return { files: files, primaryFile: files[0] };
    }
}
