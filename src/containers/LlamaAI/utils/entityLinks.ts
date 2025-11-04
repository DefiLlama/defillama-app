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
		default:
			return `/${type}/${slug}`
	}
}

export function convertLlamaLinksToDefillama(content: string): string {
	const llamaLinkPattern = /\[([^\]]+)\]\((llama:\/\/([^/)]+)\/([^)]*?))\)/g
	return content.replace(llamaLinkPattern, (_, text, __, type, slug) => {
		const url = getEntityUrl(type, slug)
		return `[${text}](https://defillama.com${url})`
	})
}
