import { PROTOCOLS_API } from '~/constants'
import { fetchJson } from '~/utils/async'
import { ILiteProtocol } from '../ChainOverview/types'
import { slug, tokenIconUrl } from '~/utils'

export interface IProtocolMcapsByChainPageData {
	protocols: Array<{
		name: string
		logo: string
		slug: string
		category: string | null
		chains: Array<string>
		mcap: number
		subRows?: Array<{
			name: string
			logo: string
			slug: string
			category: string | null
			chains: Array<string>
			mcap: number
		}>
	}>
	chain: string
	chains: Array<{ label: string; to: string }>
}

export async function getProtocolsMarketCapsByChain({
	chain
}: {
	chain: string
}): Promise<IProtocolMcapsByChainPageData | null> {
	const {
		protocols,
		chains,
		parentProtocols
	}: {
		protocols: Array<ILiteProtocol>
		chains: Array<string>
		parentProtocols: Array<{ id: string; name: string; chains: Array<string>; mcap?: number }>
	} = await fetchJson(PROTOCOLS_API)

	const metadataCache = await import('~/utils/metadata').then((m) => m.default)

	const finalProtocols = []
	const finalParentProtocols = {}

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
			mcap: protocol.mcap ?? null
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
				mcap: p.mcap ?? null
			})
		}
	}

	return {
		protocols: finalProtocols.filter((p) => p.mcap != null).sort((a, b) => (b.mcap ?? 0) - (a.mcap ?? 0)),
		chain,
		chains: [
			{ label: 'All', to: '/mcaps' },
			...chains.map((chain) => ({ label: chain, to: `/mcaps/chain/${slug(chain)}` }))
		]
	}
}
