import { glob } from 'glob';
import { resolve } from 'path';
import { PublishContext } from 'semantic-release';

/**
 * Find files based on provided glob patterns.
 */
export async function findFilesByGlob(
    patterns: string[] = [
        'build/libs/!(*-@(dev|sources|javadoc)).jar',
        'build/libs/*-@(dev|sources|javadoc).jar',
    ],
    context: PublishContext
): Promise<string[]> {
    const { logger, cwd } = context;

    const allFiles: string[] = [];

    for (const pattern of patterns) {
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
            `No files found matching patterns: ${patterns.join(', ')}`
        );
    }

    return files;
}
