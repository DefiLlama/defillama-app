import { useQueryClient } from '@tanstack/react-query'
import { useCallback, useEffect, useRef, useState } from 'react'
import type { ProDashboardServerProps } from '../queries.server'
import type { TableServerData } from '../server/tableQueries'
import type { Dashboard } from '../services/DashboardAPI'

const PROTOCOLS_LIST_QUERY_KEY = ['protocols-lite']

export interface DashboardStreamState {
	isStreaming: boolean
	/** undefined = not received yet, null = received as null, Dashboard = received */
	dashboard: Dashboard | null | undefined
	protocolsAndChains: { protocols: any[]; chains: any[] } | null
	appMetadata: ProDashboardServerProps['appMetadata'] | null
	isDone: boolean
	error: string | null
}

function seedTableDataIntoCache(
	queryClient: ReturnType<typeof useQueryClient>,
	tableData: TableServerData,
	now: number
) {
	if (tableData.protocolsList) {
		queryClient.setQueryData(PROTOCOLS_LIST_QUERY_KEY, tableData.protocolsList, { updatedAt: now })
	}
	for (const [chain, data] of Object.entries(tableData.volumeByChain)) {
		queryClient.setQueryData(['pro-dashboard', 'protocols-volume-by-chain', chain], data, { updatedAt: now })
	}
	for (const [chain, data] of Object.entries(tableData.feesByChain)) {
		queryClient.setQueryData(['pro-dashboard', 'protocols-fees-revenue-by-chain', chain], data, { updatedAt: now })
	}
	for (const [chain, data] of Object.entries(tableData.perpsByChain)) {
		queryClient.setQueryData(['pro-dashboard', 'protocols-perps-volume-by-chain', chain], data, { updatedAt: now })
	}
	for (const [chain, data] of Object.entries(tableData.openInterestByChain)) {
		queryClient.setQueryData(['pro-dashboard', 'protocols-open-interest-by-chain', chain], data, { updatedAt: now })
	}
	for (const [keyJson, data] of Object.entries(tableData.datasetsByQueryKey)) {
		try {
			const queryKey = JSON.parse(keyJson)
			queryClient.setQueryData(queryKey, data, { updatedAt: now })
		} catch {}
	}
	for (const [keyJson, data] of Object.entries(tableData.tokenUsageByQueryKey)) {
		try {
			const queryKey = JSON.parse(keyJson)
			queryClient.setQueryData(queryKey, data, { updatedAt: now })
		} catch {}
	}
}

