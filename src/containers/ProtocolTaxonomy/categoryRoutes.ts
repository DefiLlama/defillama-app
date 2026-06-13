// Category slugs whose pages live outside /protocols/<category>.
export const categoryRoutesOutsideProtocols: Record<string, string> = {
	rwa: '/rwa',
	dexs: '/dexs',
	derivatives: '/perps',
	'dex-aggregator': '/dex-aggregators',
	'bridge-aggregator': '/bridge-aggregators'
}

export const getCategoryRoute = (categorySlug: string) =>
	categoryRoutesOutsideProtocols[categorySlug] ?? `/protocols/${categorySlug}`
