import { useQuery } from '@tanstack/react-query'
import { EXTENDED_COLOR_PALETTE } from '~/containers/ProDashboard/utils/colorManager'

const BASE = '/api/odyssey-ecosystem'
const STALE_MS = 10 * 60 * 1000

function useTab<T>(tab: string) {
	return useQuery<T>({
		queryKey: ['odyssey-ecosystem', tab],
		queryFn: async () => {
			const res = await fetch(`${BASE}/${tab}`)
			if (!res.ok) throw new Error(`Odyssey ${tab} ${res.status}`)
			return res.json()
		},
		staleTime: STALE_MS,
		refetchOnWindowFocus: false
	})
}

/* ──────────────────────────── shared types ──────────────────────────── */

export interface FormattedValue {
	value: number
	formatted: string
}

export interface Series {
	name: string
	data: Array<number | null>
	color?: string
}

export interface ChartData {
	dates: string[]
	series: Series[]
}

/* ──────────────────────────── chart helpers ──────────────────────────── */

export function chartToTs(c: ChartData | undefined): Array<{ name: string; data: Array<[number, number | null]>; color?: string }> {
	if (!c?.dates) return []
	return c.series.map((s) => ({
		name: s.name,
		color: s.color,
		data: c.dates.map((d, i) => [Math.floor(new Date(d + 'T00:00:00Z').getTime() / 1000), s.data[i] ?? null] as [number, number | null])
	}))
}

export function seriesPairs(
	dates: string[] | undefined,
	vals: Array<number | null> | undefined
): Array<[number, number | null]> {
	if (!dates || !vals) return []
	return dates.map((d, i) => [Math.floor(new Date(d + 'T00:00:00Z').getTime() / 1000), vals[i] ?? null] as [number, number | null])
}

export function zoomStartPct(dates: string[] | undefined, fromDate: string): number {
	if (!dates || dates.length < 2) return 0
	const idx = dates.findIndex((d) => d >= fromDate)
	if (idx <= 0) return 0
	return (idx / (dates.length - 1)) * 100
}

export function defaultZoomOptions(start: number): any {
	if (start <= 0) return undefined
	return { dataZoom: [{ start, end: 100 }, { start, end: 100 }] }
}

export function assignColors(names: string[]): Record<string, string> {
	const colors: Record<string, string> = {}
	const sorted = [...names].sort()
	for (let i = 0; i < sorted.length; i++) {
		colors[sorted[i]] = EXTENDED_COLOR_PALETTE[i % EXTENDED_COLOR_PALETTE.length]
	}
	return colors
}

/* ──────────────────────────── metadata ──────────────────────────── */

export interface MetadataResponse {
	projectId: number
	projectName: string
	updatedAt: string
	dataLastUpdated: string
	description: string
	protocols: Array<{ id: string; name: string; llamaSlug: string; docs: string }>
	chains: Array<{ name: string; chainId: number }>
	debankBundles: Record<string, string>
	links: Record<string, string>
	faq: Array<{ question: string; answer: string }>
}

export const useMetadata = () => useTab<MetadataResponse>('metadata')

/* ──────────────────────────── TVL tab ──────────────────────────── */

interface MorphoMarket {
	chain: string
	market: string
	supplyUsd: number
	borrowUsd: number
	borrowableUsd: number
	utilizationPct: number
	targetPct: number
	mintNeededUsd: number
	lltvPct: number
	supplyApyPct: number
	borrowApyPct: number
}

interface MorphoVault {
	vault: string
	chain: string
	totalAssetsUsd: number
	idleLiquidityUsd: number
	netApyPct: number
	allocations?: Array<{ market: string; key: string; supplyUsd: number }>
}

interface PoolRow {
	venue: string
	chain: string
	pool: string
	tvl: string
	apy: string
}

export interface TvlResponse {
	defaultFrom: string
	ecosystemChart: ChartData
	marketOverlay: ChartData
	protocolByChain: Array<ChartData & { protocol: string }>
	utilization?: {
		kpis: { supply: FormattedValue; borrows: FormattedValue; avgUtilization: FormattedValue; idleLiquidity: FormattedValue }
		vaults: MorphoVault[]
		marketsByChain: Array<{ chain: string; markets: MorphoMarket[] }>
	}
	synthLpTvl?: { subtitle: string; pools: PoolRow[] }
	metbasis?: { subtitle: string; pools: PoolRow[] }
	kpis: {
		total: FormattedValue
		metronome: FormattedValue
		vesper: FormattedValue
		odyssey: FormattedValue
		morpho: FormattedValue
	}
}

