export const PROTOCOLS_DATA_URL = 'https://api.llama.fi/config/smol/appMetadata-protocols.json'
export const CHAINS_DATA_URL = 'https://api.llama.fi/config/smol/appMetadata-chains.json'
export const CATEGORIES_AND_TAGS_DATA_URL = 'https://api.llama.fi/config/smol/appMetadata-categoriesAndTags.json'
export const CEXS_DATA_URL = 'https://api.llama.fi/cexs'

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
	const rwaServerUrl = process.env.RWA_SERVER_URL
	if (!rwaServerUrl) {
		throw new Error('Missing required env var: RWA_SERVER_URL')
	}

	const [protocols, chains, categoriesAndTags, cexResp, rwaList] = await Promise.all([
		fetchJson(PROTOCOLS_DATA_URL),
		fetchJson(CHAINS_DATA_URL),
		fetchJson(CATEGORIES_AND_TAGS_DATA_URL),
		fetchJson(CEXS_DATA_URL),
		fetchJson(`${rwaServerUrl}/list?q=2`)
	])

	const cexs = (cexResp as any)?.cexs ?? []

	return { protocols, chains, categoriesAndTags, cexs, rwaList }
}
