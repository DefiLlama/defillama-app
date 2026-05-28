import { useQuery } from '@tanstack/react-query'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { HyperliquidCandle } from '~/pages/api/hyperliquid/candles'
import type { HlpFundingData } from '~/pages/api/hyperliquid/hlp-funding'
import type { HlpOpenOrder } from '~/pages/api/hyperliquid/hlp-open-orders'
import type { HlpPortfolioData } from '~/pages/api/hyperliquid/hlp-portfolio'
import type { HlpData, HlpFill, HlpPosition } from '~/pages/api/hyperliquid/hlp-positions'
import type { HyperliquidL2Book } from '~/pages/api/hyperliquid/l2-book'
import type { PerpMarket } from '~/pages/api/hyperliquid/perps'
import type { PredictedFunding } from '~/pages/api/hyperliquid/predicted-fundings'
import type { SpotMarket } from '~/pages/api/hyperliquid/spot'

const HL_WS = 'wss://api.hyperliquid.xyz/ws'
const HEARTBEAT_TIMEOUT_MS = 20_000
const HEARTBEAT_CHECK_MS = 5_000

export interface WsSubscription {
	type: string
	coin?: string
	interval?: string
	user?: string
	nSigFigs?: number
	mantissa?: number | null
}

type HyperliquidWsMessage = {
	channel?: string
	data?: any
	isSnapshot?: boolean
}

function subscriptionKey(subscription: WsSubscription) {
	const sortedEntries = Object.entries(subscription).sort(([a], [b]) => a.localeCompare(b))
	return JSON.stringify(sortedEntries)
}

function toSubscriptionMap(subscriptions: WsSubscription[]) {
	return new Map(subscriptions.map((sub) => [subscriptionKey(sub), sub]))
}

export function pushBounded<T>(prev: T[], incoming: T[] | T, limit: number): T[] {
	const next = Array.isArray(incoming) ? [...incoming, ...prev] : [incoming, ...prev]
	return next.length <= limit ? next : next.slice(0, limit)
}

export function useHyperliquidWs(subscriptions: WsSubscription[], onMessage: (msg: HyperliquidWsMessage) => void) {
	const [isConnected, setIsConnected] = useState(false)
	const wsRef = useRef<WebSocket | null>(null)
	const subsRef = useRef(subscriptions)
	const cbRef = useRef(onMessage)
	const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
	const heartbeatTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)
	const lastMessageAtRef = useRef<number>(Date.now())
	const backoffRef = useRef(1000)
	const mountedRef = useRef(true)
	const prevSubsRef = useRef<Map<string, WsSubscription>>(new Map())

	subsRef.current = subscriptions
	cbRef.current = onMessage

	const sendMessage = useCallback((ws: WebSocket, method: 'subscribe' | 'unsubscribe', sub: WsSubscription) => {
		if (ws.readyState !== WebSocket.OPEN) return
		ws.send(JSON.stringify({ method, subscription: sub }))
	}, [])

	const syncSubscriptions = useCallback(
		(ws: WebSocket, nextSubs: WsSubscription[]) => {
			const prevMap = prevSubsRef.current
			const nextMap = toSubscriptionMap(nextSubs)

			for (const [key, sub] of prevMap) {
				if (!nextMap.has(key)) sendMessage(ws, 'unsubscribe', sub)
			}
			for (const [key, sub] of nextMap) {
				if (!prevMap.has(key)) sendMessage(ws, 'subscribe', sub)
			}

			prevSubsRef.current = nextMap
		},
		[sendMessage]
	)

	const clearTimers = useCallback(() => {
		if (reconnectTimerRef.current) {
			clearTimeout(reconnectTimerRef.current)
			reconnectTimerRef.current = null
		}
		if (heartbeatTimerRef.current) {
			clearInterval(heartbeatTimerRef.current)
			heartbeatTimerRef.current = null
		}
	}, [])

	const connect = useCallback(() => {
		if (!mountedRef.current) return
		if (wsRef.current?.readyState === WebSocket.OPEN || wsRef.current?.readyState === WebSocket.CONNECTING) return

		prevSubsRef.current = new Map()
		const ws = new WebSocket(HL_WS)
		wsRef.current = ws
		lastMessageAtRef.current = Date.now()

		ws.onopen = () => {
			if (!mountedRef.current) {
				ws.close()
				return
			}
			setIsConnected(true)
			backoffRef.current = 1000
			syncSubscriptions(ws, subsRef.current)

			heartbeatTimerRef.current = setInterval(() => {
				if (!mountedRef.current || ws.readyState !== WebSocket.OPEN) return
				if (Date.now() - lastMessageAtRef.current > HEARTBEAT_TIMEOUT_MS) {
					ws.close()
				}
			}, HEARTBEAT_CHECK_MS)
		}

		ws.onmessage = (event) => {
			lastMessageAtRef.current = Date.now()
			try {
				const message = JSON.parse(event.data) as HyperliquidWsMessage
				if (message.channel === 'subscriptionResponse') return
				cbRef.current(message)
			} catch {
				// ignore non-json frames
			}
		}

		ws.onclose = () => {
			clearTimers()
			if (!mountedRef.current) return
			setIsConnected(false)
			const jitter = 0.8 + Math.random() * 0.4
			const waitMs = Math.floor(backoffRef.current * jitter)
			reconnectTimerRef.current = setTimeout(() => {
				backoffRef.current = Math.min(backoffRef.current * 2, 15_000)
				connect()
			}, waitMs)
		}

		ws.onerror = () => {
			ws.close()
		}
	}, [clearTimers, syncSubscriptions])

	useEffect(() => {
		mountedRef.current = true
		connect()
		return () => {
			mountedRef.current = false
			clearTimers()
			if (wsRef.current) {
				wsRef.current.onclose = null
				wsRef.current.close()
				wsRef.current = null
			}
		}
	}, [clearTimers, connect])

	useEffect(() => {
		const ws = wsRef.current
		if (!ws || ws.readyState !== WebSocket.OPEN) return
		syncSubscriptions(ws, subscriptions)
	}, [subscriptions, syncSubscriptions])

	return { isConnected }
}

