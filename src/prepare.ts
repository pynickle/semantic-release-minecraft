import axios from 'axios';
import { NextRelease } from 'semantic-release';
import {
    BUKKIT_GAME_VERSION_TYPE,
    CurseForgeGameVersion,
    CurseForgeGameVersionMap,
    CurseForgeGameVersionType,
} from './definitions/curseforge';
import { Plugin_config } from './definitions/plugin_config';
import { getCurseForgeModLoaders, toArray } from './utils/utils';

/**
 * 根据提供的游戏版本联合对象检索游戏版本 ID 变体数组。
 */
export async function getCurseForgeGameVersionIds(
    apiToken: string,
    pluginConfig: Plugin_config,
    env: Record<string, string>,
    nextRelease: NextRelease
): Promise<number[]> {
    const curseforgeConfig = pluginConfig.curseforge!;

    const modLoaders = getCurseForgeModLoaders(pluginConfig, env, nextRelease);
    const javaVersions = toArray(curseforgeConfig.java_versions || []);
    const gameVersions = toArray(
        curseforgeConfig.game_versions || pluginConfig.game_versions || []
    );
    const pluginGameVersions = toArray(
        curseforgeConfig.game_versions_for_plugins || []
    );
    const addonGameVersions = toArray(
        curseforgeConfig.game_versions_for_addon || []
    );
    const environments = toArray(curseforgeConfig.environments || []);

    const map = await createCurseForgeGameVersionMap(apiToken);

    const javaVersionNames = javaVersions.map(
        (javaVersion: string) => `Java ${javaVersion}`
    );

    // TODO: Modrinth 和 CurseForge 的游戏版本命名格式转化，以 Modrinth 为基准
    // const gameVersionNames = gameVersions.map(x => formatCurseForgeGameVersionSnapshot(x));

    // 模组的游戏版本名称
    const gameVersionIds = findCurseForgeGameVersionIdsByNames(
        map.game_versions,
        gameVersions,
        undefined,
        CURSEFORGE_GAME_VERSION_SNAPSHOT_NAME_COMPARER
    );

    const loaderIds = findCurseForgeGameVersionIdsByNames(
        map.loaders,
        modLoaders
    );

    const javaIds = findCurseForgeGameVersionIdsByNames(
        map.java_versions,
        javaVersionNames
    );

    // 插件的游戏版本名称
    const pluginGameVersionIds = findCurseForgeGameVersionIdsByNames(
        map.game_versions_for_plugins,
        pluginGameVersions
    );

    // 附加组件的游戏版本名称
    const addonGameVersionIds = findCurseForgeGameVersionIdsByNames(
        map.game_versions_for_addons,
        addonGameVersions
    );

    const environmentIds = findCurseForgeGameVersionIdsByNames(
        map.environments,
        environments
    );

    const curseforgeGameVersionIds: number[] = [];
    curseforgeGameVersionIds.push(
        ...gameVersionIds,
        ...loaderIds,
        ...javaIds,
        ...pluginGameVersionIds,
        ...addonGameVersionIds,
        ...environmentIds
    );
    return curseforgeGameVersionIds;
}

// 创建一个 CurseForge 游戏版本映射，通过根据类型名称对游戏版本类型进行分类。
async function createCurseForgeGameVersionMap(
    apiToken: string
): Promise<CurseForgeGameVersionMap> {
    const { versions, types } = await fetchCurseForgeGameVersionInfo(apiToken);
    return {
        game_versions: filterGameVersionsByTypeName(
            versions,
            types,
            'minecraft'
        ),
        game_versions_for_plugins: filterGameVersionsByTypeName(
            versions,
            types,
            'bukkit'
        ),
        game_versions_for_addons: filterGameVersionsByTypeName(
            versions,
            types,
            'addon'
        ),
        loaders: filterGameVersionsByTypeName(versions, types, 'modloader'),
        java_versions: filterGameVersionsByTypeName(versions, types, 'java'),
        environments: filterGameVersionsByTypeName(
            versions,
            types,
            'environment'
        ),
    };
}

function filterGameVersionsByTypeName(
    versions: CurseForgeGameVersion[],
    types: CurseForgeGameVersionType[],
    typeName: string
): CurseForgeGameVersion[] {
    const filteredTypes = types.filter((x) => x.slug.startsWith(typeName));
    return versions.filter((v) =>
        filteredTypes.some((t) => t.id === v.gameVersionTypeID)
    );
}

// 获取 CurseForge 游戏版本和版本类型信息
async function fetchCurseForgeGameVersionInfo(apiToken: string): Promise<{
    versions: CurseForgeGameVersion[];
    types: CurseForgeGameVersionType[];
}> {
    const gameVersionsRes = await axios.get(
        'https://minecraft.curseforge.com/api/game/versions',
        {
            headers: {
                'X-Api-Token': apiToken,
            },
        }
    );

    const gameVersionTypesRes = await axios.get(
        'https://minecraft.curseforge.com/api/game/version-types',
        {
            headers: {
                'X-Api-Token': apiToken,
            },
        }
    );

    const gameVersionTypes =
        gameVersionTypesRes.data as CurseForgeGameVersionType[];

    if (!gameVersionTypes.some((x) => x.id === BUKKIT_GAME_VERSION_TYPE.id)) {
        gameVersionTypes.unshift(BUKKIT_GAME_VERSION_TYPE);
    }

    return {
        versions: gameVersionsRes.data,
        types: gameVersionTypes,
    };
}

function findCurseForgeGameVersionIdsByNames(
    versions: { id: number; name: string }[],
    names: string[],
    comparer: (a: string, b: string) => boolean = (a, b) =>
        a.toLowerCase() === b.toLowerCase(),
    fallbackComparer?: (a: string, b: string) => boolean
): number[] {
    const result: number[] = [];

    for (const name of names) {
        let version = versions.find((v) => comparer(v.name, name));
        if (!version && fallbackComparer) {
            version = versions.find((v) => fallbackComparer(v.name, name));
        }
        if (version) result.push(version.id);
    }

    return [...new Set(result)];
}

/**
 * 比较器：忽略名称中的 "-Snapshot" 后缀
 */
export const CURSEFORGE_GAME_VERSION_SNAPSHOT_NAME_COMPARER = (
    a: string,
    b: string
): boolean => {
    const normalize = (s: string) => s?.replace(/-snapshot$/i, '') ?? '';
    return normalize(a).toLowerCase() === normalize(b).toLowerCase();
};
