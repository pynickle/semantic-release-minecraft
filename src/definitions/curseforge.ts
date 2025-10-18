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
     * Minecraft 游戏版本的数组。
     */
    game_versions: CurseForgeGameVersion[];

    /**
     * 主要用于 Bukkit 插件的游戏版本数组。
     */
    game_versions_for_plugins: CurseForgeGameVersion[];

    /**
     * 附加组件的游戏版本数组。
     */
    game_versions_for_addons: CurseForgeGameVersion[];

    /**
     * Java 版本的数组。
     */
    java_versions: CurseForgeGameVersion[];

    /**
     * 模组加载器的游戏版本数组。
     */
    loaders: CurseForgeGameVersion[];

    /**
     * 不同环境的游戏版本数组。
     */
    environments: CurseForgeGameVersion[];
}

export const BUKKIT_GAME_VERSION_TYPE: CurseForgeGameVersionType = {
    id: 1,
    name: 'Bukkit',
    slug: 'bukkit',
};
