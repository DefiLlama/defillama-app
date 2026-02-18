export function getEntityUrl(type: string, slug: string): string {
	switch (type) {
		case 'protocol':
		case 'subprotocol':
			return `/protocol/${slug}`
		case 'chain':
			return `/chain/${slug}`
		case 'pool':
			return `/yields/pool/${slug}`
		case 'category':
			return `/protocols/${slug}`
		case 'stablecoin':
			return `/stablecoin/${slug}`
		case 'cex':
			return `/cex/${slug}`
		default:
			return `/${type}/${slug}`
	}
}

/**
 * Get the icon URL for an entity based on type and slug.
 * Returns empty string for unsupported types.
 */
export function getEntityIcon(type: string, slug: string): string {
	switch (type) {
		case 'protocol':
		case 'subprotocol':
		case 'cex':
			return `https://icons.llamao.fi/icons/protocols/${slug}?w=48&h=48`
		case 'chain':
			return `https://icons.llamao.fi/icons/chains/rsz_${slug}?w=48&h=48`
		case 'stablecoin':
			return `https://icons.llamao.fi/icons/pegged/${slug}?w=48&h=48`
		default:
			return ''
	}
}

export function convertLlamaLinksToDefillama(content: string): string {
	const llamaLinkPattern = /\[([^\]]+)\]\((llama:\/\/([^/)]+)\/([^)]*?))\)/g
	return content.replace(llamaLinkPattern, (_, text, __, type, slug) => {
		const url = getEntityUrl(type, slug)
		return `[${text}](https://defillama.com${url})`
	})
}