export const useTvlData = () => useTab<TvlResponse>('tvl')

/* ──────────────────────────── Revenue tab ──────────────────────────── */

interface UnclaimedPipeline {
	totalUsd: number
	totalFormatted: string
	asOf: string
	note: string
	pie: Array<{ name: string; value: number }>
	treasuryLps: Array<{ pool: string; treasury: string; stakedLp: string; rewards: string; rewardsUsd: number; value: string }>
	ethUniv3: Array<{ position: string; balance: string; rewards: string; usd: number }>
	plasmaUniv3: Array<{ pool: string; token: string; amount: number; usd: number }>
	lithosGauge: Array<{ gauge: string; rewards: string; usd: number }>
	amoPositions: Array<{
		vaultName: string
		asset: string
		chainId: number
		assetsUsd: number
		pnlUsd: number
		allTimeHarvestedUsd: number
		lastHarvestDate: string
	}>
	aeroLocks: Array<{ nft: string; locked: string; rewards: string; usd: number; unlock: string }>
	convex: Array<{ type: string; balance: string; status: string; usd: number; unlock: string; isClaimable: boolean }>
}

export interface RevenueResponse {
	llamaDailyChart: ChartData
	holderRevenueChart: ChartData
	metronomeClaimed: {
		mtdTotalUsd: number
		claimedTotalUsd: number
		items: Array<{ id: string; label: string; chain: string; detail: string; amountUsd: number; amountFormatted: string }>
	}
	metbasisDetail?: {
		monthLabel: string
		totalUsd: number
		totalFormatted: string
		chainTotals: Record<string, number>
		rows: Array<{ chain: string; token: string; amount: number; priceUsd: number; usd: number; claims: number; lastClaim: string }>
	}
	unclaimedPipeline: UnclaimedPipeline
	synthInterestDetail: Array<{
		asset: string
		annualRatePct: number
		totalDebtUsd: number
		estimatedDailyUsd: number
		estimatedMonthlyUsd: number
		byChain: Array<{ chain: string; amount_synth: number; amount_usd: number }>
	}>
	kpis: {
		revenueAllTime: {
			ecosystem: FormattedValue
			metronome: FormattedValue & { claimed: number; unclaimed: number }
			vesper: FormattedValue
			odyssey: FormattedValue
		}
		claimedMtd: { metronome: FormattedValue; vesper: FormattedValue; odyssey: FormattedValue }
		unclaimedPipeline: FormattedValue
		holdersAllTime: { metronome: FormattedValue; vesper: FormattedValue }
	}
}

export const useRevenueData = () => useTab<RevenueResponse>('revenue')

/* ──────────────────────────── Incentives tab ──────────────────────────── */

export interface EpochRow {
	pool: string
	period: string
	emissions?: string
	incentiveSpend?: string
	incentiveSpendUsd?: number
	latestCycle?: string
	currentEpochUsd?: number
	monthSoFarUsd?: number
	previousMonthUsd?: number
}

export interface SpendWindowRow {
	period: string
	spend: string
}

export interface IncentivesResponse {
	weeklyHistoryChart: ChartData
	weeklyPoolCharts: Record<string, ChartData>
	epochTables: {
		aerodrome: EpochRow[]
		velodrome: EpochRow[]
		votemarket: EpochRow[]
		merkl: SpendWindowRow[]
		lithos: SpendWindowRow[]
	}
	gauges: {
		aerodrome: Array<{ pool: string; tvl: string; apy: string }>
		velodrome: Array<{ pool: string; tvl: string; apy: string }>
		lithos: Array<{ pool: string; tvl: string; apy: string }>
	}
	curvePools: Array<{ pool: string; apy: string; balances: string; tvlUsd: string }>
	kpis: {
		thirtyDayTotal: FormattedValue
		allTimeTotal: FormattedValue
		thirtyDayByVenue: Array<{ venue: string; id: string; chain: string; amountUsd: number; amountFormatted: string }>
	}
}

