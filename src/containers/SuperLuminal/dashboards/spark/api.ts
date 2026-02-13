import { useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import { EXTENDED_COLOR_PALETTE } from '~/containers/ProDashboard/utils/colorManager'

interface DuneResponse<T> {
	result: {
		rows: T[]
		metadata: {
			column_names: string[]
			column_types: string[]
			total_row_count: number
		}
	}
}

interface ActualRevenueRow {
	dt: string
	token_symbol: string
	'protocol-token': string
	tw_net_rev_interest_usd: number
	gross_yield_usd: number
	sky_borrow_cost_usd: number
	saving_V2_borrow_cost_usd: number
}

interface RevenueProjectionRow {
	dt: string
	data_update_dt: string
	'protocol-token': string
	token_symbol: string
	tw_net_rev_interest_proj_usd: number
	gross_revenue_proj_usd: number
}

interface AllocatedAssetsRow {
	dt: string
	'protocol-token': string
	balance: number
}

export interface SparklendDailyRow {
	dt: string
	protocol_name: string
	token_symbol: string
	'protocol-token': string
	alm_supply_amount: number
	utilization: number
	alm_idle: number
	PayPal_rewards_rate: number
	borrow_rate_apr: number
	sky_borrow_amount: number
	borrow_cost_code: string
	borrow_cost_apr: number
	price_usd: number
	saving_V2_borrow_amount: number
	saving_V2_holding_amount: number
	saving_v2_borrow_apr: number
	gross_yield_formula: string
	gross_yield_usd: number
	borrow_cost_formula: string
	borrow_cost_usd: number
	saving_v2_borrow_cost_formula: string
	saving_V2_borrow_cost_usd: number
	revenue_usd: number
}

export interface MorphoDailyRow {
	dt: string
	protocol_name: string
	token_symbol: string
	'protocol-token': string
	alm_supply_amount: number
	alm_borrow_amount: number
	utilization: number
	MORPHO_rewards_usd: number
	supply_rate_apr: number
	borrow_rate_apr: number
	sky_borrow_amount: number
	saving_V2_borrow_amount: number
	borrow_cost_code: string
	borrow_cost_apr: number
	price_usd: number
	gross_yield_formula: string
	gross_yield_usd: number
	borrow_cost_formula: string
	borrow_cost_usd: number
	revenue_usd: number
}

export async function fetchDuneQuery<T>(queryId: string): Promise<DuneResponse<T>> {
	const response = await fetch(`/api/dune/query/${queryId}`)
	if (!response.ok) throw new Error(`Dune API error: ${response.status}`)
	return response.json()
}

export function assignColors(names: string[]): Record<string, string> {
	const colors: Record<string, string> = {}
	const sorted = [...names].sort()
	for (let i = 0; i < sorted.length; i++) {
		colors[sorted[i]] = EXTENDED_COLOR_PALETTE[i % EXTENDED_COLOR_PALETTE.length]
	}
	return colors
}

export function pivotByDate<T extends { dt: string }>(
	rows: T[],
	groupKey: keyof T,
	valueKey: keyof T
): Array<Record<string, number>> {
	const map = new Map<number, Record<string, number>>()

	for (const row of rows) {
		const ts = Math.floor(new Date(row.dt).getTime() / 1000)
		if (!map.has(ts)) {
			map.set(ts, { date: ts })
		}
		const entry = map.get(ts)!
		const key = String(row[groupKey])
		entry[key] = (entry[key] ?? 0) + Number(row[valueKey])
	}

	return Array.from(map.values()).sort((a, b) => a.date - b.date)
}

export function useSLLActualRevenue() {
	const query = useQuery({
		queryKey: ['dune-sll-actual-revenue'],
		queryFn: () => fetchDuneQuery<ActualRevenueRow>('5441979'),
		staleTime: 10 * 60 * 1000,
		refetchOnWindowFocus: false
	})

	return useMemo(() => {
		const rows = query.data?.result?.rows ?? []
		const protocolTokens = [...new Set(rows.map((r) => r['protocol-token']))].sort()
		const colors = assignColors(protocolTokens)

		const revenueByProtocol = pivotByDate(rows, 'protocol-token', 'tw_net_rev_interest_usd')

		const grossYieldByMonth = new Map<number, { gross: number; borrow: number; savingV2: number }>()
		for (const row of rows) {
			const ts = Math.floor(new Date(row.dt).getTime() / 1000)
			const entry = grossYieldByMonth.get(ts) ?? { gross: 0, borrow: 0, savingV2: 0 }
			entry.gross += row.gross_yield_usd
			entry.borrow += row.sky_borrow_cost_usd
			entry.savingV2 += row.saving_V2_borrow_cost_usd
			grossYieldByMonth.set(ts, entry)
		}

		const yieldVsCost = Array.from(grossYieldByMonth.entries())
			.sort(([a], [b]) => a - b)
			.map(([ts, v]) => ({
				date: ts,
				'Gross Yield': v.gross,
				'Sky Borrow Cost': v.borrow,
				'Saving V2 Borrow Cost': v.savingV2
			}))

		return {
			...query,
			revenueByProtocol,
			yieldVsCost,
			protocolTokens,
			colors
		}
	}, [query])
}

export function useSLLRevenueProjection() {
	const query = useQuery({
		queryKey: ['dune-sll-revenue-projection'],
		queryFn: () => fetchDuneQuery<RevenueProjectionRow>('5519671'),
		staleTime: 10 * 60 * 1000,
		refetchOnWindowFocus: false
	})

	return useMemo(() => {
		const rows = query.data?.result?.rows ?? []
		const protocolTokens = [...new Set(rows.map((r) => r['protocol-token']))].sort()
		const colors = assignColors(protocolTokens)

		const projectionByProtocol = pivotByDate(rows, 'protocol-token', 'tw_net_rev_interest_proj_usd')

		return {
			...query,
			projectionByProtocol,
			protocolTokens,
			colors
		}
	}, [query])
}

export function useSLLAllocatedAssets() {
	const query = useQuery({
		queryKey: ['dune-sll-allocated-assets'],
		queryFn: () => fetchDuneQuery<AllocatedAssetsRow>('5747940'),
		staleTime: 10 * 60 * 1000,
		refetchOnWindowFocus: false
	})

	return useMemo(() => {
		const rows = query.data?.result?.rows ?? []
		const protocolTokens = [...new Set(rows.map((r) => r['protocol-token']))].sort()
		const colors = assignColors(protocolTokens)

		const balanceByProtocol = pivotByDate(rows, 'protocol-token', 'balance')

		return {
			...query,
			balanceByProtocol,
			protocolTokens,
			colors
		}
	}, [query])
}

export function useSLLActualRevenueDaily() {
	const query = useQuery({
		queryKey: ['dune-sll-actual-revenue-daily'],
		queryFn: () => fetchDuneQuery<ActualRevenueRow>('5870774'),
		staleTime: 10 * 60 * 1000,
		refetchOnWindowFocus: false
	})

	return useMemo(() => {
		const rows = query.data?.result?.rows ?? []
		const protocolTokens = [...new Set(rows.map((r) => r['protocol-token']))].sort()
		const colors = assignColors(protocolTokens)

		const revenueByProtocol = pivotByDate(rows, 'protocol-token', 'tw_net_rev_interest_usd')

		return {
			...query,
			revenueByProtocol,
			protocolTokens,
			colors
		}
	}, [query])
}

export function useSLLSparklendDaily() {
	const query = useQuery({
		queryKey: ['dune-sll-sparklend-daily'],
		queryFn: () => fetchDuneQuery<SparklendDailyRow>('5695247'),
		staleTime: 10 * 60 * 1000,
		refetchOnWindowFocus: false
	})

	return useMemo(() => {
		const rows = query.data?.result?.rows ?? []
		return { ...query, rows }
	}, [query])
}
