import { PROTOCOL_EMISSIONS_LIST_API, PROTOCOLS_API } from '~/constants'
import { fetchJson } from '~/utils/async'
import { ILiteProtocol } from '../ChainOverview/types'
import { slug, tokenIconUrl } from '~/utils'
import { IResponseCGMarketsAPI } from '~/api/types'
import { fetchCoinPrices, getAllCGTokensList } from '~/api'

export interface IProtocolsWithTokensByChainPageData {
	protocols: Array<{
		name: string
		logo: string
		slug: string
		category: string | null
		chains: Array<string>
		value: number
		subRows?: Array<{
			name: string
			logo: string
			slug: string
			category: string | null
			chains: Array<string>
			value: number
		}>
	}>
	chain: string
	chains: Array<{ label: string; to: string }>
	categories: Array<string>
	type: 'mcap' | 'price' | 'fdv' | 'adjusted-fdv'
}

export async function getProtocolsMarketCapsByChain({
	chain
}: {
	chain: string
}): Promise<IProtocolsWithTokensByChainPageData | null> {
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
	const categories = new Set<string>()

	for (const protocol of protocols) {
		if (['Bridge', 'Canonical Bridge', 'Foundation', 'Meme'].includes(protocol.category ?? '')) continue

		if (protocol.category) {
			categories.add(protocol.category)
		}

		const p = {
			name: protocol.name,
			logo: tokenIconUrl(slug(protocol.name)),
			slug: slug(protocol.name),
			category: protocol.category,
			chains:
				(protocol.defillamaId ? metadataCache.protocolMetadata[protocol.defillamaId].chains : null) ??
				protocol.chains ??
				[],
			value: protocol.mcap ?? null
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
				value: p.mcap ?? null
			})
		}
	}

	return {
		protocols: finalProtocols
			.filter((p) => p.value != null && (chain === 'All' || p.chains.includes(chain)))
			.sort((a, b) => (b.value ?? 0) - (a.value ?? 0)),
		chain,
		chains: [
			{ label: 'All', to: '/mcaps' },
			...chains.map((chain) => ({ label: chain, to: `/mcaps/chain/${slug(chain)}` }))
		],
		categories: Array.from(categories),
		type: 'mcap'
	}
}

export async function getProtocolsFDVsByChain({
	chain
}: {
	chain: string
}): Promise<IProtocolsWithTokensByChainPageData | null> {
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
	const categories = new Set<string>()

	for (const protocol of protocols) {
		if (['Bridge', 'Canonical Bridge', 'Foundation', 'Meme'].includes(protocol.category ?? '')) continue

		const fdv = protocol.geckoId ? tokenList.find((t) => t.id === protocol.geckoId)?.['fully_diluted_valuation'] : null

		if (protocol.category) {
			categories.add(protocol.category)
		}

		const p = {
			name: protocol.name,
			logo: tokenIconUrl(slug(protocol.name)),
			slug: slug(protocol.name),
			category: protocol.category,
			chains:
				(protocol.defillamaId ? metadataCache.protocolMetadata[protocol.defillamaId].chains : null) ??
				protocol.chains ??
				[],
			value: fdv ?? null
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
				value: fdv ?? null
			})
		}
	}

	return {
		protocols: finalProtocols
			.filter((p) => p.value != null && (chain === 'All' || p.chains.includes(chain)))
			.sort((a, b) => (b.value ?? 0) - (a.value ?? 0)),
		chain,
		chains: [
			{ label: 'All', to: '/fdv' },
			...chains.map((chain) => ({ label: chain, to: `/fdv/chain/${slug(chain)}` }))
		],
		categories: Array.from(categories),
		type: 'fdv'
	}
}

export async function getProtocolsTokenPricesByChain({
	chain
}: {
	chain: string
}): Promise<IProtocolsWithTokensByChainPageData | null> {
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
	const categories = new Set<string>()

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

		if (protocol.category) {
			categories.add(protocol.category)
		}

		const p = {
			name: protocol.name,
			logo: tokenIconUrl(slug(protocol.name)),
			slug: slug(protocol.name),
			category: protocol.category,
			chains:
				(protocol.defillamaId ? metadataCache.protocolMetadata[protocol.defillamaId].chains : null) ??
				protocol.chains ??
				[],
			value: protocol.geckoId ? prices[`coingecko:${protocol.geckoId}`]?.price ?? null : null
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
				value: p.gecko_id ? prices[`coingecko:${p.gecko_id}`]?.price ?? null : null
			})
		}
	}

	return {
		protocols: finalProtocols
			.filter((p) => p.value != null && (chain === 'All' || p.chains.includes(chain)))
			.sort((a, b) => (b.value ?? 0) - (a.value ?? 0)),
		chain,
		chains: [
			{ label: 'All', to: '/token-prices' },
			...chains.map((chain) => ({ label: chain, to: `/token-prices/chain/${slug(chain)}` }))
		],
		categories: Array.from(categories),
		type: 'price'
	}
}

