import { useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'

export interface MapleAsset {
	symbol: string
	decimals: number
}

export interface MapleLoanManager {
	principalOut: string
	accountedInterest: string
}

export interface MaplePoolMeta {
	_id: string
	poolName: string
	strategy: string | null
	cardDescription: string | null
	poolCategory: { _id: string; name: string } | null
	collateralType: { _id: string; name: string } | null
}

export interface MapleWithdrawalManager {
	id: string
	cycleDuration: string
	windowDuration: string
}

export interface MaplePool {
	id: string
	name: string
	asset: MapleAsset
	tvlUsd: string
	spotApy: string
	numOpenTermLoans: string
	unrealizedLosses: string
	liquidityCap: string
	loanManager: MapleLoanManager
	totalAssets: string
	principalOut: string
	numPositions: string
	numActiveLoans: string
	numDefaultedLoans: number
	depositedAssets: string
	withdrawnAssets: string
	coverLiquidated: string
	delegateManagementFeeRate: string
	platformManagementFeeRate: string
	openToPublic: boolean
	symbol: string
	poolMeta: MaplePoolMeta | null
	withdrawalManager: MapleWithdrawalManager | null
}

export interface MapleOpenTermLoan {
	id: string
	borrower: { id: string }
	principalOwed: string
	interestRate: string
	isCalled: boolean
	isImpaired: boolean
	interestPaid: string
	fundingDate: string
	startDate: string
	state: string
	paymentIntervalDays: string
	gracePeriodSeconds: string
	delegateServiceFeeRate: string
	platformServiceFeeRate: string
	lateInterestPremium: string
	lateFeeRate: string
}

export interface MaplePoolWithLoans {
	id: string
	name: string
	asset: MapleAsset
	tvlUsd: string
	spotApy: string
	numOpenTermLoans: string
	openTermLoans: MapleOpenTermLoan[]
}

export interface StSyrupTx {
	id: string
	timestamp: string
	type: 'deposit' | 'withdraw'
	sharesAmount: string
	assetsAmount: string
	account: { id: string }
}

export interface SyrupTx {
	id: string
	timestamp: string
	tokensMigrated: string
	account: { id: string }
}

export interface SyrupGlobals {
	apy: string
	tvl: string
}

export interface StSyrup {
	id: string
	totalSupply: string
	freeAssets: string
	issuanceRate: string
	vestingPeriodFinish: string
	lastUpdated: string
	precision: number
	asset: { id: string }
}

export interface SyrupDripTx {
	id: string
	timestamp: string
	type: string
	amount: string
	account: { id: string }
}

const STALE_TIME = 10 * 60 * 1000

async function fetchMapleQuery<T>(queryName: string): Promise<T> {
	const response = await fetch('/api/maple/graphql', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ queryName })
	})
	if (!response.ok) throw new Error(`Maple API error: ${response.status}`)
	return response.json()
}

export function parseWad(value: string, decimals = 27): number {
	if (value === '0') return 0
	const n = Number(value)
	return n / Math.pow(10, decimals)
}

export function parseTokenAmount(value: string, decimals: number): number {
	if (value === '0') return 0
	return Number(value) / Math.pow(10, decimals)
}

export function parseInterestRate(value: string): number {
	return Number(value) / 10000
}

export function parseFeeRate(value: string): number {
	return Number(value) / 10000
}

export function useMapleActivePools() {
	const query = useQuery({
		queryKey: ['maple-active-pools'],
		queryFn: () => fetchMapleQuery<{ data: { poolV2S: MaplePool[] } }>('activePools'),
		staleTime: STALE_TIME,
		refetchOnWindowFocus: false
	})

	return useMemo(() => {
		const pools = query.data?.data?.poolV2S ?? []
		const significant = pools.filter((p) => parseFloat(p.tvlUsd) >= 1000)
		return { ...query, pools: significant }
	}, [query])
}

export function useMaplePoolsWithLoans() {
	const query = useQuery({
		queryKey: ['maple-pools-with-loans'],
		queryFn: () => fetchMapleQuery<{ data: { poolV2S: MaplePoolWithLoans[] } }>('poolsWithLoans'),
		staleTime: STALE_TIME,
		refetchOnWindowFocus: false
	})

	return useMemo(() => {
		const pools = query.data?.data?.poolV2S ?? []
		const withActiveLoans = pools.filter((p) => p.openTermLoans.length > 0)
		return { ...query, pools: withActiveLoans }
	}, [query])
}

export function useStSyrupTxes() {
	const query = useQuery({
		queryKey: ['maple-st-syrup-txes'],
		queryFn: () => fetchMapleQuery<{ data: { stSyrupTxes: StSyrupTx[] } }>('stSyrupTxes'),
		staleTime: STALE_TIME,
		refetchOnWindowFocus: false
	})

	return useMemo(() => {
		const txes = query.data?.data?.stSyrupTxes ?? []
		return { ...query, txes }
	}, [query])
}

export function useSyrupTxes() {
	const query = useQuery({
		queryKey: ['maple-syrup-txes'],
		queryFn: () => fetchMapleQuery<{ data: { syrupTxes: SyrupTx[] } }>('syrupTxes'),
		staleTime: STALE_TIME,
		refetchOnWindowFocus: false
	})

	return useMemo(() => {
		const txes = query.data?.data?.syrupTxes ?? []
		return { ...query, txes }
	}, [query])
}

export function useSyrupGlobals() {
	const query = useQuery({
		queryKey: ['maple-syrup-globals'],
		queryFn: () => fetchMapleQuery<{ data: { syrupGlobals: SyrupGlobals } }>('syrupGlobals'),
		staleTime: STALE_TIME,
		refetchOnWindowFocus: false
	})

	return useMemo(() => {
		const globals = query.data?.data?.syrupGlobals ?? null
		return { ...query, globals }
	}, [query])
}

export function useStSyrupState() {
	const query = useQuery({
		queryKey: ['maple-st-syrup-state'],
		queryFn: () => fetchMapleQuery<{ data: { stSyrups: StSyrup[] } }>('stSyrupState'),
		staleTime: STALE_TIME,
		refetchOnWindowFocus: false
	})

	return useMemo(() => {
		const state = query.data?.data?.stSyrups?.[0] ?? null
		return { ...query, state }
	}, [query])
}

export function useSyrupDripTxes() {
	const query = useQuery({
		queryKey: ['maple-syrup-drip-txes'],
		queryFn: () => fetchMapleQuery<{ data: { syrupDripTxes: SyrupDripTx[] } }>('syrupDripTxes'),
		staleTime: STALE_TIME,
		refetchOnWindowFocus: false
	})

	return useMemo(() => {
		const txes = query.data?.data?.syrupDripTxes ?? []
		return { ...query, txes }
	}, [query])
}
