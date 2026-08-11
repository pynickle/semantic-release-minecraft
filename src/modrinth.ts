import { readFileSync } from 'fs';
import { basename } from 'path';

import axios from 'axios';
import type { AxiosResponse } from 'axios';
import FormData from 'form-data';
import type { PublishContext } from 'semantic-release';

import type {
  ModrinthDependencyConfig,
  ModrinthEnvironment,
  ModrinthRequestedStatus,
  ModrinthStatus,
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

interface UploadFile {
  partName: string;
  buffer: Buffer;
  fileName: string;
}

interface PreparedUploadFiles {
  files: UploadFile[];
  primaryFilePartName?: string;
}

export interface ModrinthVersionData {
  project_id: string;
  file_parts: string[];
  version_type: ReleaseType;
  featured: boolean;
  status: ModrinthStatus;
  requested_status: ModrinthRequestedStatus;
  environment: ModrinthEnvironment | undefined;
  dependencies: ModrinthDependencyConfig[];
  primary_file?: string;
  changelog?: string;
  name: string;
  version_number: string;
  game_versions: string[];
  loaders: string[];
}

interface ModrinthVersionResponse {
  id?: unknown;
  project_id?: unknown;
  error?: unknown;
  description?: unknown;
}

interface ModrinthProjectResponse {
  id?: string;
}

function prepareUploadFiles(files: string[], primaryFile: string): PreparedUploadFiles {
  const uploadFiles: UploadFile[] = [];
  let primaryFilePartName: string | undefined;

  for (const [index, filePath] of files.entries()) {
    const partName = `file-${index}`;
    uploadFiles.push({
      partName,
      buffer: readFileSync(filePath),
      fileName: basename(filePath),
    });

    if (filePath === primaryFile) primaryFilePartName = partName;
  }

  return { files: uploadFiles, primaryFilePartName };
}

async function resolveDependencies(
  pluginConfig: PluginConfig,
  token: string
): Promise<ModrinthDependencyConfig[]> {
  if (pluginConfig.modrinth?.dependencies) return pluginConfig.modrinth.dependencies;

  const dependencies: ModrinthDependencyConfig[] = [];
  for (const dependency of pluginConfig.dependencies || []) {
    dependencies.push({
      project_id:
        dependency.modrinth_project_id || (await getModrinthProjectBySlug(dependency.slug, token)),
      dependency_type: dependency.type,
    });
  }
  return dependencies;
}

/**
 * Builds the version payload sent with a Modrinth upload.
 */
export async function buildModrinthVersionData(
  pluginConfig: PluginConfig,
  context: PublishContext,
  strategy: Strategy,
  filePartNames: string[],
  primaryFilePartName: string | undefined,
  token: string
): Promise<ModrinthVersionData> {
  const { modrinth } = pluginConfig;
  const { nextRelease } = context;
  const templateContext = createTemplateContext(context, strategy);
  const versionData: ModrinthVersionData = {
    project_id: modrinth!.project_id,
    file_parts: filePartNames,
    version_type: pluginConfig.release_type || 'release',
    featured: modrinth?.featured || false,
    status: modrinth?.status || 'listed',
    requested_status: modrinth?.requested_status || 'listed',
    environment: modrinth?.environment,
    dependencies: await resolveDependencies(pluginConfig, token),
    name:
      resolveAndRenderTemplate(
        [modrinth?.display_name, pluginConfig.display_name],
        templateContext
      ) || nextRelease.name,
    version_number:
      resolveAndRenderTemplate([modrinth?.version_number], templateContext) || nextRelease.version,
    game_versions:
      resolveAndRenderTemplates(
        [modrinth?.game_versions, pluginConfig.game_versions],
        templateContext
      ) || [],
    loaders:
      resolveAndRenderTemplates(
        [modrinth?.mod_loaders, pluginConfig.mod_loaders],
        templateContext
      ) || [],
  };

  if (primaryFilePartName) versionData.primary_file = primaryFilePartName;

  const changelog = resolveAndRenderTemplate(
    [modrinth?.changelog, nextRelease.notes],
    templateContext
  );
  if (changelog) versionData.changelog = changelog;

  return versionData;
}

function createUploadForm(versionData: ModrinthVersionData, files: UploadFile[]): FormData {
  const form = new FormData();
  form.append('data', JSON.stringify(versionData), {
    contentType: 'application/json',
  });

  for (const file of files) {
    form.append(file.partName, file.buffer, { filename: file.fileName });
  }

  return form;
}

function getPublishedVersionId(
  response: AxiosResponse<ModrinthVersionResponse>,
  logger: PublishContext['logger']
): string {
  const responseData = response.data;

  if (response.status === 200) {
    logger.log(
      `Successfully published to Modrinth: ${responseData.project_id} (File ID: ${responseData.id})`
    );
    return responseData.id as string;
  }
  if (response.status === 400 || response.status === 401) {
    throw new Error(
      `Failed to publish to Modrinth (${response.status}): ${responseData.error}\n${responseData.description}`
    );
  }

  throw new Error(`Failed to publish to Modrinth (${response.status}): ${response.statusText}`);
}

/**
 * Publishes files to Modrinth.
 */
export async function publishToModrinth(
  pluginConfig: PluginConfig,
  context: PublishContext,
  strategy: Strategy
): Promise<string> {
  const { env, logger } = context;
  const token = env.MODRINTH_TOKEN!;
  const projectId = pluginConfig.modrinth!.project_id;

  const { files, primaryFile } = await findFilesAndPrimaryFile(
    pluginConfig,
    context,
    strategy,
    'modrinth'
  );
  logger.log(`Publishing ${files.length} file(s) to Modrinth project ${projectId}...`);

  const preparedFiles = prepareUploadFiles(files, primaryFile);
  const versionData = await buildModrinthVersionData(
    pluginConfig,
    context,
    strategy,
    preparedFiles.files.map((file) => file.partName),
    preparedFiles.primaryFilePartName,
    token
  );
  const form = createUploadForm(versionData, preparedFiles.files);

  const headers = form.getHeaders();
  headers['Content-Length'] = form.getLengthSync();

  const response = await axios.post<ModrinthVersionResponse>(
    'https://api.modrinth.com/v2/version',
    form,
    {
      headers: {
        ...headers,
        Authorization: token,
      },
      validateStatus: (status) => status < 500,
    }
  );

  return getPublishedVersionId(response, logger);
}

async function getModrinthProjectBySlug(slug: string, token: string): Promise<string | undefined> {
  const projectRes = await axios.get<ModrinthProjectResponse>(
    `https://api.modrinth.com/v2/project/${slug}`,
    {
      headers: {
        Authorization: token,
      },
    }
  );
  if (projectRes.status === 200) {
    return projectRes.data.id;
  }
}
