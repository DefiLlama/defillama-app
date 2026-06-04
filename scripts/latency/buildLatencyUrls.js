#!/usr/bin/env node
// Build a per-hour latency-test URL list.
//
// Standalone pages: every route without a [param] segment is emitted.
// Dynamic templates ([param]): the upstream candidate list is fetched, the
// top-traffic entries from traffic/30d.csv + traffic/last-3-days.csv are
// removed (those are warm in cache and uninteresting), and 3 random
// long-tail entries are sampled per template.
//
// Run: node scripts/latency/buildLatencyUrls.js > urls.txt
// Cron: 0 * * * * cd /repo && node scripts/latency/buildLatencyUrls.js > /tmp/latency-urls.txt

'use strict'

const fs = require('node:fs')
const path = require('node:path')

const BASE_URL = process.env.LATENCY_BASE_URL || 'https://defillama.com'
const SAMPLES_PER_TEMPLATE = Number(process.env.LATENCY_SAMPLES || 3)
const REPO_ROOT = path.resolve(__dirname, '..', '..')
const TRAFFIC_FILES = ['traffic/30d.csv', 'traffic/last-3-days.csv']
const SEED = process.env.LATENCY_SEED || new Date().toISOString().slice(0, 13) // hourly bucket

// ---------- Standalone routes ---------------------------------------------
// Every public page that has no [param] segment. Auth-gated, admin, sitemap
// XML, redirect-only, and developer-preview pages are intentionally omitted.
const STANDALONE = [
	'/',
	'/about',
	'/active-loans',
	'/airdrop-directory',
	'/airdrops',
	'/app-fees/chains',
	'/app-revenue/chains',
	'/banks',
	'/borrow',
	'/borrow/advanced',
	'/bridge-aggregators',
	'/bridge-aggregators/chains',
	'/bridge-transactions',
	'/bridged',
	'/bridges',
	'/bridges/chains',
	'/calendar',
	'/categories',
	'/cexs',
	'/chains',
	'/compare-chains',
	'/compare-protocols',
	'/compare-tokens',
	'/correlation',
	'/data-definitions',
	'/dex-aggregators',
	'/dex-aggregators/chains',
	'/dexs',
	'/dexs/chains',
	'/digital-asset-treasuries',
	'/directory',
	'/downloads',
	'/earnings',
	'/entities',
	'/etfs',
	'/expenses',
	'/fdv',
	'/fees',
	'/fees/chains',
	'/forks',
	'/governance',
	'/hacks',
	'/hacks/total-value-lost',
	'/holders-revenue',
	'/holders-revenue/chains',
	'/languages',
	'/liquidations',
	'/liquidity',
	'/lst',
	'/mcaps',
	'/metrics',
	'/narrative-tracker',
	'/net-project-treasury',
	'/nfts',
	'/nfts/chains',
	'/nfts/earnings',
	'/nfts/marketplaces',
	'/normalized-volume',
	'/normalized-volume/chains',
	'/open-interest',
	'/options/notional-volume',
	'/options/notional-volume/chains',
	'/options/premium-volume',
	'/options/premium-volume/chains',
	'/oracles',
	'/outstanding-fdv',
	'/perps',
	'/perps-aggregators',
	'/perps-aggregators/chains',
	'/perps/chains',
	'/pf',
	'/pool2',
	'/press',
	'/privacy-policy',
	'/pro',
	'/protocols',
	'/ps',
	'/raises',
	'/raises/investors',
	'/recent',
	'/reports',
	'/research',
	'/revenue',
	'/revenue/chains',
	'/rev/chains',
	'/rwa',
	'/rwa/asset-groups',
	'/rwa/categories',
	'/rwa/chains',
	'/rwa/perps',
	'/rwa/perps/asset-groups',
	'/rwa/perps/forex',
	'/rwa/perps/venues',
	'/rwa/platforms',
	'/safe-harbor-agreements',
	'/stablecoins',
	'/stablecoins/chains',
	'/support',
	'/terms',
	'/token-pnl',
	'/token-prices',
	'/token-rights',
	'/token-usage',
	'/tools',
	'/top-gainers-and-losers',
	'/top-protocols',
	'/total-staked',
	'/treasuries',
	'/trending-contracts',
	'/unlocks',
	'/unlocks/calendar',
	'/yields',
	'/yields/halal',
	'/yields/loop',
	'/yields/overview',
	'/yields/projects',
	'/yields/stablecoins',
	'/yields/strategy',
	'/yields/strategy-long-short'
]

