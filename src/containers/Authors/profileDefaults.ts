import type { PublicDashboardAuthor } from './types'

export const DEFAULT_AUTHOR_SLUG_RE = /^llama-[a-f0-9]{12}$/i
export const DEFAULT_AUTHOR_NAME_RE = /^Llama [a-f0-9]{6}$/i

export function hasCustomizedAuthorProfile(author: PublicDashboardAuthor): boolean {
	if (!DEFAULT_AUTHOR_SLUG_RE.test(author.slug)) return true
	if (!DEFAULT_AUTHOR_NAME_RE.test(author.displayName)) return true
	if (author.bio?.trim()) return true
	if (author.avatarUrl?.trim()) return true
	return Object.values(author.socials || {}).some((value) => typeof value === 'string' && value.trim())
}
