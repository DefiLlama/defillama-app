import type { RawChainAsset } from '~/containers/BridgedTVL/api.types'
import type { IFormattedChainAsset } from './types'

export function formatChainAssets(chainAsset: RawChainAsset | null) {
	if (!chainAsset) return null

	const acc = {} as IFormattedChainAsset
	for (const type in chainAsset) {
		const asset = chainAsset[type]
		const formatted = {} as any
		formatted.total = Number(asset.total.split('.')[0])
		const breakdown = {}
		for (const b in asset.breakdown) {
			breakdown[b] = Number(asset.breakdown[b].split('.')[0])
		}
		formatted.breakdown = breakdown
		acc[type] = formatted
	}
	return acc
}
