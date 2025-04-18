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
import { useLocalStorageSettingsManager } from '~/contexts/LocalStorage'
import { formatProtocolsTvlChartData } from '~/containers/ProtocolOverview/Chart/useFetchAndFormatChartData'
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
	const [extraTvlEnabled] = useLocalStorageSettingsManager('tvl')

	const { protocol } = router.query

	const selectedProtocols = React.useMemo(() => {
		return protocol ? (typeof protocol === 'string' ? [protocol] : [...protocol]) : []
	}, [protocol])

	const results = useQueries({
		queries: selectedProtocols.map((protocol) => ({
			queryKey: ['protocol-to-compare', protocol],
			queryFn: () => fetchProtocol(protocol),
			staleTime: 60 * 60 * 1000,
			refetchOnWindowFocus: false,
			retry: 0
		}))
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

		return {
			chartData: Object.keys(chartData).map((date) => ({ date, ...chartData[date] })),
			stackColors: Object.values(stackColors).filter((c) => c === '#2172E5').length <= 1 ? stackColors : null
		}
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
		<Layout title={`Compare Protocols - DefiLlama`} defaultSEO>
			<div className="bg-[var(--cards-bg)] rounded-md isolate">
				<div className="flex items-center justify-between flex-wrap gap-2 p-3">
					<h1 className="text-lg font-semibold mr-auto">Compare Protocols</h1>
					<SelectWithCombobox
						allValues={protocols}
						selectedValues={selectedProtocols}
						setSelectedValues={setSelectedProtocols}
						label="Selected Protocols"
						clearAll={() => setSelectedProtocols([])}
						toggleAll={() => setSelectedProtocols(protocols)}
						labelType="smol"
						triggerProps={{
							className:
								'flex items-center justify-between gap-2 p-2 text-xs rounded-md cursor-pointer flex-nowrap relative border border-[#E6E6E6] dark:border-[#2F3336] hover:bg-[var(--link-hover-bg)] focus-visible:bg-[var(--link-hover-bg)] text-black dark:text-white font-medium'
						}}
					/>
				</div>
				{isLoading ? (
					<div className="min-h-[360px] flex flex-col items-center justify-center">
						<p>Loading...</p>
					</div>
				) : (
					<React.Suspense fallback={<div className="min-h-[360px]" />}>
						<AreaChart
							chartData={chartData}
							title=""
							valueSymbol="$"
							stacks={selectedProtocols}
							stackColors={stackColors}
							hideDefaultLegend
						/>
					</React.Suspense>
				)}
			</div>
		</Layout>
	)
}