// ---------- Dynamic templates ---------------------------------------------
// Each entry shares a single fetcher across one or more route patterns. The
// fetcher returns an array of slugs/ids in *popularity order* (most-popular
// first) when the upstream provides that ordering — the sampler then biases
// toward the tail of that list.
//
// Routes pointing at protocol slugs intentionally use the global protocol
// list rather than the per-feature subset; if a slug doesn't have that
// feature the page will 404, which is still a useful latency datapoint.

const SOURCES = {
	protocols: async () => {
		const data = await fetchJson('https://api.llama.fi/protocols')
		// /protocols returns largest-TVL first, so reverse for long-tail bias.
		return data
			.filter((p) => p && typeof p.name === 'string')
			.map((p) => sluggify(p.name))
			.reverse()
	},
	chains: async () => {
		const data = await fetchJson('https://api.llama.fi/chains')
		return data
			.filter((c) => c && typeof c.name === 'string')
			.sort((a, b) => (a.tvl || 0) - (b.tvl || 0))
			.map((c) => sluggify(c.name))
	},
	protocolCategories: async () => {
		const meta = await fetchJson('https://api.llama.fi/config/smol/appMetadata-categoriesAndTags.json')
		const out = []
		for (const c of meta.categories || []) out.push(sluggify(c))
		for (const t of meta.tags || []) out.push(sluggify(t))
		return out
	},
	chainCategories: async () => {
		const r = await fetchJson('https://api.llama.fi/chains2')
		return (r.categories || []).map(sluggify)
	},
	bridges: async () => {
		const r = await fetchJson('https://bridges.llama.fi/bridges?includeChains=true')
		return (r.bridges || []).map((b) => sluggify(b.displayName || b.name)).filter(Boolean)
	},
	bridgeChains: async () => {
		const r = await fetchJson('https://bridges.llama.fi/bridges?includeChains=true')
		const chains = new Set()
		for (const b of r.bridges || []) {
			for (const c of b.chains || []) chains.add(sluggify(c))
			if (b.destinationChain) chains.add(sluggify(b.destinationChain))
		}
		return [...chains]
	},
	cexs: async () => {
		const r = await fetchJson('https://api.llama.fi/cexs')
		// /cexs returns cexs sorted by cleanCex volume desc — reverse for tail.
		return (r.cexs || [])
			.map((c) => sluggify(c.slug || c.name))
			.filter(Boolean)
			.reverse()
	},
	stablecoinAssets: async () => {
		const r = await fetchJson('https://stablecoins.llama.fi/stablecoins')
		return (r.peggedAssets || [])
			.sort((a, b) => (a.circulating?.peggedUSD || 0) - (b.circulating?.peggedUSD || 0))
			.map((a) => sluggify(a.symbol || a.name))
			.filter(Boolean)
	},
	yieldPools: async () => {
		const r = await fetchJson('https://yields.llama.fi/pools')
		return (r.data || [])
			.sort((a, b) => (a.tvlUsd || 0) - (b.tvlUsd || 0))
			.map((p) => p.pool)
			.filter(Boolean)
	},
	tokens: async () => {
		const list = await fetchJson('https://defillama-datasets.llama.fi/tokenlist/sorted.json')
		// sorted by market cap desc → reverse for tail
		return list
			.map((t) => t && (t.symbol || t.name))
			.filter(Boolean)
			.map(sluggify)
			.reverse()
	},
	forks: async () => {
		const r = await fetchJson('https://api.llama.fi/v2/metrics/fork')
		return Object.keys(r).map(sluggify).filter(Boolean)
	},
	oracles: async () => {
		const r = await fetchJson('https://api.llama.fi/v2/metrics/oracle')
		const names = new Set()
		for (const k of Object.keys(r.chainsByOracle || {})) names.add(k)
		for (const k of Object.keys(r.oraclesTVS || r.tvs || {})) names.add(k)
		return [...names].map(sluggify).filter(Boolean)
	},
	oracleChains: async () => {
		// (oracle, chain) pairs — flattened for /oracles/[oracle]/[chain]
		const r = await fetchJson('https://api.llama.fi/v2/metrics/oracle')
		const pairs = []
		for (const [oracle, chains] of Object.entries(r.chainsByOracle || {})) {
			for (const ch of chains || []) pairs.push(`${sluggify(oracle)}/${sluggify(ch)}`)
		}
		return pairs
	},
	governanceProjects: async () => {
		const urls = [
			'https://defillama-datasets.llama.fi/governance-cache/overview/snapshot.json',
			'https://defillama-datasets.llama.fi/governance-cache/overview/compound.json',
			'https://defillama-datasets.llama.fi/governance-cache/overview/tally.json'
		]
		const seen = new Set()
		for (const url of urls) {
			let data
			try {
				data = await fetchJson(url)
			} catch {
				continue
			}
			for (const entry of Object.values(data || {})) {
				const name = entry && (entry.name || entry.title)
				if (name) seen.add(sluggify(name))
			}
		}
		return [...seen]
	},
	raisesInvestors: async () => {
		const r = await fetchJson('https://api.llama.fi/raises')
		const investors = new Set()
		for (const raise of r.raises || []) {
			for (const inv of raise.leadInvestors || []) investors.add(sluggify(inv))
			for (const inv of raise.otherInvestors || []) investors.add(sluggify(inv))
		}
		return [...investors].filter(Boolean)
	},
	narrativeCategories: async () => {
		const r = await fetchJson('https://fdv-server.llama.fi/info')
		return (Array.isArray(r) ? r : []).map((c) => c.id).filter(Boolean)
	},
	rwaAssets: async () => (await fetchJson('https://api.llama.fi/rwa/list')).canonicalMarketIds || [],
	rwaAssetGroups: async () =>
		((await fetchJson('https://api.llama.fi/rwa/list')).assetGroups || []).map(sluggify),
	rwaCategories: async () => ((await fetchJson('https://api.llama.fi/rwa/list')).categories || []).map(sluggify),
	rwaChains: async () => ((await fetchJson('https://api.llama.fi/rwa/list')).chains || []).map(sluggify),
	rwaPlatforms: async () => ((await fetchJson('https://api.llama.fi/rwa/list')).platforms || []).map(sluggify),
	rwaPerpsAssetGroups: async () =>
		((await fetchJson('https://api.llama.fi/rwa-perps/list')).assetGroups || []).map(sluggify),
	rwaPerpsContracts: async () => ((await fetchJson('https://api.llama.fi/rwa-perps/list')).contracts || []).map(sluggify),
	rwaPerpsVenues: async () => ((await fetchJson('https://api.llama.fi/rwa-perps/list')).venues || []).map(sluggify),
	digitalAssetCompanies: async () => {
		const r = await fetchJson('https://api.llama.fi/dat/institutions')
		const slugs = new Set()
		for (const x of r.institutions || r.data || []) {
			if (x && (x.ticker || x.company || x.name)) slugs.add(sluggify(x.ticker || x.company || x.name))
		}
		return [...slugs]
	},
	digitalAssetAssets: async () => {
		const r = await fetchJson('https://api.llama.fi/dat/institutions')
		const slugs = new Set()
		for (const a of Object.keys(r.assetMetadata || {})) slugs.add(sluggify(a))
		return [...slugs]
	},
	equityTickers: async () => {
		const r = await fetchJson('https://api.llama.fi/equities/v1/companies')
		return (Array.isArray(r) ? r : []).map((c) => c && c.ticker).filter(Boolean).map((t) => t.toLowerCase())
	},
	liquidationsProtocols: async () => {
		const r = await fetchJson('https://api.llama.fi/liquidations/all')
		return Object.keys(r || {}).map(sluggify).filter(Boolean)
	},
	liquidationsProtocolChain: async () => {
		const r = await fetchJson('https://api.llama.fi/liquidations/all')
		const pairs = []
		for (const [proto, info] of Object.entries(r || {})) {
			const chains = (info && (info.chains || info.positions)) || {}
			for (const chain of Object.keys(chains)) pairs.push(`${sluggify(proto)}/${sluggify(chain)}`)
		}
		return pairs
	}
}