export function useHyperliquidWsChannels(
	subscriptions: WsSubscription[],
	handlers: Partial<Record<string, (message: HyperliquidWsMessage) => void>>
) {
	const handlersRef = useRef(handlers)
	handlersRef.current = handlers

	return useHyperliquidWs(subscriptions, (message) => {
		const channel = message.channel
		if (!channel) return
		handlersRef.current[channel]?.(message)
	})
}

export type {
	HyperliquidCandle,
	HyperliquidL2Book,
	HlpData,
	HlpFill,
	HlpFundingData,
	HlpOpenOrder,
	HlpPortfolioData,
	HlpPosition,
	PerpMarket,
	PredictedFunding,
	SpotMarket
}

async function fetchJson<T>(url: string): Promise<T> {
	const response = await fetch(url)
	if (!response.ok) throw new Error(`API ${response.status}`)
	return response.json()
}

export function useHyperliquidPerps() {
	const query = useQuery<PerpMarket[]>({
		queryKey: ['hl-perps'],
		queryFn: () => fetchJson<PerpMarket[]>('/api/hyperliquid/perps'),
		staleTime: 60_000,
		refetchOnWindowFocus: false
	})

	return { ...query, markets: query.data ?? [] }
}

export function useHyperliquidSpot() {
	const query = useQuery<SpotMarket[]>({
		queryKey: ['hl-spot'],
		queryFn: () => fetchJson<SpotMarket[]>('/api/hyperliquid/spot'),
		staleTime: 60_000,
		refetchOnWindowFocus: false
	})

	return { ...query, markets: query.data ?? [] }
}

export function useHyperliquidPredictedFundings() {
	const query = useQuery<PredictedFunding[]>({
		queryKey: ['hl-predicted-fundings'],
		queryFn: () => fetchJson<PredictedFunding[]>('/api/hyperliquid/predicted-fundings'),
		staleTime: 60_000,
		refetchOnWindowFocus: false
	})

	return { ...query, fundings: query.data ?? [] }
}