export const useIncentivesData = () => useTab<IncentivesResponse>('incentives')

/* ──────────────────────────── Yields tab ──────────────────────────── */

export interface VesperPool {
	pool: string
	chain: string
	asset: string
	tvl: string
	dates: string[]
	sharePrices: Array<number | null>
	apySeries: Array<number | null>
	firstPps: number
	lastPps: number
	netApyPct: number
	observationDays: number
}

export interface LpApyPool {
	pool: string
	venue: string
	dates: string[]
	apys: Array<number | null>
	latestApy: number
}

export interface YieldsResponse {
	odysseyApy: { rows: Array<{ chain: string; strategies: number; netApyPct: number; totalNetEquityUsd: number }> }
	looperApy: {
		rows: Array<{
			name: string
			chain: string
			collateral: string
			borrow: string
			openPositions: number
			collateralApyPct: number
			borrowApyPct: number
			netApyPct: number
			totalDepositedUsd: number
			totalBorrowedUsd: number
			totalNetEquityUsd: number
		}>
	}
	vesperApy: { pools: VesperPool[] }
	lpApyHistory: Record<string, { venue: string; pools: LpApyPool[] }>
	lpPools: { rows: Array<{ venue: string; chain: string; pool: string; tvl: string; apy: string; apyPct: number }> }
	kpis: {
		topLooperApy: FormattedValue
		topOdysseyApy: FormattedValue
		topVesperApy: FormattedValue
		odysseyStrategyCount: FormattedValue
	}
}

export const useYieldsData = () => useTab<YieldsResponse>('yields')

/* ──────────────────────────── Treasury tab ──────────────────────────── */

export interface TreasuryResponse {
	treasuryLps: {
		totalFormatted: string
		unclaimedRewardsFormatted: string
		rows: Array<{ pool: string; stakedLp: string; rewards: string; rewardsUsd: number; value: string; valueUsd: number }>
	}
	plasmaUniv3: { totalFormatted: string; rows: Array<{ pool: string; token: string; amount: number; usd: number }> }
	vlCvx: { rows: Array<{ type: string; status: string; balance: string; unlock: string }> }
	veAero: { rows: Array<{ nft: string; locked: string; rewards: string; unlock: string }> }
	metronomeAllocation: { rows: Array<{ bucket: string; share: string; value: string }> }
	vesperAllocation: { rows: Array<{ bucket: string; share: string; value: string }> }
}

export const useTreasuryData = () => useTab<TreasuryResponse>('treasury')

/* ──────────────────────────── Growth tab ──────────────────────────── */

interface LooprMetric {
	chains: Array<{ chain: string; dates: string[]; values: number[]; daily_active?: Array<{ date: string; count: number }> }>
	combined: { dates: string[]; values: number[] }
}

interface TokenPriceBlock {
	current: { confidence: number; price: number; symbol: string; timestamp: number }
	history: Array<{ price: number; timestamp: number }>
}

export interface GrowthResponse {
	loopr: {
		activeAccounts: LooprMetric
		activePositions: LooprMetric
		accountsCreated: LooprMetric
		positionsCreated: LooprMetric
	}
	tokenPrices: { MET: TokenPriceBlock; VSP: TokenPriceBlock }
	marketComparison: {
		combined: ChartData & { name: string }
		protocols: Record<string, ChartData & { name: string }>
	}
	depositsByChain: ChartData
	caseStudies: {
		morphoMarkets: Array<ChartData & { id: string; label: string; title: string }>
		spendVsTvl: Array<ChartData & { venue: string; title: string; latestTvl: number }>
		kelpExploitDate: string
		siusdVsIusd: ChartData
		siusdMarketShare: ChartData
		morphoMarket: ChartData
		kpis: {
			siusdTvl: number
			iusdTvl: number
			siusdSharePct: number
			morphoBorrowLatest: number
			morphoUtilization: number
		}
	}
	kpis: {
		activeAccounts: FormattedValue
		activePositions: FormattedValue
		totalUsers: FormattedValue
		siusdSharePct: FormattedValue
		siusdTvl: FormattedValue
		morphoUtilization: FormattedValue
	}
}

export const useGrowthData = () => useTab<GrowthResponse>('growth')
