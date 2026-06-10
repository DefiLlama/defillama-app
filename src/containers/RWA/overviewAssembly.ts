import { rwaSlug } from './rwaSlug'

export type ChainMetricBreakdown = Record<string, number | string> | null
export type DefiMetricBreakdown = Record<string, Record<string, number | string>> | null

export type AggregatedRwaMetrics = {
	totals: {
		onChainMcap: number
		activeMcap: number
		defiActiveTvl: number
	}
	filteredTotals: {
		onChainMcap: number
		activeMcap: number
		defiActiveTvl: number
	}
	hasSelectedChainData: {
		onChainMcap: boolean
		activeMcap: boolean
		defiActiveTvl: boolean
	}
	breakdowns: {
		onChainMcapByChain: Record<string, number>
		activeMcapByChain: Record<string, number>
		defiActiveTvlByProtocol: Record<string, number>
		defiActiveTvlByProtocolFiltered: Record<string, number>
		defiActiveTvlByChain: Record<string, number>
		defiActiveTvlByChainFiltered: Record<string, number>
	}
}

export function aggregateRwaMetrics({
	onChainMcapBreakdown,
	activeMcapBreakdown,
	defiActiveTvlBreakdown,
	selectedChain
}: {
	onChainMcapBreakdown: ChainMetricBreakdown
	activeMcapBreakdown: ChainMetricBreakdown
	defiActiveTvlBreakdown: DefiMetricBreakdown
	selectedChain?: string
}): AggregatedRwaMetrics {
	let totalOnChainMcap = 0
	let totalActiveMcap = 0
	let totalDeFiActiveTvl = 0
	let filteredOnChainMcap = 0
	let filteredActiveMcap = 0
	let filteredDeFiActiveTvl = 0
	const onChainMcapByChain: Record<string, number> = {}
	const activeMcapByChain: Record<string, number> = {}
	const defiActiveTvlByProtocol: Record<string, number> = {}
	const defiActiveTvlByProtocolFiltered: Record<string, number> = {}
	const defiActiveTvlByChain: Record<string, number> = {}
	const defiActiveTvlByChainFiltered: Record<string, number> = {}
	let hasSelectedChainInOnChainMcap = false
	let hasSelectedChainInActiveMcap = false
	let hasSelectedChainInDeFiActiveTvl = false
	const isChainFiltered = !!selectedChain

	if (onChainMcapBreakdown) {
		for (const chain in onChainMcapBreakdown) {
			const value = safeNumber(onChainMcapBreakdown[chain])
			onChainMcapByChain[chain] = (onChainMcapByChain[chain] || 0) + value
			totalOnChainMcap += value
			if (selectedChain && rwaSlug(chain) === selectedChain) {
				hasSelectedChainInOnChainMcap = true
				filteredOnChainMcap += value
			}
		}
	}

	if (activeMcapBreakdown) {
		for (const chain in activeMcapBreakdown) {
			const value = safeNumber(activeMcapBreakdown[chain])
			activeMcapByChain[chain] = (activeMcapByChain[chain] || 0) + value
			totalActiveMcap += value
			if (selectedChain && rwaSlug(chain) === selectedChain) {
				hasSelectedChainInActiveMcap = true
				filteredActiveMcap += value
			}
		}
	}

	if (defiActiveTvlBreakdown) {
		for (const chain in defiActiveTvlBreakdown) {
			const isSelectedChain = !isChainFiltered || rwaSlug(chain) === selectedChain
			if (selectedChain && isSelectedChain) {
				hasSelectedChainInDeFiActiveTvl = true
			}

			let chainTotal = 0
			for (const protocolName in defiActiveTvlBreakdown[chain]) {
				const value = safeNumber(defiActiveTvlBreakdown[chain][protocolName])
				chainTotal += value
				defiActiveTvlByProtocol[protocolName] = (defiActiveTvlByProtocol[protocolName] || 0) + value
				totalDeFiActiveTvl += value

				if (isSelectedChain && selectedChain) {
					defiActiveTvlByProtocolFiltered[protocolName] = (defiActiveTvlByProtocolFiltered[protocolName] || 0) + value
					filteredDeFiActiveTvl += value
				}
			}

			if (chainTotal > 0) {
				defiActiveTvlByChain[chain] = (defiActiveTvlByChain[chain] || 0) + chainTotal
				if (isSelectedChain && selectedChain) {
					defiActiveTvlByChainFiltered[chain] = (defiActiveTvlByChainFiltered[chain] || 0) + chainTotal
				}
			}
		}
	}

	return {
		totals: {
			onChainMcap: totalOnChainMcap,
			activeMcap: totalActiveMcap,
			defiActiveTvl: totalDeFiActiveTvl
		},
		filteredTotals: {
			onChainMcap: filteredOnChainMcap,
			activeMcap: filteredActiveMcap,
			defiActiveTvl: filteredDeFiActiveTvl
		},
		hasSelectedChainData: {
			onChainMcap: hasSelectedChainInOnChainMcap,
			activeMcap: hasSelectedChainInActiveMcap,
			defiActiveTvl: hasSelectedChainInDeFiActiveTvl
		},
		breakdowns: {
			onChainMcapByChain,
			activeMcapByChain,
			defiActiveTvlByProtocol,
			defiActiveTvlByProtocolFiltered,
			defiActiveTvlByChain,
			defiActiveTvlByChainFiltered
		}
	}
}

export function safeNumber(value: unknown): number {
	const n = typeof value === 'number' ? value : Number(value)
	return Number.isFinite(n) ? n : 0
}

export function isEmptyObject(value: unknown): boolean {
	if (!value || typeof value !== 'object' || Array.isArray(value)) return false
	for (const _key in value) return false
	return true
}
