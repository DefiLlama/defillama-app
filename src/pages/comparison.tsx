import * as React from 'react'
import { useRouter } from 'next/router'
import dynamic from 'next/dynamic'
import useSWR from 'swr'
import styled from 'styled-components'
import Layout from '~/layout'
import { maxAgeForNext } from '~/api'
import { getSimpleProtocolsPageData } from '~/api/categories/protocols'
import { IChartProps } from '~/components/ECharts/types'
import { arrayFetcher } from '~/utils/useSWR'
import { PROTOCOL_API } from '~/constants'
import { slug, tokenIconPaletteUrl } from '~/utils'
import { SelectLegendMultiple } from '~/components/ECharts/shared'
import { getColor } from '~/utils/getColor'
import { ProtocolsChainsSearch } from '~/components/Search'
import { useDefiManager } from '~/contexts/LocalStorage'
import { formatProtocolsTvlChartData } from '~/components/ECharts/ProtocolChart/useFetchAndFormatChartData'
import { fuseProtocolData } from '~/api/categories/protocols'
import { withPerformanceLogging } from '~/utils/perf'

const AreaChart = dynamic(() => import('~/components/ECharts/AreaChart'), {
	ssr: false
}) as React.FC<IChartProps>

const protocolColor = async (name: string) => {
	const color = await getColor(tokenIconPaletteUrl(name))
	return { [name]: color }
}

export const getStaticProps = withPerformanceLogging('comparison', async () => {
	const { protocols } = await getSimpleProtocolsPageData(['name', 'logo'])

	const stackColors = await Promise.allSettled(protocols.map((p) => protocolColor(p.name)))

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
		revalidate: maxAgeForNext([22])
	}
})

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
				const { historicalChainTvls } = fuseProtocolData(x)

				return {
					protocolChartData: formatProtocolsTvlChartData({ historicalChainTvls, extraTvlEnabled }),
					protocolName: x.name
				}
			}) ?? []

		const chartData = {}

		formattedData.forEach(({ protocolChartData, protocolName }) => {
			protocolChartData.forEach(([date, tvl]) => {
				if (chartData[date]) {
					chartData[date] = { ...chartData[date], [protocolName]: tvl }
				} else {
					let closestTimestamp = 0

					// +- 6hours
					for (let i = Number(date) - 21600; i <= Number(date) + 21600; i++) {
						if (chartData[i]) {
							closestTimestamp = i
						}
					}

					if (!closestTimestamp) {
						chartData[date] = {}
						closestTimestamp = Number(date)
					}

					chartData[closestTimestamp] = {
						...chartData[closestTimestamp],
						[protocolName]: tvl
					}
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
					protocol: values.length ? values : ['MakerDAO', 'Curve DEX']
				}
			},
			undefined,
			{
				shallow: true
			}
		)
	}

	const colors = Object.fromEntries(selectedProtocols?.map((p) => [p, stackColors[p]]) ?? [])

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
						stacks={selectedProtocols}
						stackColors={colors}
						hideDefaultLegend
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
