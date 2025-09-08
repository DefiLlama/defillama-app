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
		for (const token of Object.keys(inflow)) {
			if (token !== 'date') {
				tokenInflowNames.add(token)
			}
		}
	}

	return {
		chains: [
			{ label: 'All', to: '/bridged' },
			...Object.entries(assets ?? {})
				.sort(
					(a: any, b: any) =>
						Number(b[1].total?.total?.split('.')?.[0] ?? 0) - Number(a[1].total?.total?.split('.')?.[0] ?? 0)
				)
				.map((asset) => ({ label: asset[0], to: `/bridged/${slug(asset[0])}` }))
		],
		assets,
		flows1d,
		chainData,
		inflows,
		tokenInflowNames: Array.from(tokenInflowNames)
	}
}
