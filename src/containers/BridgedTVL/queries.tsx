import { BRIDGEINFLOWS_API, CHAIN_ASSETS_FLOWS, CHAINS_ASSETS } from '~/constants'
import { slug } from '~/utils'
import { fetchJson } from '~/utils/async'
import { sluggify } from '~/utils/cache-client'

export async function getBridgedTVLByChain(chain?: string) {
	const [assets, flows1d, inflows] = await Promise.all([
		fetchJson(CHAINS_ASSETS),
		fetchJson(CHAIN_ASSETS_FLOWS + '/24h').catch(() => null),
		chain
			? fetchJson(`${BRIDGEINFLOWS_API}/${sluggify(chain)}/1d`)
					.then((data) => data.data.map((item) => ({ ...item.data, date: item.timestamp })))
					.catch(() => [])
			: []
	])
	const chainData = chain ? (Object.entries(assets ?? {}).find((a) => slug(a[0]) === slug(chain))?.[1] ?? null) : null

	const tokenInflowNames = new Set<string>()
	for (const inflow of inflows) {
		for (const token in inflow) {
			if (token !== 'date') {
				tokenInflowNames.add(token)
			}
		}
	}

	const assetEntries: [string, any][] = []
	for (const key in assets ?? {}) {
		assetEntries.push([key, assets[key]])
	}
	assetEntries.sort(
		(a, b) => Number(b[1].total?.total?.split('.')?.[0] ?? 0) - Number(a[1].total?.total?.split('.')?.[0] ?? 0)
	)
	const chainLinks: { label: string; to: string }[] = [{ label: 'All', to: '/bridged' }]
	for (const [assetKey] of assetEntries) {
		chainLinks.push({ label: assetKey, to: `/bridged/${slug(assetKey)}` })
	}

	return {
		chains: chainLinks,
		assets,
		flows1d,
		chainData,
		inflows,
		tokenInflowNames: Array.from(tokenInflowNames)
	}
}
