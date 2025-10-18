import axios from 'axios';
import FormData from 'form-data';
import { readFile } from 'fs/promises';
import { glob } from 'glob';
import { template } from 'lodash';
import { resolve } from 'path';
import { PublishContext } from 'semantic-release';
import { Plugin_config } from './definitions/plugin_config.js';
import {
    findFiles,
    renderTemplates,
    resolveTemplate,
    toArray,
} from './utils/utils.js';

/**
 * 发布到 Modrinth
 */
export async function publishToModrinth(
    pluginConfig: Plugin_config,
    context: PublishContext
): Promise<string> {
    const { env, logger } = context;
    const { modrinth } = pluginConfig;
    const token = env.MODRINTH_TOKEN!;
    const projectId = modrinth?.project_id!;
    const nextRelease = context.nextRelease;
    const nextReleaseVersion = nextRelease.version;

    // 查找文件并确定主要文件
    const { files, primaryFile } = await findModrinthJarFiles(
        pluginConfig,
        context
    );
    logger.log(
        `Publishing ${files.length} file(s) to Modrinth project ${projectId}...`
    );

    // 使用 multipart/form-data 方式上传文件和版本信息
    const form = new FormData();
    const filePartNames: string[] = [];
    let primaryFilePartName: string | undefined = undefined;

    // 上传所有文件
    for (let i = 0; i < files.length; i++) {
        const jarPath = files[i];
        const jarFile = await readFile(jarPath);
        const fileName = jarPath.split('\\').pop() || `mod-${i}.jar`;
        const filePartName = `file-${i}`;

        form.append(filePartName, jarFile, { filename: fileName });
        filePartNames.push(filePartName);

        // 标记主要文件
        if (jarPath === primaryFile) {
            primaryFilePartName = filePartName;
        }
    }

    // 使用根据primaryFileGlob确定的主要文件
    const finalPrimaryFile: string | undefined = primaryFilePartName;

    // 准备版本信息，只包含必需字段和存在的可选字段
    // displayName按照优先级：平台特定配置 > 全局配置 > 平台特定环境变量 > 全局环境变量
    let displayName: string | undefined;
    if (modrinth?.display_name) {
        displayName = template(modrinth.display_name)(nextRelease) as string;
    } else if (pluginConfig.display_name) {
        displayName = template(pluginConfig.display_name)(
            nextRelease
        ) as string;
    } else if (env.MODRINTH_DISPLAY_NAME) {
        displayName = env.MODRINTH_DISPLAY_NAME;
    } else if (env.DISPLAY_NAME) {
        displayName = env.DISPLAY_NAME;
    }

    // version_number 按照优先级：平台特定配置 > 平台特定环境变量 > 全局环境变量
    const versionNumber = resolveTemplate(
        [modrinth?.version_number, env.MODRINTH_VERSION_NUMBER],
        nextRelease
    );

    // 准备版本信息，只包含必需字段和存在的可选字段
    const versionData: any = {
        project_id: projectId,
        file_parts: filePartNames, // 必需字段，列出所有文件部分的名称
    };

    // 只有找到值时才添加 name 字段
    if (displayName) {
        versionData.name = displayName;
    } else {
        // 如果没有找到任何配置，使用默认值
        versionData.name = context.nextRelease.name;
    }

    // 只有找到值时才添加 version_number 字段
    if (versionNumber) {
        versionData.version_number = versionNumber;
    } else {
        // 如果没有找到任何配置，使用默认值
        versionData.version_number = nextReleaseVersion;
    }

    // 只添加存在的可选字段
    if (modrinth?.changelog || context.nextRelease?.notes) {
        versionData.changelog =
            modrinth?.changelog || context.nextRelease?.notes || '';
    }

    if (modrinth?.game_versions && modrinth.game_versions.length > 0) {
        versionData.game_versions = renderTemplates(modrinth.game_versions, {
            nextRelease,
        }) as string[];
    } else if (
        pluginConfig.game_versions &&
        pluginConfig.game_versions.length > 0
    ) {
        versionData.game_versions = renderTemplates(
            toArray(pluginConfig.game_versions),
            {
                nextRelease,
            }
        ) as string[];
    }

    // modLoaders 按照优先级：平台特定配置 > 全局配置 > 平台特定环境变量 > 全局环境变量
    let modLoaders: string[] | undefined;
    if (modrinth?.mod_loaders && modrinth.mod_loaders.length > 0) {
        modLoaders = renderTemplates(modrinth.mod_loaders, {
            nextRelease,
        }) as string[];
    } else if (
        pluginConfig.mod_loaders &&
        pluginConfig.mod_loaders.length > 0
    ) {
        modLoaders = renderTemplates(toArray(pluginConfig.mod_loaders), {
            nextRelease,
        }) as string[];
    } else if (env.MODRINTH_MOD_LOADERS) {
        modLoaders = env.MODRINTH_MOD_LOADERS.split(',').map((s) => s.trim());
    } else if (env.MOD_LOADERS) {
        modLoaders = env.MOD_LOADERS.split(',').map((s) => s.trim());
    }

    if (modLoaders) {
        versionData.loaders = modLoaders;
    }

    if (pluginConfig.release_type) {
        versionData.version_type = pluginConfig.release_type;
    }

    if (modrinth?.dependencies && modrinth.dependencies.length > 0) {
        versionData.dependencies = modrinth.dependencies;
    }

    if (modrinth?.featured !== undefined) {
        versionData.featured = modrinth.featured;
    }

    if (modrinth?.status) {
        versionData.status = modrinth.status;
    }

    if (modrinth?.requested_status) {
        versionData.requested_status = modrinth.requested_status;
    }

    // 只有当 finalPrimaryFile 存在时才添加 primary_file 字段
    if (finalPrimaryFile) {
        versionData.primary_file = finalPrimaryFile;
    }

    // 添加版本信息作为 JSON
    form.append('data', JSON.stringify(versionData));

    // 发送版本创建请求
    try {
        const versionResponse = await axios.post(
            'https://api.modrinth.com/v2/version',
            form,
            {
                headers: {
                    ...form.getHeaders(),
                    Authorization: token,
                },
                validateStatus: (status) => status < 500, // 仅拒绝5xx错误
            }
        );

        // 检查响应状态码
        if (versionResponse.status === 200) {
            // 成功
            logger.log(
                `Successfully published to Modrinth: ${versionResponse.data.name || versionResponse.data.id}`
            );
            return versionResponse.data.id;
        } else if (
            versionResponse.status === 400 ||
            versionResponse.status === 401
        ) {
            // 处理客户端错误
            const data = versionResponse.data;
            if (data && data.error && data.description) {
                logger.error(
                    `Modrinth API Error (${versionResponse.status}): ${data.error} - ${data.description}`
                );
                throw new Error(
                    `Modrinth发布失败: ${data.error} - ${data.description}`
                );
            } else {
                logger.error(
                    `Modrinth API Error (${versionResponse.status}): ${JSON.stringify(data)}`
                );
                throw new Error(
                    `Modrinth发布失败 (状态码: ${versionResponse.status}): ${JSON.stringify(data)}`
                );
            }
        } else {
            // 其他错误状态码
            const data = versionResponse.data;
            logger.error(
                `Modrinth API Error (${versionResponse.status}): ${JSON.stringify(data)}`
            );
            throw new Error(
                `Modrinth发布失败 (状态码: ${versionResponse.status}): ${JSON.stringify(data)}`
            );
        }
    } catch (error: any) {
        if (error.response) {
            // 已经在上面处理过
            throw error;
        } else if (error.request) {
            // 请求已发送但未收到响应
            logger.error('Modrinth API 请求失败，未收到响应');
            throw new Error('Modrinth发布失败: 未收到服务器响应');
        } else {
            // 请求配置出错
            logger.error('Modrinth API 请求配置错误:', error.message);
            throw new Error(`Modrinth发布失败: ${error.message}`);
        }
    }
}

