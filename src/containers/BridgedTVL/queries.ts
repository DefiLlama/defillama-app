import { slug } from '~/utils'
import { sluggify } from '~/utils/cache-client'
import { fetchChainAssetsFlows1d, fetchChainAssetsHistoricalFlows, fetchChainsAssets } from './api'
import type { RawChainAsset, RawChainAssetsFlowEntry, RawChainsAssetsResponse } from './api.types'

export interface BridgedTVLData {
	chains: Array<{ label: string; to: string }>
	assets: RawChainsAssetsResponse
	flows1d: Record<string, RawChainAssetsFlowEntry> | null
	chainData: RawChainAsset | null
	inflows: Array<Record<string, number>>
	tokenInflowNames: string[]
}

export async function getBridgedTVLByChain(chain?: string): Promise<BridgedTVLData> {
	const [assets, flows1d, inflows] = await Promise.all([
		fetchChainsAssets(),
		fetchChainAssetsFlows1d(),
		chain ? fetchChainAssetsHistoricalFlows(sluggify(chain)) : []
	])

	let chainData: RawChainAsset | null = null
	if (chain) {
		const targetSlug = slug(chain)
		for (const key in assets ?? {}) {
			if (slug(key) === targetSlug) {
				chainData = assets[key]
				break
			}
		}
	}

	const tokenInflowNames = new Set<string>()
	for (const inflow of inflows) {
		for (const token in inflow) {
			if (token !== 'date') {
				tokenInflowNames.add(token)
			}
		}
	}

	const assetEntries: [string, RawChainAsset][] = []
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
