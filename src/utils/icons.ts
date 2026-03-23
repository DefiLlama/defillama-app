import { ICONS_CDN } from '~/constants'

const STRIP_QUOTES_AND_PARENS = /[()'"]/g
const WHITESPACE = /\s+/g
const INVALID_CHARS = /[^\w.!&-]/g

export function tokenIconUrl(name: string, size: number = 48): string {
	const slug = name
		.trim()
		.toLowerCase()
		.replace(STRIP_QUOTES_AND_PARENS, '')
		.replace(WHITESPACE, '-')
		.replace(INVALID_CHARS, '')

	return `${ICONS_CDN}/protocols/${slug}?w=${size}&h=${size}`
}

export function chainIconUrl(chain: string, size: number = 48): string {
	return `${ICONS_CDN}/chains/rsz_${chain.toLowerCase()}?w=${size}&h=${size}`
}

export function peggedAssetIconUrl(name: string, size: number = 48): string {
	const slug = name.trim().toLowerCase().replace(WHITESPACE, '-')

	return `${ICONS_CDN}/pegged/${encodeURIComponent(slug)}?w=${size}&h=${size}`
}

export function liquidationsIconUrl(symbol: string, size: number = 48): string {
	return `${ICONS_CDN}/liquidations/${symbol.toLowerCase()}?w=${size}&h=${size}`
}

export function equityIconUrl(symbol: string, size: number = 48): string {
	// no lowercase
	return `${ICONS_CDN}/equities/${encodeURIComponent(symbol)}?w=${size}&h=${size}`
}
