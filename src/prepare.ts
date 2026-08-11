import axios from 'axios';
import type { PrepareContext } from 'semantic-release';

import { BUKKIT_GAME_VERSION_TYPE } from './definitions/curseforge.js';
import type {
  CurseForgeGameVersion,
  CurseForgeGameVersionMap,
  CurseForgeGameVersionType,
} from './definitions/curseforge.js';
import type { CurseForgeConfig, PluginConfig, Strategy } from './definitions/plugin-config.js';
import { createTemplateContext, resolveAndRenderTemplates } from './utils/template-utils.js';
import { getStrategies, toArray } from './utils/utils.js';

const CURSEFORGE_API_URL = 'https://minecraft.curseforge.com/api/game';

const GAME_VERSION_TYPE_PREFIXES = {
  game_versions: 'minecraft',
  game_versions_for_plugins: 'bukkit',
  game_versions_for_addons: 'addon',
  loaders: 'modloader',
  java_versions: 'java',
  environments: 'environment',
} as const satisfies Record<keyof CurseForgeGameVersionMap, string>;

interface CurseForgeGameVersionInfo {
  versions: CurseForgeGameVersion[];
  types: CurseForgeGameVersionType[];
}

interface GameVersionSelection {
  available: Array<{ id: number; name: string }>;
  requested: string[];
}

function getGameVersionIdsForStrategy(
  map: CurseForgeGameVersionMap,
  curseforgeConfig: CurseForgeConfig,
  pluginConfig: PluginConfig,
  context: PrepareContext,
  strategy: Strategy
): number[] {
  const templateContext = createTemplateContext(context, strategy);
  const modLoaders =
    resolveAndRenderTemplates(
      [curseforgeConfig.mod_loaders, pluginConfig.mod_loaders],
      templateContext
    ) || [];
  const javaVersions = toArray(curseforgeConfig.java_versions).map(
    (javaVersion) => `Java ${javaVersion}`
  );

  const selections: GameVersionSelection[] = [
    {
      available: map.game_versions,
      requested: toArray(curseforgeConfig.game_versions || pluginConfig.game_versions),
    },
    { available: map.loaders, requested: modLoaders },
    { available: map.java_versions, requested: javaVersions },
    {
      available: map.game_versions_for_plugins,
      requested: toArray(curseforgeConfig.game_versions_for_plugins),
    },
    {
      available: map.game_versions_for_addons,
      requested: toArray(curseforgeConfig.game_versions_for_addon),
    },
    { available: map.environments, requested: toArray(curseforgeConfig.environments) },
  ];

  return selections.flatMap(({ available, requested }) =>
    findCurseForgeGameVersionIdsByNames(available, requested)
  );
}

/**
 * Get CurseForge game version IDs based on the plugin configuration.
 */
export async function getCurseForgeGameVersionIds(
  apiToken: string,
  pluginConfig: PluginConfig,
  context: PrepareContext
): Promise<Array<number[]>> {
  const curseforgeConfig = pluginConfig.curseforge!;
  const map = await createCurseForgeGameVersionMap(apiToken);

  return getStrategies(pluginConfig.strategies).map((strategy) =>
    getGameVersionIdsForStrategy(map, curseforgeConfig, pluginConfig, context, strategy)
  );
}

/**
 * Create a CurseForge game version map by categorizing game versions based on their type names.
 */
async function createCurseForgeGameVersionMap(apiToken: string): Promise<CurseForgeGameVersionMap> {
  const { versions, types } = await fetchCurseForgeGameVersionInfo(apiToken);
  return {
    game_versions: filterGameVersionsByTypeName(
      versions,
      types,
      GAME_VERSION_TYPE_PREFIXES.game_versions
    ),
    game_versions_for_plugins: filterGameVersionsByTypeName(
      versions,
      types,
      GAME_VERSION_TYPE_PREFIXES.game_versions_for_plugins
    ),
    game_versions_for_addons: filterGameVersionsByTypeName(
      versions,
      types,
      GAME_VERSION_TYPE_PREFIXES.game_versions_for_addons
    ),
    loaders: filterGameVersionsByTypeName(versions, types, GAME_VERSION_TYPE_PREFIXES.loaders),
    java_versions: filterGameVersionsByTypeName(
      versions,
      types,
      GAME_VERSION_TYPE_PREFIXES.java_versions
    ),
    environments: filterGameVersionsByTypeName(
      versions,
      types,
      GAME_VERSION_TYPE_PREFIXES.environments
    ),
  };
}

/**
 * Fetch CurseForge game version and version type information.
 */
async function fetchCurseForgeGameVersionInfo(
  apiToken: string
): Promise<CurseForgeGameVersionInfo> {
  const headers = { 'X-Api-Token': apiToken };
  const gameVersionsResponse = await axios.get<CurseForgeGameVersion[]>(
    `${CURSEFORGE_API_URL}/versions`,
    { headers }
  );
  const gameVersionTypesResponse = await axios.get<CurseForgeGameVersionType[]>(
    `${CURSEFORGE_API_URL}/version-types`,
    {
      headers,
    }
  );

  const gameVersionTypes = gameVersionTypesResponse.data;

  if (!gameVersionTypes.some((x) => x.id === BUKKIT_GAME_VERSION_TYPE.id)) {
    gameVersionTypes.push(BUKKIT_GAME_VERSION_TYPE);
  }

  return {
    versions: gameVersionsResponse.data,
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
  const matchingTypeIds = new Set(
    types.filter((type) => type.slug.startsWith(typeName)).map((type) => type.id)
  );
  return versions.filter((version) => matchingTypeIds.has(version.gameVersionTypeID));
}

/**
 * Find CurseForge game version IDs by their names using a custom comparer.
 */
function findCurseForgeGameVersionIdsByNames(
  versions: { id: number; name: string }[],
  names: string[],
  comparer: (a: string, b: string) => boolean = (a, b) => a.toLowerCase() === b.toLowerCase()
): number[] {
  const result: number[] = [];

  for (const name of names) {
    const version = versions.find((candidate) => comparer(candidate.name, name));
    if (version) result.push(version.id);
  }

  return result;
}
