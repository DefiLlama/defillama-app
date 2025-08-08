import { PROTOCOLS_API } from '~/constants'
import { fetchJson } from '~/utils/async'
import { ILiteProtocol } from '../ChainOverview/types'
import { slug, tokenIconUrl } from '~/utils'
import { getAllCGTokensList } from '~/api'
import { IResponseCGMarketsAPI } from '~/api/types'

export interface IProtocolFDVsByChainPageData {
	protocols: Array<{
		name: string
		logo: string
		slug: string
		category: string | null
		chains: Array<string>
		fdv: number
		subRows?: Array<{
			name: string
			logo: string
			slug: string
			category: string | null
			chains: Array<string>
			fdv: number
		}>
	}>
	chain: string
	chains: Array<{ label: string; to: string }>
}

export async function getProtocolsFDVsByChain({
	chain
}: {
	chain: string
}): Promise<IProtocolFDVsByChainPageData | null> {
	const [{ protocols, chains, parentProtocols }, tokenList]: [
		{
			protocols: Array<ILiteProtocol>
			chains: Array<string>
			parentProtocols: Array<{ id: string; name: string; chains: Array<string>; gecko_id?: string }>
		},
		Array<IResponseCGMarketsAPI>
	] = await Promise.all([fetchJson(PROTOCOLS_API), getAllCGTokensList()])

	const metadataCache = await import('~/utils/metadata').then((m) => m.default)

	const finalProtocols = []
	const finalParentProtocols = {}

	for (const protocol of protocols) {
		if (['Bridge', 'Canonical Bridge', 'Foundation', 'Meme'].includes(protocol.category ?? '')) continue

		const fdv = protocol.geckoId ? tokenList.find((t) => t.id === protocol.geckoId)?.['fully_diluted_valuation'] : null
		const p = {
			name: protocol.name,
			logo: tokenIconUrl(slug(protocol.name)),
			slug: slug(protocol.name),
			category: protocol.category,
			chains:
				(protocol.defillamaId ? metadataCache.protocolMetadata[protocol.defillamaId].chains : null) ??
				protocol.chains ??
				[],
			fdv: fdv ?? null
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

			const fdv = p.gecko_id ? tokenList.find((t) => t.id === p.gecko_id)?.['fully_diluted_valuation'] : null

			finalProtocols.push({
				name: p.name,
				logo: tokenIconUrl(slug(p.name)),
				slug: slug(p.name),
				category: categories.length > 1 ? null : categories[0] ?? null,
				chains: Array.from(new Set(finalParentProtocols[parent].map((p) => p.chains).flat())),
				subRows: finalParentProtocols[parent],
				fdv: fdv ?? null
			})
		}
	}

	return {
		protocols: finalProtocols
			.filter((p) => p.fdv != null && (chain === 'All' || p.chains.includes(chain)))
			.sort((a, b) => (b.fdv ?? 0) - (a.fdv ?? 0)),
		chain,
		chains: [
			{ label: 'All', to: '/fdv' },
			...chains.map((chain) => ({ label: chain, to: `/fdv/chain/${slug(chain)}` }))
		]
	}
}
