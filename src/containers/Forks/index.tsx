import { lazy, Suspense, useMemo } from 'react'
import type { IMultiSeriesChart2Props } from '~/components/ECharts/types'
import { ProtocolsTableWithSearch } from '~/components/Table/Defi/Protocols'
import { CHART_COLORS } from '~/constants/colors'
import { useLocalStorageSettingsManager } from '~/contexts/LocalStorage'
import { formatChartTvlsByDay } from '~/hooks/data'
import { formatDataWithExtraTvls } from '~/hooks/data/defi'
import { formattedNum, getPercentChange, getTokenDominance } from '~/utils'

const MultiSeriesChart2 = lazy(
	() => import('~/components/ECharts/MultiSeriesChart2')
) as React.FC<IMultiSeriesChart2Props>

export const ForksByProtocol = ({ chartData, filteredProtocols, parentTokens }) => {
	const [extraTvlsEnabled] = useLocalStorageSettingsManager('tvl')

	const {
		protocolsData,
		parentForks: _parentForks,
		dataset,
		charts,
		totalValueUSD,
		volumeChangeUSD
	} = useMemo(() => {
		const protocolsData = formatDataWithExtraTvls({
			data: filteredProtocols,
			extraTvlsEnabled
		})

		const parentForks = formatDataWithExtraTvls({
			data: parentTokens,
			extraTvlsEnabled
		})

		const finalChartData = formatChartTvlsByDay({ data: chartData, extraTvlsEnabled, key: 'TVL' })

		const totalValueUSD = finalChartData[finalChartData.length - 1][1]
		const tvlPrevDay = finalChartData[finalChartData.length - 2][1]
		const volumeChangeUSD = getPercentChange(totalValueUSD, tvlPrevDay)

		return {
			protocolsData,
			parentForks,
			dataset: {
				source: finalChartData.map(([timestamp, value]) => ({ timestamp, TVL: value })),
				dimensions: ['timestamp', 'TVL'] as string[]
			},
			charts: [
				{
					type: 'line' as const,
					name: 'TVL',
					encode: { x: 'timestamp', y: 'TVL' },
					color: CHART_COLORS[0],
					stack: 'TVL'
				}
			],
			totalValueUSD,
			volumeChangeUSD
		}
	}, [chartData, filteredProtocols, parentTokens, extraTvlsEnabled])

	const topToken: { name?: string; tvl?: number } = {}

	if (protocolsData.length > 0) {
		topToken.name = protocolsData[0]?.name
		topToken.tvl = protocolsData[0]?.tvl
	}

	const tvl = formattedNum(totalValueUSD, true)

	const dominance = getTokenDominance(topToken, totalValueUSD)

	const percentChange = volumeChangeUSD?.toFixed(2)

	return (
		<>
			<div className="relative isolate grid grid-cols-2 gap-2 xl:grid-cols-3">
				<div className="col-span-2 flex w-full flex-col gap-6 overflow-x-auto rounded-md border border-(--cards-border) bg-(--cards-bg) p-5 xl:col-span-1">
					<p className="flex flex-col gap-1 text-base">
						<span className="text-(--text-label)">Total Value Locked</span>
						<span className="font-jetbrains text-2xl font-semibold">{tvl}</span>
					</p>

					<p className="flex flex-col gap-1 text-base">
						<span className="text-(--text-label)">Change (24h)</span>
						<span className="font-jetbrains text-2xl font-semibold">{percentChange || 0}%</span>
					</p>

					<p className="flex flex-col gap-1 text-base">
						<span className="text-(--text-label)">{topToken.name} Dominance</span>
						<span className="font-jetbrains text-2xl font-semibold">{dominance}%</span>
					</p>
				</div>
				<div className="col-span-2 min-h-[408px] rounded-md border border-(--cards-border) bg-(--cards-bg)">
					<Suspense fallback={<div className="min-h-[408px]" />}>
						<MultiSeriesChart2 dataset={dataset} charts={charts} alwaysShowTooltip exportButtons="auto" />
					</Suspense>
				</div>
			</div>

			<ProtocolsTableWithSearch data={protocolsData as any} />
		</>
	)
}
