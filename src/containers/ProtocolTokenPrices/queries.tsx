import { PROTOCOLS_API } from '~/constants'
import { fetchJson } from '~/utils/async'
import { ILiteProtocol } from '../ChainOverview/types'
import { slug, tokenIconUrl } from '~/utils'
import { fetchCoinPrices } from '~/api'

export interface IProtocolTokenPricesByChainPageData {
	protocols: Array<{
		name: string
		logo: string
		slug: string
		category: string | null
		chains: Array<string>
		price: number
		subRows?: Array<{
			name: string
			logo: string
			slug: string
			category: string | null
			chains: Array<string>
			price: number
		}>
	}>
	chain: string
	chains: Array<{ label: string; to: string }>
}

export async function getProtocolsTokenPricesByChain({
	chain
}: {
	chain: string
}): Promise<IProtocolTokenPricesByChainPageData | null> {
	const {
		protocols,
		chains,
		parentProtocols
	}: {
		protocols: Array<ILiteProtocol>
		chains: Array<string>
		parentProtocols: Array<{ id: string; name: string; chains: Array<string>; gecko_id?: string }>
	} = await fetchJson(PROTOCOLS_API)

	const metadataCache = await import('~/utils/metadata').then((m) => m.default)

	const finalProtocols = []
	const finalParentProtocols = {}

	const protocolGeckoIds = new Set<string>()
	for (const protocol of protocols) {
		if (protocol.geckoId) {
			protocolGeckoIds.add(`coingecko:${protocol.geckoId}`)
		}
	}
	for (const parentProtocol of parentProtocols) {
		if (parentProtocol.gecko_id) {
			protocolGeckoIds.add(`coingecko:${parentProtocol.gecko_id}`)
		}
	}

	const prices = await fetchCoinPrices(Array.from(protocolGeckoIds))

	for (const protocol of protocols) {
		if (['Bridge', 'Canonical Bridge', 'Foundation', 'Meme'].includes(protocol.category ?? '')) continue

		const p = {
			name: protocol.name,
			logo: tokenIconUrl(slug(protocol.name)),
			slug: slug(protocol.name),
			category: protocol.category,
			chains:
				(protocol.defillamaId ? metadataCache.protocolMetadata[protocol.defillamaId].chains : null) ??
				protocol.chains ??
				[],
			price: protocol.geckoId ? prices[`coingecko:${protocol.geckoId}`]?.price ?? null : null
		}

		if (protocol.parentProtocol) {
			finalParentProtocols[protocol.parentProtocol] = [...(finalParentProtocols[protocol.parentProtocol] ?? []), p]
		} else {
			finalProtocols.push(p)
		}
	}

	for (const parent in finalParentProtocols) {
		const p = parentProtocols.find((p) => p.id === parent)
		if (p) {
			const categories = Array.from(
				new Set(finalParentProtocols[parent].filter((p) => p.category).map((p) => p.category))
			)

			finalProtocols.push({
				name: p.name,
				logo: tokenIconUrl(slug(p.name)),
				slug: slug(p.name),
				category: categories.length > 1 ? null : categories[0] ?? null,
				chains: Array.from(new Set(finalParentProtocols[parent].map((p) => p.chains).flat())),
				subRows: finalParentProtocols[parent],
				price: p.gecko_id ? prices[`coingecko:${p.gecko_id}`]?.price ?? null : null
			})
		}
	}

	return {
		protocols: finalProtocols
			.filter((p) => p.price != null && (chain === 'All' || p.chains.includes(chain)))
			.sort((a, b) => (b.price ?? 0) - (a.price ?? 0)),
		chain,
		chains: [
			{ label: 'All', to: '/token-prices' },
			...chains.map((chain) => ({ label: chain, to: `/token-prices/chain/${slug(chain)}` }))
		]
	}
}
