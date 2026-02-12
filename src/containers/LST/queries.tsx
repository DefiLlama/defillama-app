import { preparePieChartData } from '~/components/ECharts/formatters'
import { formatNum, formattedNum, getNDistinctColors, slug } from '~/utils'
import { fetchEthPrice, fetchLsdRates, fetchProtocolDetail, fetchProtocols, fetchYieldPools } from './api'
import type { ILsdRateApiItem, IProtocolDetailApiItem, IYieldPoolApiItem } from './api.types'
import type { ILSTTokenRow, InflowsChartData, LSTOverviewProps } from './types'

const roundDate = (ts: number): number => Math.floor(ts / 86400) * 86400

function getETHValue(obj: Record<string, number>): number {
	let eth = 0
	for (const [key, value] of Object.entries(obj)) {
		if (key.includes('ETH') && value > eth) {
			eth = value
		}
	}
	return eth
}

const EXCLUDED_PROTOCOLS = new Set(['StakeHound', 'Genius', 'SharedStake', 'VaultLayer'])

const PROTOCOL_NAME_OVERRIDES: Record<string, string> = {
	'binance-staked-eth': 'Binance staked ETH',
	'bedrock-unieth': 'Bedrock uniETH',
	'mantle-staked-eth': 'Mantle Staked ETH',
	'dinero-(pirex-eth)': 'Dinero (Pirex ETH)',
	'mev-protocol': 'MEV Protocol',
	'crypto.com-staked-eth': 'Crypto.com Liquid Staking',
	'dinero-(pxeth)': 'Dinero (pxETH)'
}

function formatPoolName(project: string): string {
	return project
		.split('-')
		.map((i) =>
			i === 'stakewise' ? 'StakeWise' : i === 'eth' ? i.toUpperCase() : i.charAt(0).toUpperCase() + i.slice(1)
		)
		.join(' ')
}

interface PoolWithName extends IYieldPoolApiItem {
	name: string
}