// Map a route template → which source supplies its parameter values.
// `multi` means the source already returns `a/b` path fragments.
const TEMPLATES = [
	{ pattern: '/protocol/{x}', source: 'protocols' },
	{ pattern: '/protocol/tvl/{x}', source: 'protocols' },
	{ pattern: '/protocol/treasury/{x}', source: 'protocols' },
	{ pattern: '/protocol/unlocks/{x}', source: 'protocols' },
	{ pattern: '/protocol/yields/{x}', source: 'protocols' },
	{ pattern: '/protocol/stablecoins/{x}', source: 'protocols' },
	{ pattern: '/protocol/fees/{x}', source: 'protocols' },
	{ pattern: '/protocol/dexs/{x}', source: 'protocols' },
	{ pattern: '/protocol/perps/{x}', source: 'protocols' },
	{ pattern: '/protocol/options/{x}', source: 'protocols' },
	{ pattern: '/protocol/bridges/{x}', source: 'protocols' },
	{ pattern: '/protocol/bridge-aggregators/{x}', source: 'protocols' },
	{ pattern: '/protocol/dex-aggregators/{x}', source: 'protocols' },
	{ pattern: '/protocol/perps-aggregators/{x}', source: 'protocols' },
	{ pattern: '/protocol/forks/{x}', source: 'protocols' },
	{ pattern: '/protocol/governance/{x}', source: 'protocols' },
	{ pattern: '/protocol/active-loans/{x}', source: 'protocols' },
	{ pattern: '/protocol/token-rights/{x}', source: 'protocols' },
	{ pattern: '/chart/protocol/{x}', source: 'protocols' },
	{ pattern: '/unlocks/{x}', source: 'protocols' },

	{ pattern: '/chain/{x}', source: 'chains' },
	{ pattern: '/chart/chain/{x}', source: 'chains' },
	{ pattern: '/active-loans/chain/{x}', source: 'chains' },
	{ pattern: '/bridge-aggregators/chain/{x}', source: 'chains' },
	{ pattern: '/bridged/{x}', source: 'chains' },
	{ pattern: '/dex-aggregators/chain/{x}', source: 'chains' },
	{ pattern: '/dexs/chain/{x}', source: 'chains' },
	{ pattern: '/earnings/chain/{x}', source: 'chains' },
	{ pattern: '/fdv/chain/{x}', source: 'chains' },
	{ pattern: '/fees/chain/{x}', source: 'chains' },
	{ pattern: '/holders-revenue/chain/{x}', source: 'chains' },
	{ pattern: '/mcaps/chain/{x}', source: 'chains' },
	{ pattern: '/normalized-volume/chain/{x}', source: 'chains' },
	{ pattern: '/open-interest/chain/{x}', source: 'chains' },
	{ pattern: '/options/notional-volume/chain/{x}', source: 'chains' },
	{ pattern: '/options/premium-volume/chain/{x}', source: 'chains' },
	{ pattern: '/oracles/chain/{x}', source: 'chains' },
	{ pattern: '/outstanding-fdv/chain/{x}', source: 'chains' },
	{ pattern: '/perps-aggregators/chain/{x}', source: 'chains' },
	{ pattern: '/perps/chain/{x}', source: 'chains' },
	{ pattern: '/pf/chain/{x}', source: 'chains' },
	{ pattern: '/pool2/chain/{x}', source: 'chains' },
	{ pattern: '/ps/chain/{x}', source: 'chains' },
	{ pattern: '/revenue/chain/{x}', source: 'chains' },
	{ pattern: '/token-prices/chain/{x}', source: 'chains' },
	{ pattern: '/total-staked/chain/{x}', source: 'chains' },
	{ pattern: '/stablecoins/{x}', source: 'chains' },

	{ pattern: '/protocols/{x}', source: 'protocolCategories' },
	{ pattern: '/chains/{x}', source: 'chainCategories' },

	{ pattern: '/bridge/{x}', source: 'bridges' },
	{ pattern: '/bridges/{x}', source: 'bridgeChains' },

	{ pattern: '/cex/{x}', source: 'cexs' },
	{ pattern: '/cex/markets/{x}', source: 'cexs' },
	{ pattern: '/cex/assets/{x}', source: 'cexs' },
	{ pattern: '/cex/stablecoins/{x}', source: 'cexs' },

	{ pattern: '/stablecoin/{x}', source: 'stablecoinAssets' },

	{ pattern: '/yields/pool/{x}', source: 'yieldPools' },

	{ pattern: '/token/{x}', source: 'tokens' },

	{ pattern: '/forks/{x}', source: 'forks' },
	{ pattern: '/oracles/{x}', source: 'oracles' },
	{ pattern: '/oracles/{x}/{y}', source: 'oracleChains', multi: true },

	{ pattern: '/governance/{x}', source: 'governanceProjects' },
	{ pattern: '/raises/{x}', source: 'raisesInvestors' },
	{ pattern: '/narrative-tracker/{x}', source: 'narrativeCategories' },

	{ pattern: '/rwa/asset/{x}', source: 'rwaAssets' },
	{ pattern: '/rwa/asset-group/{x}', source: 'rwaAssetGroups' },
	{ pattern: '/rwa/category/{x}', source: 'rwaCategories' },
	{ pattern: '/rwa/chain/{x}', source: 'rwaChains' },
	{ pattern: '/rwa/platform/{x}', source: 'rwaPlatforms' },
	{ pattern: '/rwa/perps/asset-group/{x}', source: 'rwaPerpsAssetGroups' },
	{ pattern: '/rwa/perps/contract/{x}', source: 'rwaPerpsContracts' },
	{ pattern: '/rwa/perps/venue/{x}', source: 'rwaPerpsVenues' },

	{ pattern: '/digital-asset-treasury/{x}', source: 'digitalAssetCompanies' },
	{ pattern: '/digital-asset-treasuries/{x}', source: 'digitalAssetAssets' },

	{ pattern: '/equities/{x}', source: 'equityTickers' },

	{ pattern: '/liquidations/{x}', source: 'liquidationsProtocols' },
	{ pattern: '/liquidations/{x}/{y}', source: 'liquidationsProtocolChain', multi: true }
]

