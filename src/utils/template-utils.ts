import lodash from 'lodash';
import { toArray } from './utils.js';

/**
 * Renders one or more template strings sequentially using lodash.template.
 *
 * @param templates - A single template string or an array of template strings.
 * @param context - The context object passed to each template during rendering.
 * @returns An array of rendered strings.
 */
export function renderTemplates(
    templates: string | string[],
    context: Record<string, any>
): string[] {
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
    sources: Array<string | undefined | null>,
    context: Record<string, any>
): string | undefined {
    const source = sources.find(Boolean);
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
    sources: Array<string | string[] | undefined | null>,
    context: Record<string, any>
): string[] | undefined {
    const source = sources.find(Boolean);
    if (!source) return undefined;

    return renderTemplates(source, context);
}
