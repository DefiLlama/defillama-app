import type { PublicDashboardAuthor } from './types'

const GENERATED_NAME_ADJECTIVES = [
	'agile',
	'amber',
	'ancient',
	'artful',
	'beaming',
	'boisterous',
	'bold',
	'brave',
	'breezy',
	'bright',
	'bubbly',
	'calm',
	'candid',
	'cheerful',
	'chipper',
	'clever',
	'cosmic',
	'crafty',
	'crimson',
	'curious',
	'dapper',
	'daring',
	'dashing',
	'dazzling',
	'eager',
	'earnest',
	'electric',
	'elegant',
	'emerald',
	'epic',
	'fearless',
	'fierce',
	'frosty',
	'gallant',
	'gentle',
	'gleaming',
	'golden',
	'graceful',
	'groovy',
	'happy',
	'hardy',
	'hearty',
	'humble',
	'intrepid',
	'jaunty',
	'jolly',
	'keen',
	'lively',
	'lucky',
	'luminous',
	'majestic',
	'mellow',
	'merry',
	'mighty',
	'nimble',
	'noble',
	'peppy',
	'perky',
	'playful',
	'plucky',
	'polished',
	'proud',
	'quick',
	'quirky',
	'radiant',
	'rugged',
	'savvy',
	'scarlet',
	'serene',
	'silver',
	'sleek',
	'snappy',
	'spirited',
	'sprightly',
	'stellar',
	'sunny',
	'swift',
	'valiant',
	'vibrant',
	'vivid',
	'wandering',
	'whimsical',
	'wise',
	'witty',
	'zealous',
	'zesty'
]

const ADJECTIVE_PATTERN = GENERATED_NAME_ADJECTIVES.join('|')

export const DEFAULT_AUTHOR_SLUG_RE = new RegExp(
	`^(?:llama-[a-f0-9]{12}|(?:${ADJECTIVE_PATTERN})-(?:${ADJECTIVE_PATTERN})-llama(?:-[a-f0-9]{4})?)$`,
	'i'
)
export const DEFAULT_AUTHOR_NAME_RE = new RegExp(
	`^(?:Llama [a-f0-9]{6}|(?:${ADJECTIVE_PATTERN}) (?:${ADJECTIVE_PATTERN}) Llama(?: [a-f0-9]{4})?)$`,
	'i'
)

export function hasCustomizedAuthorProfile(author: PublicDashboardAuthor): boolean {
	if (!DEFAULT_AUTHOR_SLUG_RE.test(author.slug)) return true
	if (!DEFAULT_AUTHOR_NAME_RE.test(author.displayName)) return true
	if (author.bio?.trim()) return true
	if (author.avatarUrl?.trim()) return true
	return Object.values(author.socials || {}).some((value) => typeof value === 'string' && value.trim())
}
