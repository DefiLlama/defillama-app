// to change metadata info, update this file in server repo:
// https://github.com/DefiLlama/defillama-server/blob/master/defi/src/api2/cron-task/appMetadata.ts

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import dotenv from 'dotenv'

dotenv.config()

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const CACHE_DIR = path.join(__dirname, '../.cache')
const CACHE_FILE = path.join(CACHE_DIR, 'lastPull.json')
const PROTOCOLS_DATA_URL = 'https://api.llama.fi/config/smol/appMetadata-protocols.json'
const CHAINS_DATA_URL = 'https://api.llama.fi/config/smol/appMetadata-chains.json'
const CATEGORIES_AND_TAGS_DATA_URL = 'https://api.llama.fi/config/smol/appMetadata-categoriesAndTags.json'
const CEXS_DATA_URL = 'https://api.llama.fi/cexs'
const FIVE_MINUTES = 5 * 60 * 1000
let defillamaPages
try {
	const fileContent = fs.readFileSync(path.join('public', 'pages.json'), 'utf8')
	defillamaPages = JSON.parse(fileContent)
} catch (error) {
	console.log('Could not load pages.json, using empty structure')
	defillamaPages = {
		Metrics: [],
		Tools: []
	}
}

const fetchJson = async (url) => fetch(url).then((res) => res.json())

async function pullData() {
	const endAt = Date.now()
	const startAt = endAt - 1000 * 60 * 60 * 24 * 90

	try {
		const [protocols, chains, categoriesAndTags, cexs, tastyMetrics] = await Promise.all([
			fetchJson(PROTOCOLS_DATA_URL),
			fetchJson(CHAINS_DATA_URL),
			fetchJson(CATEGORIES_AND_TAGS_DATA_URL),
			fetchJson(CEXS_DATA_URL)
				.then((data) => data.cexs ?? [])
				.catch(() => []),
			fetch(`${process.env.TASTY_API_URL}/metrics?startAt=${startAt}&endAt=${endAt}&unit=day&type=url`, {
				headers: {
					Authorization: `Bearer ${process.env.TASTY_API_KEY}`
				}
			})
				.then((res) => res.json())
				.then((res) => {
					const final = {}
					for (const xy of res) {
						final[xy.x] = xy.y
					}
					return final
				})
				.catch((e) => {
					console.log('Error fetching tasty metrics', e)
					return {}
				})
		])

		if (!fs.existsSync(CACHE_DIR)) {
			fs.mkdirSync(CACHE_DIR)
		}

		fs.writeFileSync(path.join(CACHE_DIR, 'chains.json'), JSON.stringify(chains))
		fs.writeFileSync(path.join(CACHE_DIR, 'protocols.json'), JSON.stringify(protocols))
		fs.writeFileSync(path.join(CACHE_DIR, 'categoriesAndTags.json'), JSON.stringify(categoriesAndTags))
		fs.writeFileSync(path.join(CACHE_DIR, 'cexs.json'), JSON.stringify(cexs))
		fs.writeFileSync(CACHE_FILE, JSON.stringify({ lastPull: Date.now() }, null, 2))

		// Group routes by category and sort each category by tasty metrics
		const groupAndSortByCategory = (items) => {
			const grouped = {}
			for (const item of items) {
				const category = item.category || 'Others'
				if (!grouped[category]) {
					grouped[category] = 0
				}
				grouped[category] = (grouped[category] ?? 0) + (tastyMetrics[item.route] ?? 0)
			}

			const topCategories = [
				'Combined Metrics',
				'Total Value Locked',
				'Fees & Revenue',
				'Volume',
				'Stablecoins',
				'Token',
				'Borrow Aggregator',
				'Yields'
			]

			const otherCategories = Object.entries(grouped)
				.filter(([category]) => !topCategories.includes(category))
				.sort((a, b) => b[1] - a[1])
				.map(([category]) => category)

			const pagesByGroup = [...topCategories, ...otherCategories].reduce((acc, category) => {
				const pages = items
					.filter((item) => (item.category || 'Others') === category)
					.sort((a, b) => (tastyMetrics[b.route] ?? 0) - (tastyMetrics[a.route] ?? 0))
					.map((item) => ({
						name: item.name,
						route: item.route,
						category: item.category ?? 'Others',
						description: item.description ?? '',
						...(item.totalTrackedKey ? { totalTrackedKey: item.totalTrackedKey } : {}),
						...(item.keys ? { keys: item.keys } : {}),
						...(item.tags ? { tags: item.tags } : {}),
						...(item.tab ? { tab: item.tab } : {})
					}))
				acc.push(...pages)
				return acc
			}, [])
			return pagesByGroup
		}

		const finalDefillamaPages = {
			Metrics: groupAndSortByCategory(defillamaPages['Metrics']),
			Tools: defillamaPages['Tools'].sort((a, b) => (tastyMetrics[b.route] ?? 0) - (tastyMetrics[a.route] ?? 0))
		}

		fs.writeFileSync(path.join('public', 'pages.json'), JSON.stringify(finalDefillamaPages, null, 2))

		console.log('Data pulled and cached successfully.')
		return true
	} catch (error) {
		console.error('Error pulling data:', error)
		process.exit(1) // Exit with error code
	}
}

function shouldPullData() {
	if (!fs.existsSync(CACHE_FILE)) {
		return true
	}

	const cacheData = JSON.parse(fs.readFileSync(CACHE_FILE, 'utf-8'))
	const lastPull = cacheData.lastPull

	return Date.now() - lastPull > FIVE_MINUTES
}

if (shouldPullData()) {
	pullData()
		.then(() => {
			process.exit(0) // Exit successfully
		})
		.catch((error) => {
			console.error('Fatal error:', error)
			process.exit(1) // Exit with error code
		})
} else {
	console.log('Metadata was pulled recently. No need to pull again.')
	process.exit(0) // Exit successfully
}
