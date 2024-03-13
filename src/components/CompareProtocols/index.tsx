import dynamic from 'next/dynamic'
import styled from 'styled-components'
import { useQuery } from 'react-query'

import React from 'react'
import { fuseProtocolData } from '~/api/categories/protocols'
import { PROTOCOL_API } from '~/constants'
import { slug } from '~/utils'
import { arrayFetcher } from '~/utils/useSWR'
import { formatProtocolsTvlChartData } from '../ECharts/ProtocolChart/useFetchAndFormatChartData'
import { useDarkModeManager, useDefiManager } from '~/contexts/LocalStorage'

import LocalLoader from '../LocalLoader'

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
	const { data, isLoading } = useQuery('compare-protocols' + protocols?.join(''), () =>
		arrayFetcher(protocols?.map((p) => `${PROTOCOL_API}/${slug(p)}`))
	)

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
				<ChainChart datasets={chartData} width={'100%'} title="" compareMode isThemeDark={isDark} showLegend />
			) : (
				<LocalLoader />
			)}
		</ModalBody>
	)
}

export default CompareProtocols