export async function getProtocolsAdjustedFDVsByChain({
	chain
}: {
	chain: string
}): Promise<IProtocolsWithTokensByChainPageData | null> {
	const [{ protocols, chains, parentProtocols }, emissionsList]: [
		{
			protocols: Array<ILiteProtocol>
			chains: Array<string>
			parentProtocols: Array<{ id: string; name: string; chains: Array<string>; gecko_id?: string }>
		},
		Array<string>
	] = await Promise.all([fetchJson(PROTOCOLS_API), fetchJson(PROTOCOL_EMISSIONS_LIST_API)])

	const metadataCache = await import('~/utils/metadata').then((m) => m.default)

	const finalProtocols = []
	const finalParentProtocols = {}
	const categories = new Set<string>()
	const chainsWithEmissions = new Set<string>()

	const emissionProtocolGeckoIds = {}

	for (const protocol of protocols) {
		const hasEmissions = emissionsList.includes(slug(protocol.name))

		if (hasEmissions && protocol.geckoId) {
			emissionProtocolGeckoIds[protocol.name] = `coingecko:${protocol.geckoId}`
		}
	}

	for (const parentProtocol of parentProtocols) {
		const hasEmissions = emissionsList.includes(slug(parentProtocol.name))

		if (hasEmissions && parentProtocol.gecko_id) {
			emissionProtocolGeckoIds[parentProtocol.name] = `coingecko:${parentProtocol.gecko_id}`
		}
	}

	const [prices, adjustedSupplies] = await Promise.all([
		fetchCoinPrices(Object.values(emissionProtocolGeckoIds)),
		fetchAdjustedSupplies(Object.keys(emissionProtocolGeckoIds))
	])

	for (const protocol of protocols) {
		if (['Bridge', 'Canonical Bridge', 'Foundation', 'Meme'].includes(protocol.category ?? '')) continue

		const adjustedFDV =
			protocol.geckoId && adjustedSupplies[protocol.name] && prices[`coingecko:${protocol.geckoId}`]?.price
				? prices[`coingecko:${protocol.geckoId}`].price * adjustedSupplies[protocol.name]
				: null

		if (protocol.category) {
			categories.add(protocol.category)
		}

		protocol.chains.forEach((chain) => chainsWithEmissions.add(chain))

		const p = {
			name: protocol.name,
			logo: tokenIconUrl(slug(protocol.name)),
			slug: slug(protocol.name),
			category: protocol.category,
			chains:
				(protocol.defillamaId ? metadataCache.protocolMetadata[protocol.defillamaId].chains : null) ??
				protocol.chains ??
				[],
			value: adjustedFDV
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

			const adjustedFDV =
				p.gecko_id && adjustedSupplies[p.name] && prices[`coingecko:${p.gecko_id}`]?.price
					? prices[`coingecko:${p.gecko_id}`].price * adjustedSupplies[p.name]
					: null

			finalProtocols.push({
				name: p.name,
				logo: tokenIconUrl(slug(p.name)),
				slug: slug(p.name),
				category: categories.length > 1 ? null : categories[0] ?? null,
				chains: Array.from(new Set(finalParentProtocols[parent].map((p) => p.chains).flat())),
				subRows: finalParentProtocols[parent],
				value: adjustedFDV
			})
		}
	}

	return {
		protocols: finalProtocols
			.filter((p) => p.value != null && (chain === 'All' || p.chains.includes(chain)))
			.sort((a, b) => (b.value ?? 0) - (a.value ?? 0)),
		chain,
		chains: [
			{ label: 'All', to: '/adjusted-fdv' },
			...chains
				.filter((chain) => chainsWithEmissions.has(chain))
				.map((chain) => ({ label: chain, to: `/adjusted-fdv/chain/${slug(chain)}` }))
		],
		categories: Array.from(categories),
		type: 'adjusted-fdv'
	}
}

const fetchAdjustedSupplies = async (protocols: Array<string>) => {
	const batchSize = 10
	const batches = []
	for (let i = 0; i < protocols.length; i += batchSize) {
		batches.push(protocols.slice(i, i + batchSize))
	}

	const batchPromises = batches.map(async (batch) => {
		const adjustedSupplies = await Promise.all(
			batch.map(async (protocol) => {
				const adjustedSupply = await fetchJson(`https://defillama-datasets.llama.fi/emissions/${slug(protocol)}`)
					.catch(() => ({}))
					.then((res) => res?.supplyMetrics?.adjustedSupply ?? null)

				return { [protocol]: adjustedSupply }
			})
		)
		return adjustedSupplies.reduce((acc, curr) => ({ ...acc, ...curr }), {})
	})

	const adjustedSupplies = await Promise.all(batchPromises)

	return adjustedSupplies.reduce((acc, curr) => ({ ...acc, ...curr }), {})
}
