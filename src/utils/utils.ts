import { glob } from 'glob';
import _ from 'lodash';
import { resolve } from 'path';
import { NextRelease, PublishContext } from 'semantic-release';
import { Plugin_config } from '../definitions/plugin_config.js';

/**
 * 根据 glob 模式查找文件
 */
export async function findFiles(
    patterns: string | string[],
    context: PublishContext,
    defaultPatterns: string[] = [
        'build/libs/!(*-@(dev|sources|javadoc)).jar',
        'build/libs/*-@(dev|sources|javadoc).jar',
    ]
): Promise<string[]> {
    const { logger, cwd } = context;

    // 使用提供的 glob 模式，如果没有则使用默认模式
    const searchPatterns = patterns
        ? Array.isArray(patterns)
            ? patterns
            : [patterns]
        : defaultPatterns;

    const allFiles: string[] = [];

    for (const pattern of searchPatterns) {
        logger.log(`Searching for files with pattern: ${pattern}`);
        const files = await glob(pattern, {
            cwd,
            nodir: true,
        });
        allFiles.push(...files);
    }

    // 转换为绝对路径
    const files = allFiles.map((file) => resolve(cwd!, file));

    if (files.length === 0) {
        throw new Error(
            `No files found matching patterns: ${searchPatterns.join(', ')}`
        );
    }

    return files;
}

/**
 * 依次使用 lodash.template 渲染字符串数组。
 * @param templates 字符串模板数组
 * @param context 模板变量上下文对象
 * @returns 渲染后的字符串数组
 */
export function renderTemplates(
    templates: string[],
    context: Record<string, any>
): string[] {
    return templates.map((tpl) => _.template(tpl)(context));
}

/**
 * 从多个来源中按优先级选择第一个非空模板并渲染。
 * @param sources 模板字符串来源（优先级从高到低）
 * @param context 模板渲染上下文（传给 lodash.template）
 * @returns 渲染后的字符串或 undefined
 */
export function resolveTemplate(
    sources: Array<string | undefined | null>,
    context: Record<string, any>
): string | undefined {
    const source = sources.find(Boolean);
    if (!source) return undefined;

    try {
        return _.template(source)(context);
    } catch (err) {
        console.error('Failed to render template:', err);
        return undefined;
    }
}

/**
 * 确保给定的值总是以数组形式返回。
 *
 * @param value - 单个项目或项目数组。
 * @returns 如果不是数组，则将值包装在数组中返回。
 */
export function toArray<T>(value: T | T[]): T[] {
    return Array.isArray(value) ? value : [value];
}

export function getCurseForgeModLoaders(
    pluginConfig: Plugin_config,
    env: Record<string, string>,
    nextRelease: NextRelease
): string[] {
    const curseforge = pluginConfig.curseforge;

    let modLoaders: string[] | undefined;
    if (curseforge?.mod_loaders && curseforge.mod_loaders.length > 0) {
        modLoaders = renderTemplates(toArray(curseforge.mod_loaders), {
            nextRelease,
        });
    } else if (
        pluginConfig.mod_loaders &&
        pluginConfig.mod_loaders.length > 0
    ) {
        modLoaders = renderTemplates(toArray(pluginConfig.mod_loaders), {
            nextRelease,
        }) as string[];
    } else if (env.CURSEFORGE_MOD_LOADERS) {
        modLoaders = env.CURSEFORGE_MOD_LOADERS.split(',').map((s) => s.trim());
    } else if (env.MOD_LOADERS) {
        modLoaders = env.MOD_LOADERS.split(',').map((s) => s.trim());
    }

    return modLoaders || [];
}
