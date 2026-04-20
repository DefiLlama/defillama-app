import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const OUTPUT_PATH = path.join(__dirname, '../public/tokens.json')
const SOURCE_URL = 'https://ask.llama.fi/coins'
const PROTOCOLS_URL = 'https://api.llama.fi/config/smol/appMetadata-protocols.json'
const CHAINS_URL = 'https://api.llama.fi/config/smol/appMetadata-chains.json'

const slug = (value = '') =>
	String(value ?? '')
		.trim()
		.toLowerCase()
		.replace(/ /g, '-')
		.replace(/'/g, '')

const getCoingeckoId = (tokenNk) => {
	if (typeof tokenNk !== 'string') return null
	if (!tokenNk.startsWith('coingecko:')) return null

	const geckoId = tokenNk.slice('coingecko:'.length).trim().toLowerCase()
	return geckoId || null
}

const shouldPreferProtocolId = (currentProtocolId, nextProtocolId) => {
	if (!currentProtocolId) return true
	if (!nextProtocolId) return false

	const currentIsParent = currentProtocolId.startsWith('parent#')
	const nextIsParent = nextProtocolId.startsWith('parent#')

	if (nextIsParent && !currentIsParent) {
		return true
	}

	return false
}

const getTokenMetadataExtrasByGeckoId = (protocolsMetadata, chainsMetadata) => {
	const extrasByGeckoId = new Map()

	for (const [protocolId, item] of Object.entries(protocolsMetadata ?? {})) {
		if (typeof item?.gecko_id !== 'string' || !item.gecko_id.trim()) continue

		const geckoId = item.gecko_id.trim().toLowerCase()
		const previous = extrasByGeckoId.get(geckoId) ?? {}
		extrasByGeckoId.set(geckoId, {
			...previous,
			...(shouldPreferProtocolId(previous.protocolId, protocolId) ? { protocolId } : {}),
			...(item?.tokenRights ? { tokenRights: true } : {})
		})
	}

	for (const item of Object.values(chainsMetadata ?? {})) {
		if (typeof item?.gecko_id !== 'string' || !item.gecko_id.trim()) continue

		const geckoId = item.gecko_id.trim().toLowerCase()
		const previous = extrasByGeckoId.get(geckoId) ?? {}
		extrasByGeckoId.set(geckoId, {
			...previous,
			...(previous.chainId || typeof item?.id !== 'string' || !item.id ? {} : { chainId: item.id }),
			...(item?.tokenRights ? { tokenRights: true } : {})
		})
	}

	return extrasByGeckoId
}

const inferRouteSource = (key, item) => {
	if (key === slug(item?.symbol)) return 'symbol'
	return 'name'
}

const loadPreviousTokens = () => {
	const previousEntries = []

	if (!fs.existsSync(OUTPUT_PATH)) {
		return previousEntries
	}

	const previousData = JSON.parse(fs.readFileSync(OUTPUT_PATH, 'utf8'))
	for (const [key, item] of Object.entries(previousData)) {
		if (typeof item?.token_nk !== 'string' || item.token_nk.length === 0) continue
		previousEntries.push([key, item])
	}

	return previousEntries
}

const fetchJson = async (url) => {
	const response = await fetch(url)
	if (!response.ok) {
		throw new Error(`Failed to fetch ${url}: ${response.status} ${response.statusText}`)
	}

	return response.json()
}

const getUniqueKey = (item, index, existingKeys) => {
	const symbolSlug = slug(item.symbol)
	const nameSlug = slug(item.name)
	const fallbackId = slug(item.token_nk) || `token-${index + 1}`

	if (symbolSlug && !existingKeys.has(symbolSlug)) {
		return symbolSlug
	}

	if (nameSlug && !existingKeys.has(nameSlug)) {
		return nameSlug
	}

	let uniqueKey = `${nameSlug || symbolSlug || 'token'}-${fallbackId}`
	let suffix = 2
	while (existingKeys.has(uniqueKey)) {
		uniqueKey = `${nameSlug || symbolSlug || 'token'}-${fallbackId}-${suffix}`
		suffix++
	}

	return uniqueKey
}

const createTokenRecord = (item, routeSource, extras = {}) => ({
	name: item.name,
	symbol: item.symbol,
	token_nk: item.token_nk,
	route: `/token/${encodeURIComponent(routeSource === 'symbol' ? item.symbol : item.name)}`,
	is_yields: Boolean(item.on_yields),
	mcap_rank: item.mcap_rank,
	...extras
})

export const buildTokenDirectory = ({ coins, protocolsMetadata, chainsMetadata, previousTokens = [] }) => {
	if (!Array.isArray(coins)) {
		throw new Error('Expected coins to be an array')
	}

	const extrasByGeckoId = getTokenMetadataExtrasByGeckoId(protocolsMetadata, chainsMetadata)
	const uniqueCoins = []
	const seenTokenNks = new Set()
	let skippedDuplicateTokenNkCount = 0

	for (const item of coins) {
		if (seenTokenNks.has(item.token_nk)) {
			skippedDuplicateTokenNkCount++
			continue
		}

		seenTokenNks.add(item.token_nk)
		uniqueCoins.push(item)
	}

	const nextTokensByTokenNk = new Map()
	let includedWithoutMetadataCount = 0
	for (const item of uniqueCoins) {
		const extras = extrasByGeckoId.get(getCoingeckoId(item.token_nk)) ?? {}
		if (Object.keys(extras).length === 0) {
			includedWithoutMetadataCount++
		}
		nextTokensByTokenNk.set(item.token_nk, { item, extras })
	}

	const bySlug = {}
	const seenKeys = new Set()
	const consumedTokenNks = new Set()
	let nameFallbackCount = 0
	let preservedMissingTokenCount = 0

	for (const [key, previousItem] of previousTokens) {
		const tokenNk = previousItem.token_nk
		const nextToken = nextTokensByTokenNk.get(tokenNk)

		seenKeys.add(key)

		if (!nextToken) {
			bySlug[key] = previousItem
			preservedMissingTokenCount++
			continue
		}

		const routeSource = inferRouteSource(key, previousItem)
		bySlug[key] = createTokenRecord(nextToken.item, routeSource, nextToken.extras)
		consumedTokenNks.add(tokenNk)
	}

	for (const [index, item] of uniqueCoins.entries()) {
		if (consumedTokenNks.has(item.token_nk)) continue

		const symbolSlug = slug(item.symbol)
		const key = getUniqueKey(item, index, seenKeys)
		const routeSource = inferRouteSource(key, item)
		const extras = nextTokensByTokenNk.get(item.token_nk)?.extras ?? {}

		if (key !== symbolSlug) {
			nameFallbackCount++
		}

		bySlug[key] = createTokenRecord(item, routeSource, extras)
		seenKeys.add(key)
	}

	return {
		bySlug,
		stats: {
			totalTokens: Object.keys(bySlug).length,
			nameFallbackCount,
			includedWithoutMetadataCount,
			skippedDuplicateTokenNkCount,
			preservedMissingTokenCount
		}
	}
}

async function main() {
	const [coins, protocolsMetadata, chainsMetadata] = await Promise.all([
		fetchJson(SOURCE_URL),
		fetchJson(PROTOCOLS_URL),
		fetchJson(CHAINS_URL)
	])

	if (!Array.isArray(coins)) {
		throw new Error(`Expected an array from ${SOURCE_URL}`)
	}

	const previousTokens = loadPreviousTokens()
	const { bySlug, stats } = buildTokenDirectory({
		coins,
		protocolsMetadata,
		chainsMetadata,
		previousTokens
	})

	fs.writeFileSync(OUTPUT_PATH, JSON.stringify(bySlug) + '\n')

	console.log(`Wrote ${stats.totalTokens} tokens to ${OUTPUT_PATH}`)
	console.log(`Used fallback key selection for ${stats.nameFallbackCount} tokens`)
	console.log(`Included ${stats.includedWithoutMetadataCount} tokens without protocol/chain metadata`)
	console.log(`Skipped ${stats.skippedDuplicateTokenNkCount} duplicate token_nk rows`)
	console.log(`Preserved ${stats.preservedMissingTokenCount} existing tokens missing from the current feed`)
}

const isDirectRun = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)

if (isDirectRun) {
	main().catch((error) => {
		console.error(error)
		process.exit(1)
	})
}
