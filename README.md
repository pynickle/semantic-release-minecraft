# Semantic Release Minecraft

[![NPM version](https://img.shields.io/npm/v/semantic-release-minecraft?logo=npm)](https://www.npmjs.com/package/semantic-release-minecraft)
[![NPM Downloads](https://img.shields.io/npm/dm/semantic-release-minecraft.svg)](https://www.npmjs.com/package/semantic-release-minecraft)
[![Build Status](https://img.shields.io/github/actions/workflow/status/pynickle/semantic-release-minecraft/release.yml.svg?logo=github)](https://github.com/PrismarineJS/mineflayer/actions?query=workflow%3A%22CI%22)

Automate your Minecraft project release process with deep integration into Semantic Release!

## ✨Features

- Comprehensive configuration options put everything under your control.
- Use Semantic Release to automatically generate release notes for your project and avoid manual effort.
- Dual-platform support for CurseForge and Modrinth.
- Use strategy configurations for convenient multiple deployments. (e.g., Architectury and other multi-loader projects)

## 🚀Getting Started

You can install the package via npm:

```shell
npm install --save-dev semantic-release-minecraft
```

## ⚙️Configuration

The plugin configuration is passed via semantic-release's config (e.g., `.releaserc.json`). Below is a detailed explanation of the configuration options, grouped by scope.

If you don't want to read through the lengthy configuration introduction below, you can jump to the [Configuration Reference](#%EF%B8%8Fconfiguration-reference) to check out some practical configurations.

---

### 🛠️ CI Secret Configuration

For Modrinth and CurseForge API token configuration, you can set them via environment variables in tools like GitHub Actions:

```yaml
CURSEFORGE_TOKEN: ${{ secrets.CURSEFORGE_TOKEN }}
MODRINTH_TOKEN: ${{ secrets.MODRINTH_TOKEN }}
```

Remember to configure the repository secrets in the repository settings.

Below are the links to obtain API tokens for CurseForge and Modrinth:

[CurseForge](https://authors-old.curseforge.com/account/api-tokens)

> Once obtained, your Modrinth API token can only be viewed once. Please ensure you save your API token securely.

[Modrinth](https://modrinth.com/settings/pats)

### 🌍 Global Configuration

| Field               | Type                             | Description                                                                        | Default                                                                                         | Example                                              |
|---------------------|----------------------------------|------------------------------------------------------------------------------------|-------------------------------------------------------------------------------------------------|------------------------------------------------------|
| `release_type`      | `'alpha' \| 'beta' \| 'release'` | Release type                                                                       | `'release'`                                                                                     | `'beta'`                                             |
| `game_versions`     | `string \| string[]`             | Minecraft game versions                                                            | `[]`                                                                                            | `['1.20.1', '1.21.1']`                               |
| `mod_loaders`       | `string \| string[]`             | Mod loaders                                                                        | `[]`                                                                                            | `['fabric', 'forge']`                                |
| `display_name`      | `string`                         | Mod display name                                                                   | `nextRelease.name`                                                                              | `'[NeoForge 1.21.1] 1.0.0'`                          |
| `strategies`        | `Record<any, any>[]`             | Store an array of strategy configurations for each release. See explanation below. | `[{}]`                                                                                          | `[{ 'loader': 'fabric' }, { 'loader': 'neoforge' }]` |
| `glob`              | `string \| string[]`             | Glob patterns that matches all files requiring upload                              | `['build/libs/!(*-@(dev\|sources\|javadoc)).jar','build/libs/*-@(dev\|sources\|javadoc).jar',]` | -                                                    |
| `primary_file_glob` | `string \| string[]`             | Glob pattern matching the primary file                                             | -                                                                                               | -                                                    |
| `dependencies`      | Array of Objects                 | Global Dependency relations. See sub-table below.                                  | `[]`                                                                                            | ~~~                                                  |

#### 🕸️ Global Dependencies Sub-Configuration

| Field                   | Type                                                       | Description                            | Default | Example      |
|-------------------------|------------------------------------------------------------|----------------------------------------|---------|--------------|
| `slug`                  | `string`                                                   | Project Slug of dependency (required). | -       | `'yacl'`     |
| `curseforge_project_id` | `string`                                                   | CurseForge Project ID of dependency.   | -       | ~~~          |
| `modrinth_project_id`   | `string`                                                   | Modrinth Project ID of dependency.     | -       | ~~~          |
| `type`                  | `'required' \| 'optional' \| 'incompatible' \| 'embedded'` | Dependency type (required).            | -       | `'embedded'` |


### ⚙️ Strategy (Template) Configuration

When using a strategy list, each strategy will be executed once. Values within the strategy will be embedded into most strings using Lodash's template function. For example, if you use a strategy like this:
```json
{
    "loader": "fabric",
    "name": "Fabric"
}
```
You can use it in display_name like this: `‘[${ name } 1.21.1] ${ nextRelease.version }’`.

Here, `name` is defined as specified in your strategy.

Similarly, you can embed content from semantic release [context](https://github.com/semantic-release/semantic-release/blob/master/docs/developer-guide/plugin.md#context) into strings. The most practical one is `nextRelease.version`, which is the version number calculated by Semantic Release for the upcoming release.

Therefore, the above string will be replaced at runtime with something like: `[Fabric 1.21.1] 1.0.0`

### 🔨 CurseForge Configuration

Configure under the `curseforge` object. Requires `project_id` to enable.

| Field                          | Type                             | Description                                                 | Default             | Example                           |
|--------------------------------|----------------------------------|-------------------------------------------------------------|---------------------|-----------------------------------|
| `project_id`                   | `string`                         | CurseForge project ID (required). Get from project website. | -                   | `'1250626'`                       |
| `game_versions`                | `string \| string[]`             | CurseForge-specific game versions.                          | Global              | `['1.21.9', '1.21.10']`           |
| `java_versions`                | `number \| number[]`             | Supported Java versions.                                    | `[]`                | `21`                              |
| `environments`                 | `string \| string[]`             | Release environments (e.g., `client`, `server`).            | `[]`                | `'client'`                        |
| `game_versions_for_plugins`    | `string \| string[]`             | Game versions primarily used for Bukkit plugins.            | `[]`                | `'1.20'`                          |
| `game_versions_for_addon`      | `string \| string[]`             | Game versions for add-ons.                                  | `[]`                | `'1.21'`                          |
| `mod_loaders`                  | `string \| string[]`             | CurseForge-specific loaders.                                | `Global`            | `'fabric'`                        |
| `changelog`                    | `string`                         | Custom changelog text.                                      | `nextRelease.notes` | `'Custom changes for v1.0.0'`     |
| `changelog_type`               | `'text' \| 'html' \| 'markdown'` | Changelog format.                                           | `'markdown'`        | `'html'`                          |
| `display_name`                 | `string`                         | CurseForge-specific display name.                           | Global              | `'Iris 1.9.6 for Fabric 1.21.10'` |
| `is_marked_for_manual_release` | `boolean`                        | Mark release as manual so you can choose when to release.   | `false`             | `true`                            |
| `relations`                    | Array of Objects                 | Dependency relations. See sub-table below.                  | Global              | -                                 |
| `glob`                         | `string \| string[]`             | CurseForge-specific file glob.                              | Global              | ~~~                               |
| `primary_file_glob`            | `string \| string[]`             | CurseForge-specific primary file.                           | Global              | ~~~                               |

#### 🧩 CurseForge Dependencies Sub-Configuration

| Field             | Type                                                                                            | Description                    | Default | Example                |
|-------------------|-------------------------------------------------------------------------------------------------|--------------------------------|---------|------------------------|
| `slug`            | `string`                                                                                        | Slug of dependency (required). | -       | `'architectury-api'`   |
| `project_id`      | `string`                                                                                        | Project ID of dependency.      | -       | `'419699'`             |
| `dependency_type` | `'embeddedLibrary' \| 'incompatible' \| 'optionalDependency' \| 'requiredDependency' \| 'tool'` | Dependency type (required).    | -       | `'requiredDependency'` |

### ⚡ Modrinth Configuration

Configure under the `modrinth` object. Requires `project_id` to enable.

| Field               | Type                                                                          | Description                                                | Default               | Example                  |
|---------------------|-------------------------------------------------------------------------------|------------------------------------------------------------|-----------------------|--------------------------|
| `project_id`        | `string`                                                                      | Modrinth project ID (required). Copy from project website. | -                     | `'uWsLN21d'`             |
| `version_number`    | `string`                                                                      | Custom version number.                                     | `nextRelease.version` | `'1.0.0+fabric'`         |
| `display_name`      | `string`                                                                      | Modrinth-specific display name.                            | Global                | `'3.14.1_Fabric_1.21.1'` |
| `game_versions`     | `string[]`                                                                    | Modrinth-specific game versions.                           | Global                | `'1.12.2'`               |
| `mod_loaders`       | `string[]`                                                                    | Modrinth-specific loaders.                                 | Global                | `'quilt'`                |
| `changelog`         | `string`                                                                      | Custom changelog.                                          | `nextRelease.notes`   | `'See full changelog'`   |
| `dependencies`      | Array of Objects                                                              | Dependency relations. See sub-table below.                 | Global                | -                        |
| `featured`          | `boolean`                                                                     | Mark as featured version.                                  | `false`               | `true`                   |
| `status`            | `'listed' \| 'archived' \| 'draft' \| 'unlisted' \| 'scheduled' \| 'unknown'` | Version visibility status.                                 | `'listed'`            | `'draft'`                |
| `requested_status`  | `'listed' \| 'archived' \| 'draft' \| 'unlisted'`                             | Requested status (for moderation).                         | `'listed'`            | `'unlisted'`             |
| `glob`              | `string \| string[]`                                                          | Modrinth-specific file glob.                               | Global                | ~~~                      |
| `primary_file_glob` | `string \| string[]`                                                          | Modrinth-specific primary file.                            | Global                | ~~~                      |

#### 🔗 Modrinth Dependencies Sub-Configuration

| Field             | Type                                                       | Description                                                                           | Default | Example      |
|-------------------|------------------------------------------------------------|---------------------------------------------------------------------------------------|---------|--------------|
| `version_id`      | `string`                                                   | Specific version ID of dependency.                                                    | -       | `'e0mxOOIE'` |
| `project_id`      | `string`                                                   | Project ID of dependency.                                                             | -       | `'mOgUt4GM'` |
| `file_name`       | `string`                                                   | File name of the dependency, mainly for displaying external dependencies in modpacks. | -       | ~~~          |
| `dependency_type` | `'required' \| 'optional' \| 'incompatible' \| 'embedded'` | Dependency type (required).                                                           | -       | `'optional'` |

## 🗂️Configuration Reference

The following is an example configuration for an Architectury project, demonstrating how to use different options:

Some quick tips to help you grasp things faster:
- Each strategy runs once.
- Values within strategies and [context](https://github.com/semantic-release/semantic-release/blob/master/docs/developer-guide/plugin.md#context) can be embedded in strings.

```json
[
  "semantic-release-minecraft",
  {
    "game_versions": ["1.21.9", "1.21.10"],
    "mod_loaders": "${ loader }",
    "display_name": "[${ name } 1.21.9/10] ${ nextRelease.version }",
    "glob": "${ loader }/build/libs/better_client-${ loader }-${ nextRelease.version }.jar",
    "strategies": [
      {
        "loader": "fabric",
        "name": "Fabric"
      },
      {
        "loader": "neoforge",
        "name": "NeoForge"
      }
    ],
    "curseforge": {
      "project_id": "1250626",
      "java_versions": 21,
      "environments": "client",
      "relations": [
        {
          "slug": "yacl",
          "type": "optionalDependency"
        },
        {
          "slug": "architectury-api",
          "type": "requiredDependency"
        }
      ]
    },
    "modrinth": {
      "project_id": "uWsLN21d",
      "version_number": "${ nextRelease.version }+${ loader }",
      "dependencies": [
        {
          "project_id": "lhGA9TYQ",
          "dependency_type": "optional"
        },
        {
          "project_id": "1eAoo2KR",
          "dependency_type": "required"
        }
      ]
    }
  }
]
```
