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
}

export interface MapleOpenTermLoan {
	id: string
	borrower: { id: string }
	principalOwed: string
	interestRate: string
	isCalled: boolean
	isImpaired: boolean
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
