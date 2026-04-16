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

const getGeckoIdsFromMetadata = (metadata) => {
	const geckoIds = new Set()

	for (const item of Object.values(metadata ?? {})) {
		if (typeof item?.gecko_id === 'string' && item.gecko_id.trim()) {
			geckoIds.add(item.gecko_id.trim().toLowerCase())
		}
	}

	return geckoIds
}

const getTokenMetadataExtrasByGeckoId = (protocolsMetadata, chainsMetadata) => {
	const extrasByGeckoId = new Map()

	for (const [protocolId, item] of Object.entries(protocolsMetadata ?? {})) {
		if (typeof item?.gecko_id !== 'string' || !item.gecko_id.trim()) continue

		const geckoId = item.gecko_id.trim().toLowerCase()
		const previous = extrasByGeckoId.get(geckoId) ?? {}
		extrasByGeckoId.set(geckoId, {
			...previous,
			...(previous.protocolId ? {} : { protocolId }),
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

const loadPreviousAssignmentsByTokenNk = () => {
	const assignmentsByTokenNk = new Map()

	if (!fs.existsSync(OUTPUT_PATH)) {
		return assignmentsByTokenNk
	}

	const previousData = JSON.parse(fs.readFileSync(OUTPUT_PATH, 'utf8'))
	for (const [key, item] of Object.entries(previousData)) {
		if (typeof item?.token_nk !== 'string' || item.token_nk.length === 0) continue

		const symbolSlug = slug(item.symbol)
		const routeSource = key === symbolSlug ? 'symbol' : 'name'
		assignmentsByTokenNk.set(item.token_nk, { key, routeSource })
	}

	return assignmentsByTokenNk
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

async function main() {
	const [coins, protocolsMetadata, chainsMetadata] = await Promise.all([
		fetchJson(SOURCE_URL),
		fetchJson(PROTOCOLS_URL),
		fetchJson(CHAINS_URL)
	])

	if (!Array.isArray(coins)) {
		throw new Error(`Expected an array from ${SOURCE_URL}`)
	}
	const allowedGeckoIds = new Set([
		...getGeckoIdsFromMetadata(protocolsMetadata),
		...getGeckoIdsFromMetadata(chainsMetadata)
	])
	const extrasByGeckoId = getTokenMetadataExtrasByGeckoId(protocolsMetadata, chainsMetadata)
	const previousAssignmentsByTokenNk = loadPreviousAssignmentsByTokenNk()
	const filteredCoins = []

	let skippedWithoutMatchCount = 0

	for (const item of coins) {
		const geckoId = getCoingeckoId(item.token_nk)
		if (!geckoId || !allowedGeckoIds.has(geckoId)) {
			skippedWithoutMatchCount++
			continue
		}

		filteredCoins.push(item)
	}

	const reservedKeysByTokenNk = new Map()
	const seenKeys = new Set()
	for (const item of filteredCoins) {
		const previousAssignment = previousAssignmentsByTokenNk.get(item.token_nk)
		if (!previousAssignment) continue

		reservedKeysByTokenNk.set(item.token_nk, previousAssignment)
		seenKeys.add(previousAssignment.key)
	}

	const bySlug = {}
	let nameFallbackCount = 0

	for (const [index, item] of filteredCoins.entries()) {
		const preservedAssignment = reservedKeysByTokenNk.get(item.token_nk)
		const symbolSlug = slug(item.symbol)
		const key = preservedAssignment?.key ?? getUniqueKey(item, index, seenKeys)
		const routeSource = preservedAssignment?.routeSource ?? (key === symbolSlug ? 'symbol' : 'name')
		const extras = extrasByGeckoId.get(getCoingeckoId(item.token_nk)) ?? {}

		if (key !== symbolSlug) {
			nameFallbackCount++
		}

		if (!preservedAssignment) {
			seenKeys.add(key)
		}
		bySlug[key] = createTokenRecord(item, routeSource, extras)
	}

	fs.writeFileSync(OUTPUT_PATH, JSON.stringify(bySlug, null, 2) + '\n')

	console.log(`Wrote ${Object.keys(bySlug).length} tokens to ${OUTPUT_PATH}`)
	console.log(`Used fallback key selection for ${nameFallbackCount} tokens`)
	console.log(`Skipped ${skippedWithoutMatchCount} tokens without matching protocol/chain gecko_id`)
}

main().catch((error) => {
	console.error(error)
	process.exit(1)
})
