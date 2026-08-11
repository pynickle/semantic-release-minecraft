import { readFileSync } from 'fs';
import { basename } from 'path';

import axios from 'axios';
import FormData from 'form-data';
import lodash from 'lodash';
import type { PublishContext } from 'semantic-release';

import { DependencyTypeMap } from './definitions/curseforge.js';
import type {
  CurseForgeRelationConfig,
  PluginConfig,
  ReleaseType,
  Strategy,
} from './definitions/plugin-config.js';
import { findFilesAndPrimaryFile } from './utils/platform/utils.js';
import {
  createTemplateContext,
  resolveAndRenderTemplate,
  resolveAndRenderTemplates,
} from './utils/template-utils.js';

interface CurseForgeRelation {
  slug: string;
  projectId?: string;
  type: CurseForgeRelationConfig['type'];
}

export interface CurseForgeMetadata {
  gameVersions: number[] | undefined;
  releaseType: ReleaseType;
  changelog: string;
  changelogType: 'text' | 'html' | 'markdown';
  isMarkedForManualRelease: boolean;
  relations?: { projects: CurseForgeRelation[] };
  displayName: string;
  modLoaders: string[];
  parentFileID?: number;
}

interface CurseForgeUploadResponse {
  id?: unknown;
}

interface CurseForgeUploadOptions {
  apiKey: string;
  projectId: string;
  logger: PublishContext['logger'];
  metadata: CurseForgeMetadata;
  filePath: string;
  primaryFileId?: number;
}

function getCurseForgeRelations(pluginConfig: PluginConfig): CurseForgeRelation[] | undefined {
  const configuredRelations = pluginConfig.curseforge?.relations;
  if (configuredRelations) {
    return configuredRelations.map((relation) => ({
      slug: relation.slug,
      projectId: relation.project_id,
      type: relation.type,
    }));
  }

  if (!pluginConfig.dependencies) return undefined;

  return pluginConfig.dependencies.map((dependency) => ({
    slug: dependency.slug,
    projectId: dependency.curseforge_project_id,
    type: DependencyTypeMap[dependency.type],
  }));
}

/**
 * Builds the metadata sent with each CurseForge upload.
 */
export function buildCurseForgeMetadata(
  pluginConfig: PluginConfig,
  context: PublishContext,
  strategy: Strategy,
  curseforgeGameVersionIds: number[] | undefined
): CurseForgeMetadata {
  const { curseforge } = pluginConfig;
  const templateContext = createTemplateContext(context, strategy);
  const metadata: CurseForgeMetadata = {
    gameVersions: curseforgeGameVersionIds,
    releaseType: pluginConfig.release_type || 'release',
    changelog: lodash.template(curseforge?.changelog || context.nextRelease.notes)(templateContext),
    changelogType: curseforge?.changelog_type || 'markdown',
    isMarkedForManualRelease: curseforge?.is_marked_for_manual_release || false,
    displayName:
      resolveAndRenderTemplate(
        [curseforge?.display_name, pluginConfig.display_name],
        templateContext
      ) || context.nextRelease.name,
    modLoaders:
      resolveAndRenderTemplates(
        [curseforge?.mod_loaders, pluginConfig.mod_loaders],
        templateContext
      ) || [],
  };

  const projects = getCurseForgeRelations(pluginConfig);
  if (projects) metadata.relations = { projects };

  return metadata;
}

/**
 * Publishes files to CurseForge.
 */
export async function publishToCurseforge(
  pluginConfig: PluginConfig,
  context: PublishContext,
  strategy: Strategy,
  curseforgeGameVersionIds?: number[]
): Promise<number> {
  const { env, logger } = context;
  const projectId = pluginConfig.curseforge!.project_id;

  const { files, primaryFile } = await findFilesAndPrimaryFile(
    pluginConfig,
    context,
    strategy,
    'curseforge'
  );
  logger.log(`Publishing ${files.length} file(s) to CurseForge project ${projectId}...`);

  const metadata = buildCurseForgeMetadata(
    pluginConfig,
    context,
    strategy,
    curseforgeGameVersionIds
  );
  const uploadOptions = {
    apiKey: env.CURSEFORGE_TOKEN!,
    projectId,
    logger,
    metadata,
  };
  const primaryFileId = await uploadCurseForgeFile({ ...uploadOptions, filePath: primaryFile });

  for (const filePath of files) {
    if (filePath === primaryFile) continue;

    await uploadCurseForgeFile({ ...uploadOptions, filePath, primaryFileId });
  }

  return primaryFileId;
}

/**
 * Uploads a single file to CurseForge.
 */
async function uploadCurseForgeFile(options: CurseForgeUploadOptions): Promise<number> {
  const { apiKey, filePath, logger, metadata, primaryFileId, projectId } = options;

  const form = new FormData();
  form.append('file', readFileSync(filePath), {
    filename: basename(filePath),
  });

  const uploadMetadata = primaryFileId ? { ...metadata, parentFileID: primaryFileId } : metadata;
  form.append('metadata', JSON.stringify(uploadMetadata));

  const response = await axios.post<CurseForgeUploadResponse>(
    `https://minecraft.curseforge.com/api/projects/${projectId}/upload-file`,
    form,
    {
      headers: {
        ...form.getHeaders(),
        'X-API-TOKEN': apiKey,
      },
    }
  );

  const responseData = response.data;

  if (responseData && typeof responseData.id === 'number') {
    logger.log(
      `Successfully published to CurseForge, ${primaryFileId ? 'Primary ' : ''}File ID: ${responseData.id}`
    );
    return responseData.id;
  }

  throw new Error(`CurseForge API returned unexpected response: ${responseData}`);
}
