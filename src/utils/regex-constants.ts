/**
 * Shared RegExp constants hoisted to module scope for performance.
 * Creating RegExp objects is expensive, so we create them once and reuse them.
 */

// Whitespace patterns
const WHITESPACE_REGEX = /\s+/g

// Sluggify patterns - used for URL slug generation
export const NON_WORD_SLASH_REGEX = /[^\w/]+/g
export const NON_WORD_SLASH_DOT_REGEX = /[^\w/.]+/g
export const LEADING_DASH_REGEX = /^-+/
export const TRAILING_DASH_REGEX = /-+$/
