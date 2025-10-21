export type PluginConfig = {
    release_type?: 'alpha' | 'beta' | 'release';
    game_versions?: string | string[];
    mod_loaders?: string | string[];
    display_name?: string;

    // Global release strategy configuration for multiple publish operations
    strategies?: Record<any, any>[];

    glob?: string | string[];
    primary_file_glob: string | string[];

    curseforge?: {
        project_id: string;
        game_versions?: string | string[];
        java_versions?: number | number[];
        environments?: string | string[];
        game_versions_for_plugins?: string | string[];
        game_versions_for_addon?: string | string[];
        mod_loaders?: string | string[];
        changelog?: string;
        changelog_type?: 'text' | 'html' | 'markdown';
        display_name?: string;
        is_marked_for_manual_release?: boolean;
        relations?: Array<{
            slug: string;
            project_id?: string;
            type:
                | 'embedded_library'
                | 'incompatible'
                | 'optional_dependency'
                | 'required_dependency'
                | 'tool';
        }>;
        glob?: string | string[];
        primary_file_glob?: string | string[];
    };
    modrinth?: {
        project_id: string;
        version_number?: string;
        display_name?: string;
        game_versions?: string[];
        mod_loaders?: string[];
        changelog?: string;
        dependencies?: Array<{
            version_id?: string;
            project_id?: string;
            file_name?: string;
            dependency_type:
                | 'required'
                | 'optional'
                | 'incompatible'
                | 'embedded';
        }>;
        featured?: boolean;
        status?:
            | 'listed'
            | 'archived'
            | 'draft'
            | 'unlisted'
            | 'scheduled'
            | 'unknown';
        requested_status?: 'listed' | 'archived' | 'draft' | 'unlisted';
        glob?: string | string[];
        primary_file_glob?: string | string[];
    };
};
