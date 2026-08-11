import { afterEach, describe, expect, spyOn, test } from 'bun:test';

import axios from 'axios';
import type { PrepareContext } from 'semantic-release';

import type {
  CurseForgeGameVersion,
  CurseForgeGameVersionType,
} from '../src/definitions/curseforge.js';
import type { PluginConfig } from '../src/definitions/plugin-config.js';
import { getCurseForgeGameVersionIds } from '../src/prepare.js';

const types: CurseForgeGameVersionType[] = [
  { id: 2, name: 'Minecraft', slug: 'minecraft' },
  { id: 3, name: 'Modloader', slug: 'modloader' },
  { id: 4, name: 'Java', slug: 'java' },
  { id: 5, name: 'Add-on', slug: 'addon' },
  { id: 6, name: 'Environment', slug: 'environment' },
];

const versions: CurseForgeGameVersion[] = [
  { id: 20, gameVersionTypeID: 2, name: '1.21.4', slug: '1-21-4', url: '' },
  { id: 30, gameVersionTypeID: 3, name: 'Fabric', slug: 'fabric', url: '' },
  { id: 40, gameVersionTypeID: 4, name: 'Java 21', slug: 'java-21', url: '' },
  { id: 10, gameVersionTypeID: 1, name: 'Paper', slug: 'paper', url: '' },
  { id: 50, gameVersionTypeID: 5, name: 'Bedrock', slug: 'bedrock', url: '' },
  { id: 60, gameVersionTypeID: 6, name: 'Server', slug: 'server', url: '' },
];

describe('CurseForge game version preparation', () => {
  const axiosGet = spyOn(axios, 'get');

  afterEach(() => axiosGet.mockReset());

  test('categorizes API versions and preserves configured output order per strategy', async () => {
    axiosGet.mockResolvedValueOnce({ data: versions }).mockResolvedValueOnce({ data: [...types] });
    const pluginConfig: PluginConfig = {
      primary_file_glob: '*.jar',
      game_versions: ['1.21.4'],
      mod_loaders: ['<%= loader %>'],
      strategies: [{ loader: 'fabric' }],
      curseforge: {
        project_id: 'example-project',
        java_versions: 21,
        game_versions_for_plugins: 'paper',
        game_versions_for_addon: 'bedrock',
        environments: 'server',
      },
    };
    const context = {} as PrepareContext;

    await expect(getCurseForgeGameVersionIds('api-token', pluginConfig, context)).resolves.toEqual([
      [20, 30, 40, 10, 50, 60],
    ]);
    expect(axiosGet).toHaveBeenNthCalledWith(1, expect.stringContaining('/versions'), {
      headers: { 'X-Api-Token': 'api-token' },
    });
    expect(axiosGet).toHaveBeenNthCalledWith(2, expect.stringContaining('/version-types'), {
      headers: { 'X-Api-Token': 'api-token' },
    });
  });
});
