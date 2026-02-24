function previewResponseBody(body: string, length = 200): string {
	return body.replace(/\s+/g, ' ').trim().slice(0, length)
}

async function fetchJson<T = any>(url: string): Promise<T> {
	const res = await fetch(url)
	const body = await res.text()
	const contentType = res.headers.get('content-type') ?? 'unknown'

	if (!res.ok) {
		throw new Error(
			`Metadata request failed for URL: ${url} (status ${res.status}). Body preview: "${previewResponseBody(body)}"`
		)
	}

	try {
		return JSON.parse(body) as T
	} catch (error) {
		throw new Error(
			`Failed to parse JSON for URL: ${url} (status ${res.status}, content-type ${contentType}). Body preview: "${previewResponseBody(
				body
			)}". Original error: ${error instanceof Error ? error.message : String(error)}`
		)
	}
}

export async function fetchCoreMetadata(): Promise<{
	protocols: Record<string, any>
	chains: Record<string, any>
	categoriesAndTags: any
	cexs: Array<any>
	rwaList: any
}> {
	const API_KEY = process.env.API_KEY
	const API_SERVER_URL = API_KEY ? `https://pro-api.llama.fi/${API_KEY}/api` : 'https://api.llama.fi'
	const RWA_SERVER_URL = API_KEY ? `https://pro-api.llama.fi/${API_KEY}/rwa` : 'https://api.llama.fi/rwa'

	const PROTOCOLS_DATA_URL = `${API_SERVER_URL}/config/smol/appMetadata-protocols.json`
	const CHAINS_DATA_URL = `${API_SERVER_URL}/config/smol/appMetadata-chains.json`
	const CATEGORIES_AND_TAGS_DATA_URL = `${API_SERVER_URL}/config/smol/appMetadata-categoriesAndTags.json`
	const CEXS_DATA_URL = `${API_SERVER_URL}/cexs`
	const RWA_LIST_DATA_URL = `${RWA_SERVER_URL}/list`

	const [protocols, chains, categoriesAndTags, cexs, rwaList] = await Promise.all([
		fetchJson(PROTOCOLS_DATA_URL),
		fetchJson(CHAINS_DATA_URL),
		fetchJson(CATEGORIES_AND_TAGS_DATA_URL),
		fetchJson(CEXS_DATA_URL).then((res) => res.cexs ?? []),
		fetchJson(RWA_LIST_DATA_URL).catch(() => ({}))
	])

	return { protocols, chains, categoriesAndTags, cexs, rwaList }
}
