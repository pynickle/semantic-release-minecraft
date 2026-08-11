import type { GlobalDependencyType } from './curseforge.js';

export type ReleaseType = 'alpha' | 'beta' | 'release';
export type Strategy = Record<string, unknown>;
export type TemplateValue = string | string[];
export type PublishingPlatform = 'curseforge' | 'modrinth';

export type ModrinthEnvironment =
  | 'client_only'
  | 'server_only'
  | 'dedicated_server_only'
  | 'client_and_server'
  | 'server_only_client_optional'
  | 'client_only_server_optional'
  | 'client_or_server_prefers_both'
  | 'client_or_server'
  | 'singleplayer_only';

export type ModrinthStatus = 'listed' | 'archived' | 'draft' | 'unlisted' | 'scheduled' | 'unknown';
export type ModrinthRequestedStatus = Exclude<ModrinthStatus, 'scheduled' | 'unknown'>;

export interface DependencyConfig {
  slug: string;
  curseforge_project_id?: string;
  modrinth_project_id?: string;
  type: GlobalDependencyType;
}

export interface PlatformFileConfig {
  glob?: TemplateValue;
  primary_file_glob?: TemplateValue;
}

export interface CurseForgeRelationConfig {
  slug: string;
  project_id?: string;
  type: 'embeddedLibrary' | 'incompatible' | 'optionalDependency' | 'requiredDependency' | 'tool';
}

export interface CurseForgeConfig extends PlatformFileConfig {
  project_id: string;
  game_versions?: TemplateValue;
  java_versions?: number | number[];
  environments?: TemplateValue;
  game_versions_for_plugins?: TemplateValue;
  game_versions_for_addon?: TemplateValue;
  mod_loaders?: TemplateValue;
  changelog?: string;
  changelog_type?: 'text' | 'html' | 'markdown';
  display_name?: string;
  is_marked_for_manual_release?: boolean;
  relations?: CurseForgeRelationConfig[];
}

export interface ModrinthDependencyConfig {
  version_id?: string;
  project_id?: string;
  file_name?: string;
  dependency_type: GlobalDependencyType;
}

export interface ModrinthConfig extends PlatformFileConfig {
  project_id: string;
  version_number?: string;
  display_name?: string;
  game_versions?: TemplateValue;
  mod_loaders?: TemplateValue;
  environment?: ModrinthEnvironment;
  changelog?: string;
  dependencies?: ModrinthDependencyConfig[];
  featured?: boolean;
  status?: ModrinthStatus;
  requested_status?: ModrinthRequestedStatus;
}

export interface PluginConfig {
  release_type?: ReleaseType;
  game_versions?: TemplateValue;
  mod_loaders?: TemplateValue;
  display_name?: string;
  dependencies?: DependencyConfig[];

  // Global release strategy configuration for multiple publish operations
  strategies?: Strategy[];

  glob?: TemplateValue;
  primary_file_glob: TemplateValue;

  curseforge?: CurseForgeConfig;
  modrinth?: ModrinthConfig;
}
