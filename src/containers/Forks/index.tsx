import { useMemo } from 'react'
import dynamic from 'next/dynamic'
import { RowLinksWithDropdown } from '~/components/RowLinksWithDropdown'
import { formatChartTvlsByDay } from '~/hooks/data'
import { formattedNum, getPercentChange, getPrevTvlFromChart2, getTokenDominance } from '~/utils'
import { formatDataWithExtraTvls } from '~/hooks/data/defi'
import { useDefiManager } from '~/contexts/LocalStorage'
import { ProtocolsTableWithSearch } from '~/components/Table/Defi/Protocols'
import type { IChartProps } from '~/components/ECharts/types'
import Layout from '~/layout'

const Chart = dynamic(() => import('~/components/ECharts/AreaChart2'), {
	ssr: false,
	loading: () => <></>
}) as React.FC<IChartProps>

const charts = ['TVL']

const chartColors = {
	TVL: '#4f8fea'
}

export const ForksByProtocol = ({ chartData, tokenLinks, token, filteredProtocols, parentTokens }) => {
	const [extraTvlsEnabled] = useDefiManager()

	const { protocolsData, parentForks, finalChartData, totalVolume, volumeChangeUSD } = useMemo(() => {
		const protocolsData = formatDataWithExtraTvls({
			data: filteredProtocols,
			extraTvlsEnabled
		})

		const parentForks = formatDataWithExtraTvls({
			data: parentTokens,
			extraTvlsEnabled
		})

		const finalChartData = formatChartTvlsByDay({ data: chartData, extraTvlsEnabled, key: 'TVL' })

		const totalVolume = getPrevTvlFromChart2(finalChartData, 0, 'TVL')
		const tvlPrevDay = getPrevTvlFromChart2(finalChartData, 1, 'TVL')
		const volumeChangeUSD = getPercentChange(totalVolume, tvlPrevDay)
		return { protocolsData, parentForks, finalChartData, totalVolume, volumeChangeUSD }
	}, [chartData, filteredProtocols, parentTokens, extraTvlsEnabled])

	const topToken: { name?: string; tvl?: number } = {}

	if (protocolsData.length > 0) {
		topToken.name = protocolsData[0]?.name
		topToken.tvl = protocolsData[0]?.tvl
	}

	const tvl = formattedNum(totalVolume, true)

	const dominance = getTokenDominance(topToken, totalVolume)

	const percentChange = volumeChangeUSD?.toFixed(2)

	return (
		<Layout title={`Forks - DefiLlama`} defaultSEO>
			{tokenLinks?.length > 0 && (
				<RowLinksWithDropdown links={tokenLinks} activeLink={token} alternativeOthersText="Others" />
			)}

			<div className="grid grid-cols-1 relative isolate xl:grid-cols-[auto_1fr] gap-1">
				<div className="flex flex-col gap-8 p-5 col-span-1 w-full xl:w-[380px] bg-[var(--cards-bg)] rounded-md overflow-x-auto">
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
				<div className="col-span-1 pt-3 min-h-[372px] bg-[var(--cards-bg)] rounded-md">
					<Chart chartData={finalChartData} stackColors={chartColors} stacks={charts} title="" valueSymbol="$" />
				</div>
			</div>

			<ProtocolsTableWithSearch data={protocolsData as any} />
		</Layout>
	)
}
