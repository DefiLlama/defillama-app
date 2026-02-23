import { useQueries } from '@tanstack/react-query'
import { useRouter } from 'next/router'
import * as React from 'react'
import type { IMultiSeriesChart2Props } from '~/components/ECharts/types'
import { ensureChronologicalRows } from '~/components/ECharts/utils'
import { LocalLoader } from '~/components/Loaders'
import { MultiSelectCombobox } from '~/components/Select/MultiSelectCombobox'
import { ChainProtocolsTable } from '~/containers/ChainOverview/Table'
import { fetchProtocolBySlug } from '~/containers/ProtocolOverview/api'
import { applyProtocolTvlSettings } from '~/containers/Protocols/utils'
import { useLocalStorageSettingsManager } from '~/contexts/LocalStorage'
import { getNDistinctColors, slug } from '~/utils'
import { parseNumberQueryParam, pushShallowQuery } from '~/utils/routerQuery'
import type { RawProtocolResponse } from './api.types'
import type { CompareProtocolsProps } from './types'

const MultiSeriesChart2 = React.lazy(
	() => import('~/components/ECharts/MultiSeriesChart2')
) as React.FC<IMultiSeriesChart2Props>

type ProtocolChainTvls = Record<string, { tvl?: Array<{ date: number; totalLiquidityUSD: number }> }>

export function CompareProtocols({ protocols, protocolsList }: CompareProtocolsProps) {
	const router = useRouter()

	const [extraTvlEnabled] = useLocalStorageSettingsManager('tvl')

	const { protocol } = router.query

	const selectedProtocols = React.useMemo(() => {
		return protocol ? (typeof protocol === 'string' ? [protocol] : [...protocol]) : []
	}, [protocol])

	const results = useQueries({
		queries: selectedProtocols.map((protocol) => ({
			queryKey: ['compare-protocols', protocol],
			queryFn: async () => {
				const protocolData = await fetchProtocolBySlug<RawProtocolResponse>(slug(protocol))
				return { protocolData }
			},
			staleTime: 60 * 60 * 1000,
			refetchOnWindowFocus: false,
			retry: 0
		}))
	})

	const isLoading = results.some((r) => r.isLoading)

	const minTvl = parseNumberQueryParam(router.query.minTvl)
	const maxTvl = parseNumberQueryParam(router.query.maxTvl)

	const { dataset, charts } = React.useMemo(() => {
		const formattedData = results
			.filter((r) => r.data != null)
			.map((res) => ({
				protocolChartData: (res.data?.protocolData.chainTvls ?? {}) as ProtocolChainTvls,
				protocolName: res.data!.protocolData.name
			}))

		let totalProtocols = 0
		const chartsByProtocol: Record<string, Record<number, number>> = {}

		for (const protocol of formattedData) {
			if (!chartsByProtocol[protocol.protocolName]) {
				chartsByProtocol[protocol.protocolName] = {}
			}

			for (const chain in protocol.protocolChartData) {
				if (chain.includes('-') || chain === 'offers') continue
				if (chain in extraTvlEnabled && !extraTvlEnabled[chain]) continue

				const chainTvl = protocol.protocolChartData[chain]?.tvl
				if (!Array.isArray(chainTvl)) continue

				for (const { date, totalLiquidityUSD } of chainTvl) {
					chartsByProtocol[protocol.protocolName][date] =
						(chartsByProtocol[protocol.protocolName][date] ?? 0) + totalLiquidityUSD
				}
			}
			totalProtocols++
		}

		const distinctColors = getNDistinctColors(totalProtocols)
		const seriesNames: string[] = []
		for (const protocolName in chartsByProtocol) {
			seriesNames.push(protocolName)
		}

		const rowMap = new Map<number, Record<string, number>>()
		for (const protocolName of seriesNames) {
			const protocolChart = chartsByProtocol[protocolName]
			for (const date in protocolChart) {
				const ts = +date * 1e3
				const row = rowMap.get(ts) ?? { timestamp: ts }
				row[protocolName] = protocolChart[+date]
				rowMap.set(ts, row)
			}
		}

		const source = ensureChronologicalRows(Array.from(rowMap.values()))
		const chartsConfig = seriesNames.map((protocolName, i) => ({
			type: 'line' as const,
			name: protocolName,
			encode: { x: 'timestamp', y: protocolName },
			stack: protocolName,
			color: distinctColors[i]
		}))

		return {
			dataset: { source, dimensions: ['timestamp', ...seriesNames] },
			charts: chartsConfig
		}
	}, [results, extraTvlEnabled])

	const { selectedProtocolsData, selectedProtocolsNames } = React.useMemo(() => {
		const selectedProtocolsData = selectedProtocols.reduce<typeof protocols>((acc, protocolName) => {
			const data = protocols.find(
				(p) => p.name === protocolName || p.childProtocols?.find((cp) => cp.name === protocolName)
			)
			if (!data) return acc
			if (data.name === protocolName) {
				acc.push(data)
			} else {
				const child = data.childProtocols?.find((cp) => cp.name === protocolName)
				if (child) {
					acc.push(child)
				}
			}
			return acc
		}, [])
		return { selectedProtocolsData, selectedProtocolsNames: selectedProtocolsData.map((p) => p.name) }
	}, [selectedProtocols, protocols])

	const protocolsTableData = React.useMemo(() => {
		return applyProtocolTvlSettings({
			protocols: selectedProtocolsData,
			extraTvlsEnabled: extraTvlEnabled,
			minTvl,
			maxTvl
		})
	}, [selectedProtocolsData, extraTvlEnabled, minTvl, maxTvl])

	return (
		<>
			<div className="flex items-center gap-3 rounded-md border border-(--cards-border) bg-(--cards-bg)">
				<MultiSelectCombobox
					data={protocolsList}
					placeholder="Select Protocols..."
					selectedValues={selectedProtocolsNames}
					setSelectedValues={(values) => {
						pushShallowQuery(router, { protocol: values.length > 0 ? values : undefined })
					}}
				/>
			</div>
			{selectedProtocols.length > 1 ? (
				<div className="relative flex flex-col gap-2">
					<div className="rounded-md border border-(--cards-border) bg-(--cards-bg)">
						{isLoading || !router.isReady ? (
							<div className="flex h-full min-h-[398px] w-full items-center justify-center">
								<LocalLoader />
							</div>
						) : (
							<React.Suspense fallback={<div className="min-h-[398px]" />}>
								<MultiSeriesChart2 dataset={dataset} charts={charts} valueSymbol="$" exportButtons="auto" />
							</React.Suspense>
						)}
					</div>

					{protocolsTableData.length > 0 ? (
						<div>
							<ChainProtocolsTable protocols={protocolsTableData} useStickyHeader={false} />
						</div>
					) : null}
				</div>
			) : (
				<div className="flex min-h-[362px] items-center justify-center rounded-md border border-(--cards-border) bg-(--cards-bg)">
					<p className="text-sm text-(--text-secondary)">Select at least 2 protocols to compare</p>
				</div>
			)}
		</>
	)
}
