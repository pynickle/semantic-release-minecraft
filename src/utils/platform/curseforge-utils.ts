import { NextRelease } from 'semantic-release';
import { PluginConfig } from '../../definitions/plugin-config.js';
import { resolveAndRenderTemplates } from '../template-utils.js';

export function getCurseForgeModLoaders(
    pluginConfig: PluginConfig,
    nextRelease: NextRelease
): string[] {
    return (
        resolveAndRenderTemplates(
            [pluginConfig.curseforge?.mod_loaders, pluginConfig.mod_loaders],
            {
                nextRelease,
            }
        ) || []
    );
}
