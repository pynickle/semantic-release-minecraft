import axios from 'axios';
import { PrepareContext } from 'semantic-release';
import {
    BUKKIT_GAME_VERSION_TYPE,
    CurseForgeGameVersion,
    CurseForgeGameVersionMap,
    CurseForgeGameVersionType,
} from './definitions/curseforge.js';
import { PluginConfig } from './definitions/plugin-config.js';
import { getCurseForgeModLoaders } from './utils/platform/curseforge-utils.js';
import { toArray } from './utils/utils.js';

/**
 * Get CurseForge game version IDs based on the plugin configuration.
 */
export async function getCurseForgeGameVersionIds(
    apiToken: string,
    pluginConfig: PluginConfig,
    context: PrepareContext
): Promise<number[]> {
    const { nextRelease } = context;

    const curseforgeConfig = pluginConfig.curseforge!;

    const modLoaders = getCurseForgeModLoaders(pluginConfig, nextRelease);

    const javaVersions = toArray(curseforgeConfig.java_versions);
    const gameVersions = toArray(
        curseforgeConfig.game_versions || pluginConfig.game_versions
    );
    const pluginGameVersions = toArray(
        curseforgeConfig.game_versions_for_plugins
    );
    const addonGameVersions = toArray(curseforgeConfig.game_versions_for_addon);
    const environments = toArray(curseforgeConfig.environments);

    const map = await createCurseForgeGameVersionMap(apiToken);

    const javaVersionNames = javaVersions.map(
        (javaVersion: string) => `Java ${javaVersion}`
    );

    // TODO: Modrinth 和 CurseForge 的游戏版本命名格式转化，以 Modrinth 为基准
    // const gameVersionNames = gameVersions.map(x => formatCurseForgeGameVersionSnapshot(x));

    const gameVersionIds = findCurseForgeGameVersionIdsByNames(
        map.game_versions,
        gameVersions
    );

    const loaderIds = findCurseForgeGameVersionIdsByNames(
        map.loaders,
        modLoaders
    );

    const javaIds = findCurseForgeGameVersionIdsByNames(
        map.java_versions,
        javaVersionNames
    );

    const pluginGameVersionIds = findCurseForgeGameVersionIdsByNames(
        map.game_versions_for_plugins,
        pluginGameVersions
    );

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

/**
 * Create a CurseForge game version map by categorizing game versions based on their type names.
 */
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

/**
 * Fetch CurseForge game version and version type information.
 */
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
        gameVersionTypes.push(BUKKIT_GAME_VERSION_TYPE);
    }

    return {
        versions: gameVersionsRes.data,
        types: gameVersionTypes,
    };
}

/**
 * Filter game versions by their type name prefix.
 */
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

/**
 * Find CurseForge game version IDs by their names using a custom comparer.
 */
function findCurseForgeGameVersionIdsByNames(
    versions: { id: number; name: string }[],
    names: string[],
    comparer: (a: string, b: string) => boolean = (a, b) =>
        a.toLowerCase() === b.toLowerCase()
): number[] {
    const result: number[] = [];

    for (const name of names) {
        let version = versions.find((v) => comparer(v.name, name));
        if (version) result.push(version.id);
    }

    return result;
}
