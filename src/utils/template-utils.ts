import lodash from 'lodash';

import type { Strategy } from '../definitions/plugin-config.js';
import { toArray } from './utils.js';

export type TemplateContext = Record<string, unknown>;

type OptionalSource<T> = T | null | undefined;

function findFirstSource<T>(sources: Array<OptionalSource<T>>): T | undefined {
  return sources.find((source): source is T => Boolean(source));
}

export function createTemplateContext(context: object, strategy: Strategy): TemplateContext {
  return { ...context, ...strategy };
}

/**
 * Renders one or more template strings sequentially using lodash.template.
 *
 * @param templates - A single template string or an array of template strings.
 * @param context - The context object passed to each template during rendering.
 * @returns An array of rendered strings.
 */
export function renderTemplates(templates: string | string[], context: TemplateContext): string[] {
  return toArray(templates).map((tpl) => lodash.template(tpl)(context));
}

/**
 * Resolves the first non-empty template from multiple sources and renders it.
 *
 * @param sources - A list of template string sources, ordered by priority (highest first).
 * @param context - The rendering context passed to lodash.template.
 * @returns The rendered string, or undefined if no valid source is found.
 */
export function resolveAndRenderTemplate(
  sources: Array<OptionalSource<string>>,
  context: TemplateContext
): string | undefined {
  const source = findFirstSource(sources);
  if (!source) return undefined;

  return lodash.template(source)(context);
}

/**
 * Resolves the first non-empty template (or array of templates) from multiple sources
 * and renders all templates sequentially.
 *
 * @param sources - A list of template sources (string or string array), ordered by priority.
 * @param context - The rendering context passed to lodash.template.
 * @returns An array of rendered strings, or undefined if no valid source is found.
 */
export function resolveAndRenderTemplates(
  sources: Array<OptionalSource<string | string[]>>,
  context: TemplateContext
): string[] | undefined {
  const source = findFirstSource(sources);
  if (!source) return undefined;

  return renderTemplates(source, context);
}