export function useHyperliquidL2Book(coin: string, nSigFigs = 5) {
	const query = useQuery<HyperliquidL2Book>({
		queryKey: ['hl-l2-book', coin, nSigFigs],
		queryFn: () =>
			fetchJson<HyperliquidL2Book>(`/api/hyperliquid/l2-book?coin=${encodeURIComponent(coin)}&nSigFigs=${nSigFigs}`),
		staleTime: 10_000,
		refetchOnWindowFocus: false
	})

	return { ...query, book: query.data ?? null }
}

export function useHyperliquidCandles(coin: string, interval: string, limit = 200) {
	const query = useQuery<HyperliquidCandle[]>({
		queryKey: ['hl-candles', coin, interval, limit],
		queryFn: () =>
			fetchJson<HyperliquidCandle[]>(
				`/api/hyperliquid/candles?coin=${encodeURIComponent(coin)}&interval=${encodeURIComponent(interval)}&limit=${limit}`
			),
		staleTime: 10_000,
		refetchOnWindowFocus: false
	})

	return { ...query, candles: query.data ?? [] }
}

const DEFAULT_HLP_DATA = {
	summary: {
		accountValue: 0,
		totalNtlPos: 0,
		totalMarginUsed: 0,
		positionCount: 0,
		withdrawable: 0,
		crossMaintenanceMarginUsed: 0,
		snapshotTime: null
	},
	positions: [],
	recentFills: []
}

export function useHyperliquidHlpPositions() {
	const query = useQuery<HlpData>({
		queryKey: ['hl-hlp-positions'],
		queryFn: () => fetchJson<HlpData>('/api/hyperliquid/hlp-positions'),
		staleTime: 30_000,
		refetchInterval: 30_000,
		refetchOnWindowFocus: false
	})

	return { ...query, hlpData: query.data ?? DEFAULT_HLP_DATA }
}

export function useHyperliquidHlpOpenOrders() {
	const query = useQuery<HlpOpenOrder[]>({
		queryKey: ['hl-hlp-open-orders'],
		queryFn: () => fetchJson<HlpOpenOrder[]>('/api/hyperliquid/hlp-open-orders'),
		staleTime: 30_000,
		refetchInterval: 30_000,
		refetchOnWindowFocus: false
	})

	return { ...query, openOrders: query.data ?? [] }
}

export function useHyperliquidHlpFunding(window: '24h' | '7d' | '30d') {
	const query = useQuery<HlpFundingData>({
		queryKey: ['hl-hlp-funding', window],
		queryFn: () => fetchJson<HlpFundingData>(`/api/hyperliquid/hlp-funding?window=${window}`),
		staleTime: 30_000,
		refetchInterval: 30_000,
		refetchOnWindowFocus: false
	})

	return {
		...query,
		funding: query.data ?? { window, totalUsdc: 0, byVault: { A: 0, B: 0 }, events: [] }
	}
}

export function useHyperliquidHlpPortfolio(window: 'day' | 'week' | 'month' | 'allTime') {
	const query = useQuery<HlpPortfolioData>({
		queryKey: ['hl-hlp-portfolio', window],
		queryFn: () => fetchJson<HlpPortfolioData>(`/api/hyperliquid/hlp-portfolio?window=${window}`),
		staleTime: 30_000,
		refetchInterval: 60_000,
		refetchOnWindowFocus: false
	})

	return {
		...query,
		portfolio: query.data ?? { window, volume: 0, points: [], byVaultVolume: { A: 0, B: 0 } }
	}
}

export function useCountdown(targetMs: number | null) {
	const [now, setNow] = useState(Date.now())

	useEffect(() => {
		if (!targetMs) return
		const id = setInterval(() => setNow(Date.now()), 1000)
		return () => clearInterval(id)
	}, [targetMs])

	return useMemo(() => {
		if (!targetMs) return '—'
		const diff = Math.max(0, targetMs - now)
		const totalSeconds = Math.floor(diff / 1000)
		const hours = Math.floor(totalSeconds / 3600)
		const minutes = Math.floor((totalSeconds % 3600) / 60)
		const seconds = totalSeconds % 60
		return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds
			.toString()
			.padStart(2, '0')}`
	}, [now, targetMs])
}
