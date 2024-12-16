import dynamic from 'next/dynamic'
import { useQuery } from '@tanstack/react-query'
import React from 'react'
import { fuseProtocolData } from '~/api/categories/protocols'
import { PROTOCOL_API } from '~/constants'
import { slug } from '~/utils'
import { fetchApi } from '~/utils/async'
import { formatProtocolsTvlChartData } from '~/components/ECharts/ProtocolChart/useFetchAndFormatChartData'
import { useDarkModeManager, useDefiManager } from '~/contexts/LocalStorage'
import { LocalLoader } from '~/components/LocalLoader'
import { DialogState } from 'ariakit'

const ChainChart: any = dynamic(() => import('~/components/ECharts/ChainChart'), {
	ssr: false
})

const useProtocols = (protocols: string[], chain?: string) => {
	const { data, isLoading } = useQuery({
		queryKey: ['compare-protocols' + protocols?.join('')],
		queryFn: () => fetchApi(protocols?.map((p) => `${PROTOCOL_API}/${slug(p)}`)),
		staleTime: 60 * 60 * 1000
	})

	const [extraTvlEnabled] = useDefiManager()
	const chartData = React.useMemo(() => {
		try {
			const formattedData =
				data?.map((x) => {
					const { historicalChainTvls } = fuseProtocolData(x)
					return {
						chain: x.name,
						globalChart: formatProtocolsTvlChartData({
							historicalChainTvls:
								chain && chain !== 'All' ? { [chain]: historicalChainTvls[chain] || {} } : historicalChainTvls,
							extraTvlEnabled
						}).filter((x) => +x[0] % 86400 === 0)
					}
				}) ?? []

			return formattedData
		} catch (e) {
			console.error(e)
			return []
		}
	}, [data, extraTvlEnabled])

	return { data, isLoading, chartData }
}

export const CompareProtocols = ({
	protocols,
	chain,
	dialogState
}: {
	protocols: string[]
	chain: string
	dialogState?: DialogState
}) => {
	const { isLoading, chartData } = useProtocols(protocols, chain)
	const [isDark] = useDarkModeManager()

	return (
		<>
			{chartData.length > 0 && !isLoading && dialogState?.mounted ? (
				<ChainChart datasets={chartData} title="" compareMode isThemeDark={isDark} showLegend />
			) : (
				<div className="flex items-center justify-center m-auto min-h-[360px]">
					<LocalLoader />
				</div>
			)}
		</>
	)
}
