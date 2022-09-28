import * as React from 'react'
import { useRouter } from 'next/router'
import dynamic from 'next/dynamic'
import useSWR from 'swr'
import styled from 'styled-components'
import Layout from '~/layout'
import { revalidate } from '~/api'
import { getSimpleProtocolsPageData } from '~/api/categories/protocols'
import { IChartProps } from '~/components/ECharts/types'
import { arrayFetcher } from '~/utils/useSWR'
import { PROTOCOL_API } from '~/constants'
import { slug } from '~/utils'
import { SelectLegendMultiple } from '~/components/ECharts/shared'
import { getColor } from '~/utils/getColor'
import { ProtocolsChainsSearch } from '~/components/Search'
import { useDefiManager } from '~/contexts/LocalStorage'
import { formatProtocolsTvlChartData } from '~/components/ECharts/AreaChart/ProtocolTvl'
import { fuseProtocolData } from '~/api/categories/protocols'

const AreaChart = dynamic(() => import('~/components/ECharts/AreaChart'), {
	ssr: false
}) as React.FC<IChartProps>

export async function getStaticProps() {
	const { protocols } = await getSimpleProtocolsPageData(['name', 'logo'])

	const stackColors = await Promise.allSettled(
		protocols.map(async (p) => ({ [p.name]: await getColor(slug(p.name), p.logo) }))
	)

	let colors = {}

	stackColors.forEach((p) => {
		if (p.status === 'fulfilled' && p.value) {
			colors = { ...colors, ...p.value }
		}
	})

	return {
		props: {
			protocols: protocols.map((p) => p.name),
			stackColors: colors
		},
		revalidate: revalidate()
	}
}

export default function CompareProtocolsTvls({
	protocols,
	stackColors
}: {
	protocols: Array<string>
	stackColors: { [stack: string]: string }
}) {
	const router = useRouter()
	const [extraTvlEnabled] = useDefiManager()

	const { protocol } = router.query
	const selectedProtocols = protocol ? (typeof protocol === 'string' ? [protocol] : [...protocol]) : null

	const { data, error } = useSWR('compare-protocols' + selectedProtocols?.join(''), () =>
		arrayFetcher(selectedProtocols?.map((p) => `${PROTOCOL_API}/${slug(p)}`))
	)

	const isLoading = !data && !error

	const chartData = React.useMemo(() => {
		const formattedData =
			data?.map((x) => {
				const { historicalChainTvls, tvlChartData } = fuseProtocolData(x)

				return {
					protocolChartData: formatProtocolsTvlChartData({ historicalChainTvls, extraTvlEnabled, tvlChartData }),
					protocolName: x.name
				}
			}) ?? []

		const chartData = {}

		formattedData.forEach(({ protocolChartData, protocolName }) => {
			protocolChartData.forEach(([date, tvl]) => {
				let timestamp = new Date(date).getTime()

				if (timestamp % 400 < 500) {
					timestamp -= timestamp % 400
				}

				if (timestamp % 400 > 500) {
					timestamp += timestamp % 400
				}

				if (!chartData[timestamp]) {
					chartData[timestamp] = {}
				}

				chartData[timestamp] = {
					[protocolName]: tvl
				}
			})
		})

		return Object.keys(chartData).map((date) => ({ date, ...chartData[date] }))
	}, [data, extraTvlEnabled])

	const setSelectedProtocols = (values) => {
		router.push(
			{
				pathname: router.pathname,
				query: {
					protocol: values
				}
			},
			undefined,
			{
				shallow: true
			}
		)
	}

	return (
		<Layout title={`Compare Protocols TVLs - DefiLlama`} defaultSEO>
			<ProtocolsChainsSearch step={{ category: 'Home', name: 'Compare Protocols' }} />

			<Wrapper>
				<Legend
					title={'Selected Protocols'}
					allOptions={protocols}
					options={selectedProtocols ?? []}
					setOptions={setSelectedProtocols}
				/>
				<ChartWrapper>
					<AreaChart
						chartData={chartData}
						title="Protocols"
						valueSymbol="$"
						stacks={protocols}
						stackColors={stackColors}
						hidedefaultlegend
					/>
					{isLoading && <Loading>Loading...</Loading>}
				</ChartWrapper>
			</Wrapper>
		</Layout>
	)
}

const Wrapper = styled.div`
	position: relative;
	height: 424px;
	display: flex;
	flex-direction: column;
`

const ChartWrapper = styled.div`
	margin-top: auto;
	position: relative;
	padding: 12px;
	border-radius: 12px;
	background: ${({ theme }) => theme.bg7};
	height: 384px;
`

const Loading = styled.div`
	position: absolute;
	top: 0;
	right: 0;
	bottom: 0;
	left: 0;
	display: grid;
	place-items: center;
	z-index: 1;
	background: ${({ theme }) => theme.bg7};
	height: 384px;
	border-radius: 12px;
`

const Legend = styled(SelectLegendMultiple)`
	position: absolute;
	top: 0;
	right: 0;
`

const mergeProtocolsChartData = () => {
	return []
}
