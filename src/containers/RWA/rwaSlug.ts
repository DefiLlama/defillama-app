import { LEADING_DASH_REGEX, TRAILING_DASH_REGEX } from '~/utils/regex-constants'

const NON_WORD_REGEX = /[^\w]+/g
const MULTI_DASH_REGEX = /-+/g

const safeDecode = (input: string) => {
	try {
		return decodeURIComponent(input)
	} catch {
		return input
	}
}

// RWA-specific slug: must be safe as a *single* URL segment (no `/`).
export const rwaSlug = (input = ''): string => {
	const normalized = safeDecode(String(input)).toLowerCase().trim()
	return normalized
		.replace(NON_WORD_REGEX, '-')
		.replace(MULTI_DASH_REGEX, '-')
		.replace(LEADING_DASH_REGEX, '')
		.replace(TRAILING_DASH_REGEX, '')
}
