import * as React from 'react'
import { useRouter } from 'next/router'
import dynamic from 'next/dynamic'
import Layout from '~/layout'
import { maxAgeForNext } from '~/api'
import { getSimpleProtocolsPageData } from '~/api/categories/protocols'
import { IChartProps } from '~/components/ECharts/types'
import { PROTOCOL_API } from '~/constants'
import { slug, tokenIconPaletteUrl } from '~/utils'
import { SelectLegendMultiple } from '~/components/ECharts/shared'
import { getColor } from '~/utils/getColor'
import { ProtocolsChainsSearch } from '~/components/Search/ProtocolsChains'
import { useDefiManager } from '~/contexts/LocalStorage'
import { formatProtocolsTvlChartData } from '~/components/ECharts/ProtocolChart/useFetchAndFormatChartData'
import { fuseProtocolData } from '~/api/categories/protocols'
import { withPerformanceLogging } from '~/utils/perf'
import { useQuery } from '@tanstack/react-query'

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

const fetchProtocols = async (selectedProtocols: Array<string> | null) => {
	if (!selectedProtocols) return null

	try {
		const data = await Promise.all(
			selectedProtocols.map((p) => fetch(`${PROTOCOL_API}/${slug(p)}`).then((res) => res.json()))
		)

		return data
	} catch (error) {
		throw new Error(error instanceof Error ? error.message : 'Failed to fetch')
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

	const { data, isLoading } = useQuery({
		queryKey: ['compare-protocols', selectedProtocols?.join('') ?? ''],
		queryFn: () => fetchProtocols(selectedProtocols),
		staleTime: 60 * 60 * 1000
	})

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
					protocol: values
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
			<ProtocolsChainsSearch />

			<div className="relative flex flex-col">
				<SelectLegendMultiple
					title={'Selected Protocols'}
					allOptions={protocols}
					options={selectedProtocols ?? []}
					setOptions={setSelectedProtocols}
				/>
				<div className="relative col-span-2 p-4 shadow rounded-xl">
					<AreaChart
						chartData={chartData}
						title="Protocols"
						valueSymbol="$"
						stacks={selectedProtocols}
						stackColors={colors}
						hideDefaultLegend
					/>
					{isLoading && (
						<p className="text-[var(--text1)] text-center absolute top-0 right-0 bottom-0 left-0 grid place-items-center">
							Loading...
						</p>
					)}
				</div>
			</div>
		</Layout>
	)
}