// ---------- Helpers --------------------------------------------------------

function sluggify(name) {
	return String(name || '')
		.toLowerCase()
		.replace(/'/g, '')
		.replace(/ /g, '-')
}

async function fetchJson(url) {
	const res = await fetch(url, { headers: { 'user-agent': 'defillama-latency-urls/1.0' } })
	if (!res.ok) throw new Error(`${url} -> HTTP ${res.status}`)
	return res.json()
}

function loadPopular() {
	const popular = new Set()
	for (const f of TRAFFIC_FILES) {
		const p = path.join(REPO_ROOT, f)
		if (!fs.existsSync(p)) continue
		const lines = fs.readFileSync(p, 'utf8').split(/\r?\n/).slice(1)
		for (const line of lines) {
			const route = line.split(',')[0]
			if (!route) continue
			popular.add(route.trim().toLowerCase())
		}
	}
	return popular
}

// xmur3 + mulberry32 — small, deterministic, no deps.
function rngFromSeed(seed) {
	let h = 1779033703 ^ seed.length
	for (let i = 0; i < seed.length; i++) {
		h = Math.imul(h ^ seed.charCodeAt(i), 3432918353)
		h = (h << 13) | (h >>> 19)
	}
	let s = (h ^= h >>> 16) >>> 0
	return () => {
		s |= 0
		s = (s + 0x6d2b79f5) | 0
		let t = Math.imul(s ^ (s >>> 15), 1 | s)
		t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296
	}
}

// Pick up to `n` random entries from the *tail half* of `candidates`. The
// caller orders candidates least-popular first when known, so this biases
// strongly toward never-visited pages while still leaving some chance of
// hitting mid-tail entries.
function sampleLongTail(candidates, popular, n, seed) {
	const filtered = candidates.filter((slug) => slug && !popular.has(slug.toLowerCase()))
	if (filtered.length === 0) return []
	const tailStart = Math.floor(filtered.length / 2)
	const pool = filtered.length > 2 * n ? filtered.slice(tailStart) : filtered
	const rng = rngFromSeed(seed)
	const picks = new Set()
	while (picks.size < Math.min(n, pool.length)) {
		picks.add(pool[Math.floor(rng() * pool.length)])
	}
	return [...picks]
}

function templateToUrl(pattern, value) {
	if (pattern.includes('{y}')) {
		// `value` is "x/y"
		const [x, y] = value.split('/')
		return pattern.replace('{x}', encodeURIComponent(x)).replace('{y}', encodeURIComponent(y))
	}
	return pattern.replace('{x}', encodeURIComponent(value))
}

// ---------- Main ----------------------------------------------------------

async function main() {
	const popular = loadPopular()

	// Cache each source once (multiple templates share sources).
	const sourceCache = new Map()
	const getSource = async (name) => {
		if (!sourceCache.has(name)) sourceCache.set(name, SOURCES[name]())
		return sourceCache.get(name)
	}

	const urls = []

	for (const route of STANDALONE) {
		urls.push(`${BASE_URL}${route}`)
	}

	for (const t of TEMPLATES) {
		let candidates
		try {
			candidates = await getSource(t.source)
		} catch (err) {
			process.stderr.write(`source ${t.source} failed: ${err.message}\n`)
			continue
		}
		const pattern = t.pattern
		// Pre-filter by checking the rendered path against the popular set
		// (popular slugs may appear there even if our source list ordering
		// doesn't already deprioritize them).
		const checked = candidates.filter((value) => {
			const candidatePath = templateToUrl(pattern, value)
			return !popular.has(candidatePath.toLowerCase())
		})
		const sampled = sampleLongTail(checked, new Set(), SAMPLES_PER_TEMPLATE, `${SEED}:${pattern}`)
		for (const value of sampled) urls.push(`${BASE_URL}${templateToUrl(pattern, value)}`)
	}

	process.stdout.write(urls.join('\n') + '\n')
	process.stderr.write(
		`emitted ${urls.length} URLs (${STANDALONE.length} standalone, ${urls.length - STANDALONE.length} dynamic samples) seed=${SEED}\n`
	)
}

main().catch((err) => {
	process.stderr.write(`fatal: ${err && err.stack ? err.stack : err}\n`)
	process.exit(1)
})
