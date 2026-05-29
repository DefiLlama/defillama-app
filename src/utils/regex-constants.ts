/**
 * Shared RegExp constants hoisted to module scope for performance.
 * Creating RegExp objects is expensive, so we create them once and reuse them.
 */

// Sluggify patterns - used for URL slug generation
export const NON_WORD_SLASH_REGEX = /[^\w/]+/g
export const NON_WORD_SLASH_DOT_REGEX = /[^\w/.]+/g
export const LEADING_DASH_REGEX = /^-+/
export const TRAILING_DASH_REGEX = /-+$/

// Yield pool config IDs are UUIDs returned by the yields config API.
export const YIELD_POOL_CONFIG_ID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