/**
 * 为 Modrinth 查找文件并确定主要文件
 */
async function findModrinthJarFiles(
    pluginConfig: Plugin_config,
    context: PublishContext
): Promise<{ files: string[]; primaryFile: string | undefined }> {
    const { logger } = context;

    // 获取 Modrinth 专用的 glob 配置，如果没有则使用全局配置
    const modrinthGlob = pluginConfig.modrinth?.glob || pluginConfig.glob || [];

    // 查找所有文件
    const jarFiles = await findFiles(modrinthGlob, context);
    logger.log(
        `Found ${jarFiles.length} JAR file(s) for Modrinth: ${jarFiles.join(', ')}`
    );

    // 确定主要文件
    let primaryFile: string | undefined = undefined;

    // 检查是否提供了 primaryFileGlob
    if (pluginConfig.modrinth?.primary_file_glob) {
        const primaryPatterns = Array.isArray(
            pluginConfig.modrinth.primary_file_glob
        )
            ? pluginConfig.modrinth.primary_file_glob
            : [pluginConfig.modrinth.primary_file_glob];

        // 查找匹配 primaryFileGlob 的文件
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

        // 过滤出 JAR 文件并与找到的文件列表交叉检查
        primaryCandidates = primaryCandidates
            .filter((file) => file.endsWith('.jar'))
            .filter((file) => jarFiles.includes(file));

        if (primaryCandidates.length === 1) {
            primaryFile = primaryCandidates[0];
            logger.log(`Selected primary file for Modrinth: ${primaryFile}`);
        } else if (primaryCandidates.length > 1) {
            throw new Error(
                `Multiple files matched primaryFileGlob for Modrinth. Please specify a more specific pattern. Found: ${primaryCandidates.join(', ')}`
            );
        } else {
            throw new Error(
                `No files matched primaryFileGlob for Modrinth that were also in the main file list.`
            );
        }
    } else if (jarFiles.length > 1) {
        // 当有多个文件但没有指定 primaryFileGlob 时，需要指定主要文件
        throw new Error(
            `Multiple files found for Modrinth but no primaryFileGlob specified. Please specify which file should be primary.`
        );
    }
    // 当只有一个文件时，不设置 primaryFile，让网站做决定

    return { files: jarFiles, primaryFile };
}
