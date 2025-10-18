export type Plugin_config = {
    // 全局发布相关配置
    release_type?: 'alpha' | 'beta' | 'release'; // 全局发布类型
    game_versions?: string | string[]; // 全局游戏版本列表
    mod_loaders?: string | string[]; // 全局模组加载器列表
    display_name?: string;

    // 全局文件查找相关配置（如果平台没有指定自己的 glob，则使用此配置）
    glob?: string | string[]; // glob 模式，用于查找要发布的文件

    // Minecraft 发布相关配置
    curseforge?: {
        project_id: string;
        game_versions?: string | string[]; // CurseForge 专用的游戏版本列表
        java_versions?: string | string[];
        environments?: string | string[];
        game_versions_for_plugins?: string | string[];
        game_versions_for_addon?: string | string[];
        mod_loaders?: string | string[]; // CurseForge 专用的模组加载器列表
        changelog?: string;
        changelog_type?: 'text' | 'html' | 'markdown';
        display_name?: string; // 可选：网站上显示的友好名称
        parent_file_id?: number; // 可选：此文件的父文件 ID
        is_marked_for_manual_release?: boolean; // 可选：如果为 true，文件获批后不会立即发布
        relations?: {
            projects?: Array<{
                slug: string; // 相关插件的 slug
                project_id?: string; // 可选：用于精确匹配项目
                type:
                    | 'embedded_library'
                    | 'incompatible'
                    | 'optional_dependency'
                    | 'required_dependency'
                    | 'tool';
            }>;
        };
        glob?: string | string[]; // CurseForge 专用的 glob 模式，用于查找要发布的 JAR 文件
    };
    modrinth?: {
        project_id: string;
        version_number?: string;
        display_name?: string;
        game_versions?: string[]; // Modrinth 专用的游戏版本列表
        mod_loaders?: string[]; // Modrinth 专用的模组加载器列表
        changelog?: string;
        dependencies?: Array<{
            version_id?: string; // 可选：依赖版本的 ID
            project_id?: string; // 可选：依赖项目的 ID
            file_name?: string; // 可选：依赖的文件名
            dependency_type:
                | 'required'
                | 'optional'
                | 'incompatible'
                | 'embedded'; // 依赖类型
        }>;
        featured?: boolean; // 是否标记为特色版本
        status?:
            | 'listed'
            | 'archived'
            | 'draft'
            | 'unlisted'
            | 'scheduled'
            | 'unknown'; // 版本状态
        requested_status?: 'listed' | 'archived' | 'draft' | 'unlisted'; // 请求的状态
        glob?: string | string[]; // Modrinth 专用的 glob 模式
        primary_file_glob?: string | string[]; // 用于匹配主要文件的 glob 模式
    };
};
