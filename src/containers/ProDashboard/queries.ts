import { useQuery, useQueries } from '@tanstack/react-query'
import { CHAINS_API, PROTOCOLS_API } from '~/constants'
import { sluggify } from '~/utils/cache-client'
import ProtocolCharts from './services/ProtocolCharts'
import ChainCharts from './services/ChainCharts'

export function useChains() {
	return useQuery({
		queryKey: ['chains'],
		queryFn: async () => {
			const response = await fetch(CHAINS_API)
			const data = await response.json()
			return data.sort((a, b) => b.tvl - a.tvl)
		}
	})
}

export function useProtocolsAndChains() {
	return useQuery({
		queryKey: ['protocols'],
		queryFn: async () => {
			const response = await fetch(PROTOCOLS_API)
			if (!response.ok) {
				throw new Error('Network response was not ok')
			}
			const data = await response.json()
			return {
				protocols: data.protocols.map((p) => ({ ...p, slug: sluggify(p.name), geckoId: p.geckoId || null })),
				chains: data.chains.map((name) => ({ name, slug: sluggify(name) }))
			}
		}
	})
}

export function useTvlData(chain: string) {
	return useQuery({
		queryKey: ['tvl', chain],
		queryFn: () => ChainCharts.tvl(chain),
		enabled: !!chain
	})
}

export function useVolumeData(chain: string) {
	return useQuery({
		queryKey: ['volume', chain],
		queryFn: () => ChainCharts.volume(chain),
		enabled: !!chain
	})
}

export function useFeesData(chain: string) {
	return useQuery({
		queryKey: ['fees', chain],
		queryFn: () => ChainCharts.fees(chain),
		enabled: !!chain
	})
}

export function useChartData(chain: string, type: string) {
	const getQueryFn = (chartType) => {
		switch (chartType) {
			case 'tvl':
				return () => ChainCharts.tvl(chain)
			case 'volume':
				return () => ChainCharts.volume(chain)
			case 'fees':
				return () => ChainCharts.fees(chain)
			case 'users':
				return () => ChainCharts.users(chain)
			case 'txs':
				return () => ChainCharts.txs(chain)
			case 'aggregators':
				return () => ChainCharts.aggregators(chain)
			case 'perps':
				return () => ChainCharts.perps(chain)
			case 'bridgeAggregators':
				return () => ChainCharts.bridgeAggregators(chain)
			case 'perpsAggregators':
				return () => ChainCharts.perpsAggregators(chain)
			case 'options':
				return () => ChainCharts.options(chain)
			case 'revenue':
				return () => ChainCharts.revenue(chain)
			case 'bribes':
				return () => ChainCharts.bribes(chain)
			case 'tokenTax':
				return () => ChainCharts.tokenTax(chain)
			case 'activeUsers':
				return () => ChainCharts.activeUsers(chain)
			case 'newUsers':
				return () => ChainCharts.newUsers(chain)
			case 'gasUsed':
				return () => ChainCharts.gasUsed(chain)
			default:
				console.error(`Unknown chart type: ${chartType}`)
				return () => ChainCharts.tvl(chain)
		}
	}

	return useQuery({
		queryKey: [type, chain],
		queryFn: getQueryFn(type),
		enabled: !!chain
	})
}

export function useChartsData(charts) {
	return useQueries({
		queries: charts.map((chart) => ({
			queryKey: [chart.type, chart.chain, chart.protocol, chart.geckoId].filter(Boolean),
			queryFn: () => {
				if (chart.protocol) {
					switch (chart.type) {
						case 'tvl':
							return ProtocolCharts.tvl(chart.protocol)
						case 'volume':
							return ProtocolCharts.volume(chart.protocol)
						case 'fees':
							return ProtocolCharts.fees(chart.protocol)
						case 'revenue':
							return ProtocolCharts.revenue(chart.protocol)
						case 'tokenMcap':
							return ProtocolCharts.tokenMcap(chart.protocol, chart.geckoId)
						case 'tokenPrice':
							return ProtocolCharts.tokenPrice(chart.protocol, chart.geckoId)
						case 'tokenVolume':
							return ProtocolCharts.tokenVolume(chart.protocol, chart.geckoId)
						case 'medianApy':
							return ProtocolCharts.medianApy(chart.protocol)

						default:
							console.error(`Unknown chart type for protocol: ${chart.type}`)
							return Promise.resolve([])
					}
				} else if (chart.chain) {
					switch (chart.type) {
						case 'tvl':
							return ChainCharts.tvl(chart.chain)
						case 'volume':
							return ChainCharts.volume(chart.chain)
						case 'fees':
							return ChainCharts.fees(chart.chain)
						case 'users':
							return ChainCharts.users(chart.chain)
						case 'txs':
							return ChainCharts.txs(chart.chain)
						case 'aggregators':
							return ChainCharts.aggregators(chart.chain)
						case 'perps':
							return ChainCharts.perps(chart.chain)
						case 'bridgeAggregators':
							return ChainCharts.bridgeAggregators(chart.chain)
						case 'perpsAggregators':
							return ChainCharts.perpsAggregators(chart.chain)
						case 'options':
							return ChainCharts.options(chart.chain)
						case 'revenue':
							return ChainCharts.revenue(chart.chain)
						case 'bribes':
							return ChainCharts.bribes(chart.chain)
						case 'tokenTax':
							return ChainCharts.tokenTax(chart.chain)
						case 'activeUsers':
							return ChainCharts.activeUsers(chart.chain)
						case 'newUsers':
							return ChainCharts.newUsers(chart.chain)
						case 'gasUsed':
							return ChainCharts.gasUsed(chart.chain)
						default:
							console.error(`Unknown chart type for chain: ${chart.type}`)
							return ChainCharts.tvl(chart.chain)
					}
				} else {
					console.error('Chart configuration must include either a chain or a protocol.')
					return Promise.resolve([])
				}
			},
			enabled: !!(chart.chain || chart.protocol)
		}))
	})
}
