import { useMemo } from 'react'
import dynamic from 'next/dynamic'
import { formatChartTvlsByDay } from '~/hooks/data'
import { formattedNum, getPercentChange, getTokenDominance } from '~/utils'
import { formatDataWithExtraTvls } from '~/hooks/data/defi'
import { useLocalStorageSettingsManager } from '~/contexts/LocalStorage'
import { ProtocolsTableWithSearch } from '~/components/Table/Defi/Protocols'
import type { ILineAndBarChartProps } from '~/components/ECharts/types'
import { oldBlue } from '~/constants/colors'

const LineAndBarChart = dynamic(() => import('~/components/ECharts/LineAndBarChart'), {
	ssr: false,
	loading: () => <></>
}) as React.FC<ILineAndBarChartProps>

export const ForksByProtocol = ({ chartData, filteredProtocols, parentTokens }) => {
	const [extraTvlsEnabled] = useLocalStorageSettingsManager('tvl')

	const { protocolsData, parentForks, charts, totalValueUSD, volumeChangeUSD } = useMemo(() => {
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
			charts: {
				TVL: {
					name: 'TVL',
					type: 'line',
					stack: 'TVL',
					data: finalChartData,
					color: oldBlue
				}
			} as const,
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
			<div className="grid grid-cols-2 relative isolate xl:grid-cols-3 gap-1">
				<div className="bg-[var(--cards-bg)] rounded-md flex flex-col gap-6 p-5 col-span-2 w-full xl:col-span-1 overflow-x-auto">
					<p className="flex flex-col gap-1 text-base">
						<span className="text-[#545757] dark:text-[#cccccc]">Total Value Locked</span>
						<span className="font-jetbrains font-semibold text-2xl">{tvl}</span>
					</p>

					<p className="flex flex-col gap-1 text-base">
						<span className="text-[#545757] dark:text-[#cccccc]">Change (24h)</span>
						<span className="font-jetbrains font-semibold text-2xl">{percentChange || 0}%</span>
					</p>

					<p className="flex flex-col gap-1 text-base">
						<span className="text-[#545757] dark:text-[#cccccc]">{topToken.name} Dominance</span>
						<span className="font-jetbrains font-semibold text-2xl">{dominance}%</span>
					</p>
				</div>
				<div className="bg-[var(--cards-bg)] rounded-md flex flex-col col-span-2 min-h-[360px]">
					<LineAndBarChart charts={charts} alwaysShowTooltip />
				</div>
			</div>

			<ProtocolsTableWithSearch data={protocolsData as any} />
		</>
	)
}
