import { describe, expect, test } from 'bun:test';

import type { VerifyConditionsContext } from 'semantic-release';

import type { PluginConfig } from '../src/definitions/plugin-config.js';
import { verifyConditions } from '../src/index.js';

const baseConfig: PluginConfig = {
  primary_file_glob: '*.jar',
};

describe('condition verification', () => {
  test('allows disabled publishing platforms without project configuration', async () => {
    const context = { env: {} } as VerifyConditionsContext;

    await expect(verifyConditions(baseConfig, context)).resolves.toBeUndefined();
  });

  test('requires project configuration for each enabled platform', async () => {
    const curseForgeContext = {
      env: { CURSEFORGE_TOKEN: 'token' },
    } as unknown as VerifyConditionsContext;
    const modrinthContext = {
      env: { MODRINTH_TOKEN: 'token' },
    } as unknown as VerifyConditionsContext;

    await expect(verifyConditions(baseConfig, curseForgeContext)).rejects.toThrow(
      'CurseForge project ID is required'
    );
    await expect(verifyConditions(baseConfig, modrinthContext)).rejects.toThrow(
      'Modrinth project ID is required'
    );
  });
});
