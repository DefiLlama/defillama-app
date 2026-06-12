import { preparePieChartData } from '~/components/ECharts/utils'
import { fetchProtocols } from '~/containers/ProtocolLists/api'
import { fetchProtocolBySlug } from '~/containers/ProtocolOverview/api'
import { formatNum, formattedNum, getNDistinctColors, slug } from '~/utils'
import { fetchEthPrice, fetchLsdRates, fetchYieldPools } from './api'
import type { ILsdRateApiItem, IProtocolDetailApiItem, IYieldPoolApiItem } from './api.types'
import type { ILSTTokenRow, InflowsChartData, LSTOverviewProps } from './types'

const roundDate = (ts: number): number => Math.floor(ts / 86400) * 86400

function getETHValue(obj: Record<string, number>): number {
	let eth = 0
	for (const key in obj) {
		const value = obj[key]
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
		fetchLsdRates().catch((): ILsdRateApiItem[] => []),
		fetchEthPrice().catch(() => null)
	])

	// filter for LSDs
	const lsdProtocols: string[] = []
	for (const protocol of protocols) {
		if (
			protocol.category === 'Liquid Staking' &&
			protocol.chains.includes('Ethereum') &&
			!EXCLUDED_PROTOCOLS.has(protocol.name)
		) {
			lsdProtocols.push(protocol.name)
		}
	}
	lsdProtocols.push('Crypto.com Liquid Staking')

	// get historical data
	const lsdProtocolsSlug: string[] = []
	const lsdProtocolsSlugSet = new Set<string>()
	for (const protocol of lsdProtocols) {
		const protocolSlug = slug(protocol)
		lsdProtocolsSlug.push(protocolSlug)
		lsdProtocolsSlugSet.add(protocolSlug)
	}
	const protocolResponses = await Promise.all(
		lsdProtocolsSlug.map((p) => fetchProtocolBySlug<IProtocolDetailApiItem>(p).catch(() => null))
	)
	const chartData: IProtocolDetailApiItem[] = []
	for (const protocol of protocolResponses) {
		if (protocol != null) chartData.push(protocol)
	}

	const cryptoComPool = pools.find((i) => i.project === 'crypto.com-staked-eth')
	const lsdApy: PoolWithName[] = []
	for (const pool of pools) {
		if (lsdProtocolsSlugSet.has(pool.project) && pool.chain === 'Ethereum' && pool.symbol.includes('ETH')) {
			lsdApy.push({
				...pool,
				name: PROTOCOL_NAME_OVERRIDES[pool.project] ?? formatPoolName(pool.project)
			})
		}
	}
	if (cryptoComPool) {
		lsdApy.push({
			...cryptoComPool,
			name: PROTOCOL_NAME_OVERRIDES[cryptoComPool.project] ?? formatPoolName(cryptoComPool.project)
		})
	}

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
			const combined: Array<{ date: number; tokens: Record<string, number> }> = []
			for (const i of beth.chainTvls['Ethereum']?.[tokensKey] ?? []) {
				const bscTokens = bscByDate.get(i.date)
				const ethVal = i.tokens['ETH'] ?? i.tokens['WETH'] ?? 0
				const bscVal = bscTokens ? (bscTokens['ETH'] ?? bscTokens['WETH'] ?? 0) : 0
				combined.push({ date: i.date, tokens: { ETH: ethVal + bscVal } })
			}
			return combined
		}
		if (beth.chainTvls['Ethereum']) {
			beth.chainTvls['Ethereum'].tokens = combineBethChains('tokens')
			beth.chainTvls['Ethereum'].tokensInUsd = combineBethChains('tokensInUsd')
		}
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
			for (const key in t.tokens) {
				const value = t.tokens[key]
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
	const areaChartData: Array<Record<string, number>> = []
	const sortedHistoricEntries = Array.from(historicByDate.entries()).sort(([a], [b]) => a - b)
	for (const [date, dayData] of sortedHistoricEntries) {
		let data = dayData
		// dedupe on the 27th of august (lido duplicated)
		if (date === 1630022400) {
			const seenNames = new Set<string>()
			data = []
			for (const item of dayData) {
				if (seenNames.has(item.name)) continue
				seenNames.add(item.name)
				data.push(item)
			}
		}

		let hasLido = false
		let total = 0
		for (const item of data) {
			if (item.name === 'Lido') hasLido = true
			total += item.value
		}
		// skip days after Dec 2020 that are missing lido data
		if (date > 1608321600 && !hasLido) continue

		const row: Record<string, number> = { date }
		for (const item of data) {
			row[item.name] = (item.value / total) * 100
		}
		areaChartData.push(row)
	}

	// --- tokenTvls (current staking stats) ---
	const tokenTvls: Array<
		Pick<
			ILSTTokenRow,
			'name' | 'logo' | 'mcap' | 'stakedEth' | 'stakedEthInUsd' | 'stakedEthPctChange7d' | 'stakedEthPctChange30d'
		>
	> = []
	for (const protocol of chartData) {
		const p =
			protocol.name === 'Crypto.com Liquid Staking' ? protocol.chainTvls['Cronos'] : protocol.chainTvls['Ethereum']

		if (!p?.tokens?.length) {
			continue
		}

		const lastDate = p.tokens[p.tokens.length - 1].date
		const offset7d = roundDate(lastDate - 7 * 86400)
		const offset30d = roundDate(lastDate - 30 * 86400)

		const lastTokens = p.tokens[p.tokens.length - 1].tokens
		const lastTokensInUsd = p.tokensInUsd?.[p.tokensInUsd.length - 1]?.tokens
		let lastTokens7d: Record<string, number> | null = null
		let lastTokens30d: Record<string, number> | null = null
		for (const item of p.tokens) {
			if (lastTokens7d == null && item.date === offset7d) {
				lastTokens7d = item.tokens
			} else if (lastTokens30d == null && item.date === offset30d) {
				lastTokens30d = item.tokens
			}
			if (lastTokens7d && lastTokens30d) break
		}

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

		if (correctedEth === 0) {
			continue
		}

		tokenTvls.push({
			name: protocol.name,
			logo: protocol.logo,
			mcap: protocol.mcap,
			stakedEth: correctedEth,
			stakedEthInUsd: ethInUsd,
			stakedEthPctChange7d: eth7d !== null ? ((correctedEth - eth7d) / eth7d) * 100 : null,
			stakedEthPctChange30d: eth30d !== null ? ((correctedEth - eth30d) / eth30d) * 100 : null
		})
	}
	tokenTvls.sort((a, b) => b.stakedEth - a.stakedEth)

	const rebase = 'Rebase Token: Staking rewards accrue as new tokens. Expected Peg = 1 : 1'
	const valueAccruing = 'Value Accruing Token: Staking rewards are earned in form of an appreciating LSD value.'

	let stakedEthSum = 0
	let stakedEthInUsdSum = 0
	for (const tokenTvl of tokenTvls) {
		stakedEthSum += tokenTvl.stakedEth
		stakedEthInUsdSum += tokenTvl.stakedEthInUsd
	}

	// --- Index lsdRates and lsdApy by name for O(1) lookups ---
	const ratesByName = new Map<string, ILsdRateApiItem>()
	for (const rate of lsdRates) {
		ratesByName.set(rate.name, rate)
	}
	const apyByName = new Map<string, PoolWithName>()
	for (const pool of lsdApy) {
		apyByName.set(pool.name, pool)
	}

	const visibleTokensList: ILSTTokenRow[] = []
	const tokens: string[] = []
	for (const p of tokenTvls) {
		const lsd = ratesByName.get(p.name)
		const type = lsd?.type
		const pegInfo = type === 'rebase' ? rebase : type === 'accruing' ? valueAccruing : null
		const mcap = p.mcap
		const mcaptvlRaw =
			mcap != null && p.stakedEthInUsd !== 0 ? formatNum(+mcap.toFixed(2) / +p.stakedEthInUsd.toFixed(2)) : null
		const mcaptvl = mcaptvlRaw != null ? +mcaptvlRaw : null

		const row = {
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
		tokens.push(row.name)
		if (row.name !== 'diva') {
			visibleTokensList.push(row)
		}
	}

	const pieChartData = preparePieChartData({
		data: tokenTvls,
		sliceIdentifier: 'name',
		sliceValue: 'stakedEth',
		limit: 10
	})

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
		tokensList: visibleTokensList,
		tokens,
		stakedEthSum,
		stakedEthInUsdSum,
		lsdColors,
		inflowsChartData,
		barChartStacks
	}
}
