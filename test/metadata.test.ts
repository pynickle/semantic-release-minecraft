import { describe, expect, test } from 'bun:test';

import type { PublishContext } from 'semantic-release';

import { buildCurseForgeMetadata } from '../src/curseforge.js';
import type { PluginConfig } from '../src/definitions/plugin-config.js';
import { buildModrinthVersionData } from '../src/modrinth.js';

const context = {
  nextRelease: {
    name: 'Release 1.2.3',
    version: '1.2.3',
    notes: 'Release notes for <%= label %>',
  },
} as unknown as PublishContext;

describe('CurseForge metadata', () => {
  test('renders values and maps global dependencies to CurseForge relation types', () => {
    const pluginConfig: PluginConfig = {
      primary_file_glob: '*.jar',
      release_type: 'beta',
      display_name: '<%= label %>',
      mod_loaders: ['fabric', '<%= loader %>'],
      dependencies: [
        {
          slug: 'library',
          curseforge_project_id: '12345',
          type: 'required',
        },
      ],
      curseforge: {
        project_id: 'example-project',
        changelog: 'Changes for <%= label %>',
      },
    };

    expect(
      buildCurseForgeMetadata(
        pluginConfig,
        context,
        { label: 'Build 7', loader: 'quilt' },
        [100, 200]
      )
    ).toEqual({
      gameVersions: [100, 200],
      releaseType: 'beta',
      changelog: 'Changes for Build 7',
      changelogType: 'markdown',
      isMarkedForManualRelease: false,
      displayName: 'Build 7',
      modLoaders: ['fabric', 'quilt'],
      relations: {
        projects: [
          {
            slug: 'library',
            projectId: '12345',
            type: 'requiredDependency',
          },
        ],
      },
    });
  });
});

describe('Modrinth version data', () => {
  test('renders defaults and retains explicitly configured dependencies', async () => {
    const pluginConfig: PluginConfig = {
      primary_file_glob: '*.jar',
      display_name: '<%= label %>',
      game_versions: ['1.21.<%= patch %>'],
      modrinth: {
        project_id: 'example-project',
        version_number: '<%= nextRelease.version %>-<%= channel %>',
        mod_loaders: ['fabric'],
        dependencies: [{ project_id: 'dependency-id', dependency_type: 'optional' }],
      },
    };

    await expect(
      buildModrinthVersionData(
        pluginConfig,
        context,
        { label: 'Build 7', channel: 'beta', patch: 4 },
        ['file-0', 'file-1'],
        'file-0',
        'unused-token'
      )
    ).resolves.toEqual({
      project_id: 'example-project',
      file_parts: ['file-0', 'file-1'],
      version_type: 'release',
      featured: false,
      status: 'listed',
      requested_status: 'listed',
      environment: undefined,
      dependencies: [{ project_id: 'dependency-id', dependency_type: 'optional' }],
      primary_file: 'file-0',
      changelog: 'Release notes for Build 7',
      name: 'Build 7',
      version_number: '1.2.3-beta',
      game_versions: ['1.21.4'],
      loaders: ['fabric'],
    });
  });
});
