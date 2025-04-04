import * as React from 'react'
import { useRouter } from 'next/router'
import dynamic from 'next/dynamic'
import Layout from '~/layout'
import { maxAgeForNext } from '~/api'
import { getSimpleProtocolsPageData } from '~/api/categories/protocols'
import { IChartProps } from '~/components/ECharts/types'
import { PROTOCOL_API } from '~/constants'
import { slug, tokenIconPaletteUrl } from '~/utils'
import { getColor } from '~/utils/getColor'
import { ProtocolsChainsSearch } from '~/components/Search/ProtocolsChains'
import { useDefiManager } from '~/contexts/LocalStorage'
import { formatProtocolsTvlChartData } from '~/components/ECharts/ProtocolChart/useFetchAndFormatChartData'
import { fuseProtocolData } from '~/api/categories/protocols'
import { withPerformanceLogging } from '~/utils/perf'
import { useQueries } from '@tanstack/react-query'
import { SelectWithCombobox } from '~/components/SelectWithCombobox'

const AreaChart = dynamic(() => import('~/components/ECharts/AreaChart'), {
	ssr: false
}) as React.FC<IChartProps>

export const getStaticProps = withPerformanceLogging('comparison', async () => {
	const { protocols } = await getSimpleProtocolsPageData(['name', 'logo'])

	return {
		props: {
			protocols: protocols.map((p) => p.name)
		},
		revalidate: maxAgeForNext([22])
	}
})

const fetchProtocol = async (selectedProtocol: string | null) => {
	if (!selectedProtocol) return null

	try {
		const data = await Promise.allSettled([
			fetch(`${PROTOCOL_API}/${slug(selectedProtocol)}`).then((res) => res.json()),
			getColor(tokenIconPaletteUrl(selectedProtocol))
		])

		return {
			protocolData: data[0].status === 'fulfilled' ? data[0].value : null,
			color: data[1].status === 'fulfilled' ? data[1].value : null
		}
	} catch (error) {
		throw new Error(error instanceof Error ? error.message : 'Failed to fetch')
	}
}

export default function CompareProtocolsTvls({ protocols }: { protocols: Array<string> }) {
	const router = useRouter()
	const [extraTvlEnabled] = useDefiManager()

	const { protocol } = router.query
	const selectedProtocols = protocol ? (typeof protocol === 'string' ? [protocol] : [...protocol]) : null

	const results = useQueries({
		queries:
			selectedProtocols?.map((protocol) => ({
				queryKey: ['protocol-to-compare', protocol],
				queryFn: () => fetchProtocol(protocol),
				staleTime: 60 * 60 * 1000,
				refetchOnWindowFocus: false
			})) ?? []
	})

	const isLoading = results.some((r) => r.isLoading)

	const { chartData, stackColors } = React.useMemo(() => {
		const stackColors = {}

		const formattedData =
			results
				.filter((r) => r.data)
				.map((res: any) => {
					const { historicalChainTvls } = fuseProtocolData(res.data.protocolData)

					if (res.data.color) {
						stackColors[res.data.protocolData.name] = res.data.color
					}

					return {
						protocolChartData: formatProtocolsTvlChartData({ historicalChainTvls, extraTvlEnabled }),
						protocolName: res.data.protocolData.name
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

		return { chartData: Object.keys(chartData).map((date) => ({ date, ...chartData[date] })), stackColors }
	}, [results, extraTvlEnabled])

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
			<ProtocolsChainsSearch />

			<div className="relative flex flex-col min-h-screen">
				<SelectWithCombobox
					allValues={protocols}
					selectedValues={selectedProtocols ?? []}
					setSelectedValues={setSelectedProtocols}
					label="Selected Protocols"
					clearAll={() => setSelectedProtocols([])}
					toggleAll={() => setSelectedProtocols(protocols)}
					labelType="smol"
					triggerProps={{
						className:
							'bg-[var(--btn2-bg)]  hover:bg-[var(--btn2-hover-bg)] focus-visible:bg-[var(--btn2-hover-bg)] flex items-center justify-between gap-2 py-2 px-3 rounded-lg cursor-pointer text-[var(--text1)] flex-nowrap relative max-w-fit'
					}}
				/>
				<div className="relative col-span-2 p-4 shadow rounded-xl">
					{isLoading ? (
						<p className="text-[var(--text1)] text-center mt-[20vh]">Loading...</p>
					) : (
						<AreaChart
							chartData={chartData}
							title="Protocols"
							valueSymbol="$"
							stacks={selectedProtocols}
							stackColors={stackColors}
							hideDefaultLegend
						/>
					)}
				</div>
			</div>
		</Layout>
	)
}
