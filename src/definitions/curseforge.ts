export interface CurseForgeGameVersion {
    id: number;
    gameVersionTypeID: number;
    name: string;
    slug: string;
    url: string;
}

export interface CurseForgeGameVersionType {
    id: number;
    name: string;
    slug: string;
}

export interface CurseForgeGameVersionMap {
    /**
     * Array of Minecraft game versions.
     */
    game_versions: CurseForgeGameVersion[];

    /**
     * Array of game versions primarily used for Bukkit plugins.
     */
    game_versions_for_plugins: CurseForgeGameVersion[];

    /**
     * Array of game versions for add-ons.
     */
    game_versions_for_addons: CurseForgeGameVersion[];

    /**
     * Array of Java versions.
     */
    java_versions: CurseForgeGameVersion[];

    /**
     * Array of game versions for mod loaders.
     */
    loaders: CurseForgeGameVersion[];

    /**
     * Array of game versions for different environments.
     */
    environments: CurseForgeGameVersion[];
}

export const BUKKIT_GAME_VERSION_TYPE: CurseForgeGameVersionType = {
    id: 1,
    name: 'Bukkit',
    slug: 'bukkit',
};
