import dynamic from 'next/dynamic'
import styled from 'styled-components'
import { useQuery } from '@tanstack/react-query'
import React from 'react'
import { fuseProtocolData } from '~/api/categories/protocols'
import { PROTOCOL_API } from '~/constants'
import { slug } from '~/utils'
import { fetchApi } from '~/utils/async'
import { formatProtocolsTvlChartData } from '../ECharts/ProtocolChart/useFetchAndFormatChartData'
import { useDarkModeManager, useDefiManager } from '~/contexts/LocalStorage'
import { LocalLoader } from '~/components/LocalLoader'

const ChainChart: any = dynamic(() => import('~/components/ECharts/ChainChart'), {
	ssr: false
})

const ModalBody = styled.div`
	display: flex;
	flex-direction: column;
	align-items: center;
	width: 70vw;
`

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

const CompareProtocols = ({ protocols, chain }: { protocols: string[]; chain: string }) => {
	const { isLoading, chartData } = useProtocols(protocols, chain)
	const [isDark] = useDarkModeManager()
	return (
		<ModalBody>
			{chartData.length > 0 && !isLoading ? (
				<ChainChart
					datasets={chartData}
					width={'100%'}
					title=""
					compareMode
					isThemeDark={isDark}
					showLegend
					style={{ minWidth: '70vw', maxWidth: '1200px' }}
				/>
			) : (
				<div className="flex items-center justify-center m-auto min-h-[360px]">
					<LocalLoader />
				</div>
			)}
		</ModalBody>
	)
}

export default CompareProtocols