export async function getLSDPageData(): Promise<LSTOverviewProps> {
	const [{ protocols }, { data: pools }, lsdRates, ethPrice] = await Promise.all([
		fetchProtocols(),
		fetchYieldPools(),
		fetchLsdRates(),
		fetchEthPrice()
	])

	// filter for LSDs
	const lsdProtocols = protocols
		.filter((p) => p.category === 'Liquid Staking' && p.chains.includes('Ethereum'))
		.map((p) => p.name)
		.filter((p) => !EXCLUDED_PROTOCOLS.has(p))
		.concat('Crypto.com Liquid Staking')

	// get historical data
	const lsdProtocolsSlug = lsdProtocols.map((p) => slug(p))
	const lsdProtocolsSlugSet = new Set(lsdProtocolsSlug)
	const chartData: IProtocolDetailApiItem[] = await Promise.all(lsdProtocolsSlug.map((p) => fetchProtocolDetail(p)))

	const cryptoComPool = pools.find((i) => i.project === 'crypto.com-staked-eth')
	const lsdApy: PoolWithName[] = pools
		.filter((p) => lsdProtocolsSlugSet.has(p.project) && p.chain === 'Ethereum' && p.symbol.includes('ETH'))
		.concat(cryptoComPool ? [cryptoComPool] : [])
		.map((p) => ({
			...p,
			name: PROTOCOL_NAME_OVERRIDES[p.project] ?? formatPoolName(p.project)
		}))

	const allColors = getNDistinctColors(lsdProtocols.length)
	const lsdColors: Record<string, string> = {}
	for (let i = 0; i < lsdProtocols.length; i++) {
		lsdColors[lsdProtocols[i]] = allColors[i]
	}
	lsdColors['Others'] = '#AAAAAA'

	// --- Beth: combine Ethereum + BSC ---
	const beth = chartData.find((protocol) => protocol.name === 'Binance staked ETH')
	if (beth) {
		const combineBethChains = (tokensKey: 'tokens' | 'tokensInUsd') => {
			const bscByDate = new Map<number, Record<string, number>>()
			for (const entry of beth.chainTvls['BSC']?.[tokensKey] ?? []) {
				bscByDate.set(entry.date, entry.tokens)
			}
			return (beth.chainTvls['Ethereum']?.[tokensKey] ?? []).map((i) => {
				const bscTokens = bscByDate.get(i.date)
				const ethVal = i.tokens['ETH'] ?? i.tokens['WETH'] ?? 0
				const bscVal = bscTokens ? (bscTokens['ETH'] ?? bscTokens['WETH'] ?? 0) : 0
				return { date: i.date, tokens: { ETH: ethVal + bscVal } }
			})
		}
		beth.chainTvls['Ethereum'].tokens = combineBethChains('tokens')
		beth.chainTvls['Ethereum'].tokensInUsd = combineBethChains('tokensInUsd')
	}

	const PRICE_DIFF_THRESHOLD = 0.01

	// --- Build historicData and group by date + name ---
	const historicByDate = new Map<number, Array<{ name: string; value: number }>>()
	const historicByName = new Map<string, Array<{ date: number; value: number }>>()

	for (const protocol of chartData) {
		const tokensArray =
			protocol.name === 'Crypto.com Liquid Staking'
				? protocol.chainTvls['Cronos']?.tokens
				: protocol.chainTvls['Ethereum']?.tokens

		if (!tokensArray) continue

		let prevDate = -1
		for (const t of tokensArray) {
			const date = roundDate(t.date)
			if (date === prevDate) continue
			prevDate = date

			let totalEthValue = 0
			for (const [key, value] of Object.entries(t.tokens)) {
				if (key.includes('ETH')) {
					totalEthValue += value
				}
			}
			if (totalEthValue <= 0) continue

			const entry = { name: protocol.name, date, value: totalEthValue }

			if (!historicByDate.has(date)) historicByDate.set(date, [])
			historicByDate.get(date)!.push(entry)

			if (!historicByName.has(protocol.name)) historicByName.set(protocol.name, [])
			historicByName.get(protocol.name)!.push({ date, value: totalEthValue })
		}
	}

	// --- areaChartData (breakdown percentages) ---
	const areaChartData = [...historicByDate.entries()]
		.sort(([a], [b]) => a - b)
		.map(([date, dayData]) => {
			// dedupe on the 27th of august (lido duplicated)
			const data =
				date === 1630022400 ? dayData.filter((v, i, a) => a.findIndex((v2) => v2.name === v.name) === i) : dayData

			// skip days after Dec 2020 that are missing lido data
			if (date > 1608321600 && !data.some((x) => x.name === 'Lido')) return null

			const total = data.reduce((sum, a) => sum + a.value, 0)
			const row: Record<string, number> = { date }
			for (const p of data) {
				row[p.name] = (p.value / total) * 100
			}
			return row
		})
		.filter((item): item is Record<string, number> => item != null)

	// --- tokenTvls (current staking stats) ---
	const tokenTvls = chartData
		.map((protocol) => {
			const p =
				protocol.name === 'Crypto.com Liquid Staking' ? protocol.chainTvls['Cronos'] : protocol.chainTvls['Ethereum']

			if (!p?.tokens?.length) {
				return {
					name: protocol.name,
					logo: protocol.logo,
					mcap: protocol.mcap,
					stakedEth: 0,
					stakedEthInUsd: 0,
					stakedEthPctChange7d: null as number | null,
					stakedEthPctChange30d: null as number | null
				}
			}

			const lastDate = p.tokens[p.tokens.length - 1].date
			const offset7d = roundDate(lastDate - 7 * 86400)
			const offset30d = roundDate(lastDate - 30 * 86400)

			const lastTokens = p.tokens[p.tokens.length - 1].tokens
			const lastTokensInUsd = p.tokensInUsd?.[p.tokensInUsd.length - 1]?.tokens
			const lastTokens7d = p.tokens.find((x) => x.date === offset7d)?.tokens
			const lastTokens30d = p.tokens.find((x) => x.date === offset30d)?.tokens

			const eth = getETHValue(lastTokens)
			const ethInUsd = lastTokensInUsd ? getETHValue(lastTokensInUsd) : 0
			const eth7d = lastTokens7d ? getETHValue(lastTokens7d) : null
			const eth30d = lastTokens30d ? getETHValue(lastTokens30d) : null

			let correctedEth = eth
			if (ethPrice != null && ethInUsd) {
				const calculatedEth = ethInUsd / ethPrice
				if (Math.abs(calculatedEth - eth) / eth > PRICE_DIFF_THRESHOLD) {
					correctedEth = calculatedEth
				}
			}

			return {
				name: protocol.name,
				logo: protocol.logo,
				mcap: protocol.mcap,
				stakedEth: correctedEth,
				stakedEthInUsd: ethInUsd,
				stakedEthPctChange7d: eth7d !== null ? ((correctedEth - eth7d) / eth7d) * 100 : null,
				stakedEthPctChange30d: eth30d !== null ? ((correctedEth - eth30d) / eth30d) * 100 : null
			}
		})
		.filter((p) => p.stakedEth !== 0)
		.sort((a, b) => b.stakedEth - a.stakedEth)

	const rebase = 'Rebase Token: Staking rewards accrue as new tokens. Expected Peg = 1 : 1'
	const valueAccruing = 'Value Accruing Token: Staking rewards are earned in form of an appreciating LSD value.'

	const stakedEthSum = tokenTvls.reduce((sum, a) => sum + a.stakedEth, 0)
	const stakedEthInUsdSum = tokenTvls.reduce((sum, a) => sum + a.stakedEthInUsd, 0)

	// --- Index lsdRates and lsdApy by name for O(1) lookups ---
	const ratesByName = new Map<string, ILsdRateApiItem>(lsdRates.map((r) => [r.name, r]))
	const apyByName = new Map<string, PoolWithName>(lsdApy.map((a) => [a.name, a]))

	const tokensList: ILSTTokenRow[] = tokenTvls.map((p) => {
		const lsd = ratesByName.get(p.name)
		const type = lsd?.type
		const pegInfo = type === 'rebase' ? rebase : type === 'accruing' ? valueAccruing : null
		const mcap = p.mcap
		const mcaptvlRaw =
			mcap != null && p.stakedEthInUsd !== 0 ? formatNum(+mcap.toFixed(2) / +p.stakedEthInUsd.toFixed(2)) : null
		const mcaptvl = mcaptvlRaw != null ? +mcaptvlRaw : null

		return {
			...p,
			marketShare: (p.stakedEth / stakedEthSum) * 100,
			lsdSymbol: lsd?.symbol ?? null,
			ethPeg: p.name === 'SharedStake' ? null : (lsd?.ethPeg ?? null),
			pegInfo,
			marketRate: lsd?.marketRate ?? null,
			expectedRate: lsd?.expectedRate ?? null,
			mcapOverTvl: mcaptvl ? formattedNum(mcaptvl) : null,
			apy: apyByName.get(p.name)?.apy ?? null,
			fee: lsd?.fee != null && lsd.fee > 0 ? lsd.fee * 100 : null
		}
	})

	const pieChartData = preparePieChartData({
		data: tokenTvls,
		sliceIdentifier: 'name',
		sliceValue: 'stakedEth',
		limit: 10
	})

	const tokens = tokensList.map((p) => p.name)

	// --- Inflows (daily deltas per protocol, using pre-grouped historicByName) ---
	const inflowsChartData: InflowsChartData = {}
	const barChartStacks: Record<string, string> = {}

	for (const protocol of tokens) {
		const series = historicByName.get(protocol)
		if (!series || series.length < 2) continue

		for (let i = 1; i < series.length; i++) {
			const curr = series[i]
			if (!inflowsChartData[curr.date]) inflowsChartData[curr.date] = {}
			inflowsChartData[curr.date][protocol] = curr.value - series[i - 1].value
		}
		barChartStacks[protocol] = 'A'
	}

	return {
		areaChartData,
		pieChartData,
		tokensList: tokensList.filter((lsd) => lsd.name !== 'diva'),
		tokens,
		stakedEthSum,
		stakedEthInUsdSum,
		lsdColors,
		inflowsChartData,
		barChartStacks
	}
}
