async function fetchJson<T = any>(url: string): Promise<T> {
	return fetch(url).then((res) => res.json() as Promise<T>)
}

export async function fetchCoreMetadata(): Promise<{
	protocols: Record<string, any>
	chains: Record<string, any>
	categoriesAndTags: any
	cexs: Array<any>
	rwaList: any
}> {
	const PROTOCOLS_DATA_URL = 'https://api.llama.fi/config/smol/appMetadata-protocols.json'
	const CHAINS_DATA_URL = 'https://api.llama.fi/config/smol/appMetadata-chains.json'
	const CATEGORIES_AND_TAGS_DATA_URL = 'https://api.llama.fi/config/smol/appMetadata-categoriesAndTags.json'
	const CEXS_DATA_URL = 'https://api.llama.fi/cexs'
	const RWA_SERVER_URL = process.env.RWA_SERVER_URL ?? 'https://api.llama.fi/rwa'

	const [protocols, chains, categoriesAndTags, cexs, rwaList] = await Promise.all([
		fetchJson(PROTOCOLS_DATA_URL),
		fetchJson(CHAINS_DATA_URL),
		fetchJson(CATEGORIES_AND_TAGS_DATA_URL),
		fetchJson(CEXS_DATA_URL).then((res) => res.cexs ?? []),
		fetchJson(`${RWA_SERVER_URL}/list?x=11`).catch(() => ({}))
	])

	return { protocols, chains, categoriesAndTags, cexs, rwaList }
}
