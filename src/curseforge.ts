import axios from 'axios';
import FormData from 'form-data';
import { readFile } from 'fs/promises';
import { template } from 'lodash';
import { PublishContext } from 'semantic-release';
import { Plugin_config } from './definitions/plugin_config';
import {
    findFiles,
    getCurseForgeModLoaders,
    resolveTemplate,
} from './utils/utils';

/**
 * 为 CurseForge 查找单个文件
 */
async function findFileCurseforge(
    pluginConfig: Plugin_config,
    context: PublishContext
): Promise<string> {
    const { logger } = context;
    const version = context.nextRelease.version;

    // 获取 CurseForge 的 glob 配置，如果没有则使用全局配置
    const curseforgeGlob =
        pluginConfig.curseforge?.glob || pluginConfig.glob || [];

    // 查找文件
    const files = await findFiles(curseforgeGlob, context);

    // 如果只找到一个文件，直接返回
    if (files.length === 1) {
        logger.log(`Using the only found file for CurseForge: ${files[0]}`);
        return files[0];
    }

    logger.log(
        `Found ${files.length} files for CurseForge, trying to filter by version`
    );

    // 如果有版本号，尝试筛选包含版本号的文件
    if (version) {
        const versionedFiles = files.filter((file) => file.includes(version));
        if (versionedFiles.length === 1) {
            logger.log(
                `Using versioned file for CurseForge: ${versionedFiles[0]}`
            );
            return versionedFiles[0];
        } else if (versionedFiles.length > 1) {
            throw new Error(
                `Multiple files found containing version ${version} for CurseForge. Please specify a more specific glob pattern. Found: ${versionedFiles.join(', ')}`
            );
        }
    }

    // 如果无法筛选出单个文件，报错
    throw new Error(
        `Multiple files found for CurseForge but could not determine which to use. Found: ${files.join(', ')}`
    );
}

export async function publishToCurseforge(
    pluginConfig: Plugin_config,
    context: PublishContext,
    curseforgeGameVersionIds?: number[]
): Promise<string> {
    const { env, logger } = context;
    const { curseforge } = pluginConfig;
    const apiKey = env.CURSEFORGE_TOKEN!;
    const projectId = curseforge!.project_id!;
    const nextRelease = context.nextRelease;

    // 查找单个文件
    const filePath = await findFileCurseforge(pluginConfig, context);
    logger.log(
        `Publishing file ${filePath} to CurseForge project ${projectId}...`
    );

    const form = new FormData();
    const file = await readFile(filePath);
    form.append('file', file, {
        filename: filePath.split('\\').pop() || 'mod.jar',
    });

    // 准备 metadata
    // display_name 按照优先级：平台特定配置 > 全局配置 > 平台特定环境变量 > 全局环境变量
    const displayName = resolveTemplate(
        [
            curseforge?.display_name,
            pluginConfig.display_name,
            env.CURSEFORGE_DISPLAY_NAME,
            env.DISPLAY_NAME,
        ],
        nextRelease
    );

    // 准备基础 metadata
    const metadata: any = {
        gameVersions: curseforgeGameVersionIds,
        releaseType: pluginConfig.release_type || 'release',
        changelog: curseforge?.changelog || context.nextRelease.notes,
        changelogType: curseforge?.changelog_type || 'markdown',
    };

    // 只有找到值时才添加 displayName
    if (displayName) {
        metadata.displayName = displayName;
    } else {
        // 如果没有找到任何配置，使用默认值
        metadata.displayName = context.nextRelease.name;
    }

    // 添加 metadataModLoaders（如果有值）
    const metadataModLoaders = getCurseForgeModLoaders(
        pluginConfig,
        env,
        nextRelease
    );
    if (metadataModLoaders) {
        metadata.modLoaders = metadataModLoaders;
    }

    // 只有当提供值时才添加这三个特定字段
    if (curseforge?.parent_file_id !== undefined) {
        metadata.parentFileID = curseforge.parent_file_id;
    }

    if (curseforge?.is_marked_for_manual_release !== undefined) {
        metadata.isMarkedForManualRelease =
            curseforge.is_marked_for_manual_release;
    }

    if (curseforge?.relations && Object.keys(curseforge.relations).length > 0) {
        metadata.relations = curseforge.relations;
    }

    form.append('metadata', JSON.stringify(metadata));

    try {
        const response = await axios.post(
            `https://upload.curseforge.com/api/projects/${projectId}/upload-file`,
            form,
            {
                headers: {
                    ...form.getHeaders(),
                    'X-API-Key': apiKey,
                },
            }
        );

        // 验证返回的数据是否包含 id 字段
        if (response.data && typeof response.data.id === 'number') {
            logger.log(
                `Successfully published to CurseForge: ${response.data.displayName || `File ID: ${response.data.id}`}`
            );
            return response.data.id.toString();
        } else {
            throw new Error(
                `CurseForge API returned unexpected response: ${JSON.stringify(response.data)}`
            );
        }
    } catch (error: any) {
        if (error.response) {
            // 服务器返回了错误响应
            const status = error.response.status;
            const data = error.response.data;

            if (data && data.error && data.description) {
                logger.error(
                    `CurseForge API Error (${status}): ${data.error} - ${data.description}`
                );
                throw new Error(
                    `CurseForge 发布失败：${data.error} - ${data.description}`
                );
            } else {
                logger.error(
                    `CurseForge API Error (${status}): ${JSON.stringify(data)}`
                );
                throw new Error(
                    `CurseForge 发布失败 (状态码：${status}): ${JSON.stringify(data)}`
                );
            }
        } else if (error.request) {
            // 请求已发送但未收到响应
            logger.error('CurseForge API 请求失败，未收到响应');
            throw new Error('CurseForge 发布失败：未收到服务器响应');
        } else {
            // 请求配置出错
            logger.error('CurseForge API 请求配置错误：', error.message);
            throw new Error(`CurseForge 发布失败：${error.message}`);
        }
    }
}