export function useDashboardStream(dashboardId: string | undefined): DashboardStreamState {
	const queryClient = useQueryClient()
	const [state, setState] = useState<DashboardStreamState>({
		isStreaming: false,
		dashboard: undefined,
		protocolsAndChains: null,
		appMetadata: null,
		isDone: !dashboardId || dashboardId === 'new',
		error: null
	})
	const abortRef = useRef<AbortController | null>(null)

	const handleLine = useCallback(
		(line: string) => {
			if (!line.trim()) return

			try {
				const chunk = JSON.parse(line)
				const now = Date.now()

				switch (chunk.type) {
					case 'dashboard':
						// Dashboard is seeded into cache by the provider (needs auth-aware key)
						setState((s) => ({ ...s, dashboard: chunk.data ?? null }))
						break

					case 'protocolsAndChains':
						setState((s) => ({ ...s, protocolsAndChains: chunk.data }))
						if (chunk.data) {
							queryClient.setQueryData(['pro-dashboard', 'protocols-and-chains'], chunk.data, {
								updatedAt: now
							})
						}
						break

					case 'appMetadata':
						setState((s) => ({ ...s, appMetadata: chunk.data }))
						if (chunk.data) {
							queryClient.setQueryData(['pro-dashboard', 'app-metadata'], chunk.data, { updatedAt: now })
						}
						break

					case 'chartData':
						if (chunk.queryKey) {
							queryClient.setQueryData(chunk.queryKey, chunk.data ?? [], { updatedAt: now })
						}
						break

					case 'tableData':
						if (chunk.data) {
							seedTableDataIntoCache(queryClient, chunk.data, now)
						}
						break

					case 'yieldsChartData':
						if (chunk.data) {
							queryClient.setQueryData(['yield-pool-chart-data', chunk.id], chunk.data.chart ?? null, {
								updatedAt: now
							})
							queryClient.setQueryData(['yield-lend-borrow-chart', chunk.id], chunk.data.lendBorrow ?? null, {
								updatedAt: now
							})
						}
						break

					case 'protocolFullData':
						if (chunk.data) {
							queryClient.setQueryData(['protocol-overview-v1', chunk.id, 'metrics'], chunk.data, {
								updatedAt: now
							})
						}
						break

					case 'metricData':
						if (chunk.key && chunk.data) {
							try {
								queryClient.setQueryData(JSON.parse(chunk.key), chunk.data, { updatedAt: now })
							} catch {}
						}
						break

					case 'advancedTvlBasicData':
						queryClient.setQueryData(['pro-dashboard', 'advanced-tvl-basic', chunk.id], chunk.data ?? [], {
							updatedAt: now
						})
						break

					case 'unifiedTableData':
						if (chunk.key && chunk.data) {
							try {
								queryClient.setQueryData(JSON.parse(chunk.key), chunk.data, { updatedAt: now })
							} catch {}
						}
						break

					case 'stablecoinsChartData':
						if (chunk.data) {
							queryClient.setQueryData(['pro-dashboard', 'stablecoins-chart-data', chunk.chain], chunk.data, {
								updatedAt: now
							})
						}
						break

					case 'rwaBreakdownData':
						if (chunk.data) {
							queryClient.setQueryData(
								['pro-dashboard', 'rwa-breakdown-chart', chunk.breakdown, chunk.metric, chunk.chain],
								chunk.data,
								{ updatedAt: now }
							)
						}
						break

					case 'rwaAssetChartData':
						if (chunk.data && chunk.id) {
							queryClient.setQueryData(['pro-dashboard', 'rwa-asset-chart', chunk.id], chunk.data, {
								updatedAt: now
							})
						}
						break

					case 'rwaAssetsTableData':
						if (chunk.data) {
							queryClient.setQueryData(['pro-dashboard', 'rwa-assets-table'], chunk.data, {
								updatedAt: now
							})
						}
						break

					case 'rwaChainsTableData':
						if (chunk.data) {
							queryClient.setQueryData(['pro-dashboard', 'rwa-chains-table'], chunk.data, {
								updatedAt: now
							})
						}
						break

					case 'rwaChainAssetsTableData':
						if (chunk.data && chunk.chain) {
							queryClient.setQueryData(['pro-dashboard', 'rwa-chain-assets-table', chunk.chain], chunk.data, {
								updatedAt: now
							})
						}
						break

					case 'emissionData':
						if (chunk.key && chunk.data) {
							try {
								queryClient.setQueryData(JSON.parse(chunk.key), chunk.data, { updatedAt: now })
							} catch {}
						}
						break

					case 'done':
						setState((s) => ({ ...s, isStreaming: false, isDone: true }))
						break
				}
			} catch {
				// Ignore malformed lines
			}
		},
		[queryClient]
	)

	useEffect(() => {
		if (!dashboardId || dashboardId === 'new') return

		// Abort any previous stream before starting a new one
		abortRef.current?.abort()

		const abortController = new AbortController()
		abortRef.current = abortController

		setState({
			isStreaming: true,
			dashboard: undefined,
			protocolsAndChains: null,
			appMetadata: null,
			isDone: false,
			error: null
		})

		const startStream = async () => {
			try {
				const response = await fetch(`/api/dashboard/${dashboardId}/stream?_=${Math.random().toString(36).slice(2)}`, {
					credentials: 'include',
					signal: abortController.signal
				})

				if (!response.ok || !response.body) {
					setState((s) => ({
						...s,
						isStreaming: false,
						isDone: true,
						error: `Stream failed: ${response.status}`
					}))
					return
				}

				const reader = response.body.getReader()
				const decoder = new TextDecoder()
				let lineBuffer = ''

				try {
					while (true) {
						if (abortController.signal.aborted) break

						const { done, value } = await reader.read()

						if (done) {
							// Flush remaining buffer
							if (lineBuffer.trim()) {
								handleLine(lineBuffer.trim())
							}
							break
						}

						const chunk = decoder.decode(value, { stream: true })
						lineBuffer += chunk

						const lines = lineBuffer.split('\n')

						if (lines.length > 0 && !chunk.endsWith('\n')) {
							lineBuffer = lines.pop() || ''
						} else {
							lineBuffer = ''
						}

						for (const line of lines) {
							handleLine(line)
						}
					}
				} finally {
					try {
						reader.releaseLock()
					} catch {}
				}

				setState((s) => (s.isDone ? s : { ...s, isStreaming: false, isDone: true }))
			} catch (err) {
				if (abortController.signal.aborted) return
				setState((s) => ({
					...s,
					isStreaming: false,
					isDone: true,
					error: err instanceof Error ? err.message : 'Stream failed'
				}))
			}
		}

		startStream()

		return () => {
			abortController.abort()
		}
	}, [dashboardId, handleLine])

	return state
}
