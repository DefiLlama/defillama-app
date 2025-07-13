import * as React from 'react'
import { useRouter } from 'next/router'
import Layout from '~/layout'
import { maxAgeForNext } from '~/api'
import { getSimpleProtocolsPageData } from '~/api/categories/protocols'
import { ILineAndBarChartProps } from '~/components/ECharts/types'
import { PROTOCOL_API } from '~/constants'
import { slug, getNDistinctColors } from '~/utils'
import { useLocalStorageSettingsManager } from '~/contexts/LocalStorage'
import { withPerformanceLogging } from '~/utils/perf'
import { useQueries } from '@tanstack/react-query'
import { SelectWithCombobox } from '~/components/SelectWithCombobox'
import { fetchJson } from '~/utils/async'
import { oldBlue } from '~/constants/colors'

const LineAndBarChart = React.lazy(
	() => import('~/components/ECharts/LineAndBarChart')
) as React.FC<ILineAndBarChartProps>

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
		const data = await fetchJson(`${PROTOCOL_API}/${slug(selectedProtocol)}`)
		return {
			protocolData: data,
			protocolName: data.name
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

	const { charts } = React.useMemo(() => {
		const formattedData =
			results
				.filter((r) => r.data)
				.map((res: any) => ({
					protocolChartData: res.data.protocolData.chainTvls ?? {},
					protocolName: res.data.protocolData.name
				})) ?? []

		// Generate distinct colors for all protocols
		const protocolNames = formattedData.map((p) => p.protocolName)
		const distinctColors = getNDistinctColors(protocolNames.length, oldBlue)
		const stackColors = Object.fromEntries(protocolNames.map((name, index) => [name, distinctColors[index]]))

		const chartsByProtocol = {}

		for (const protocol of formattedData) {
			if (!chartsByProtocol[protocol.protocolName]) {
				chartsByProtocol[protocol.protocolName] = {}
			}

			for (const chain in protocol.protocolChartData) {
				if (chain.includes('-') || chain === 'offers') continue
				if (chain in extraTvlEnabled && !extraTvlEnabled[chain]) continue

				for (const { date, totalLiquidityUSD } of protocol.protocolChartData[chain].tvl) {
					const dateKey = date
					if (!chartsByProtocol[protocol.protocolName][dateKey]) {
						chartsByProtocol[protocol.protocolName][dateKey] = 0
					}

					chartsByProtocol[protocol.protocolName][dateKey] =
						(chartsByProtocol[protocol.protocolName][dateKey] || 0) + totalLiquidityUSD
				}
			}
		}

		const charts = {}
		let chartIndex = 0
		for (const protocol in chartsByProtocol) {
			const color = stackColors[protocol]

			charts[protocol] = {
				name: protocol,
				stack: protocol,
				type: 'line',
				color,
				data: []
			}
			for (const date in chartsByProtocol[protocol]) {
				charts[protocol].data.push([+date * 1e3, chartsByProtocol[protocol][date]])
			}

			chartIndex++
		}

		return {
			charts
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

	const sortedProtocols = React.useMemo(() => {
		const selectedSet = new Set(selectedProtocols)
		const unselectedProtocols = protocols.filter((protocol) => !selectedSet.has(protocol))

		return [...selectedProtocols, ...unselectedProtocols]
	}, [selectedProtocols, protocols])

	return (
		<Layout title={`Compare Protocols - DefiLlama`} defaultSEO>
			<div className="bg-(--cards-bg) rounded-md isolate">
				<div className="flex items-center justify-between flex-wrap gap-2 p-3">
					<h1 className="text-lg font-semibold mr-auto">Compare Protocols</h1>
					<SelectWithCombobox
						allValues={sortedProtocols}
						selectedValues={selectedProtocols}
						setSelectedValues={setSelectedProtocols}
						label="Selected Protocols"
						clearAll={() => setSelectedProtocols([])}
						labelType="smol"
						triggerProps={{
							className:
								'flex items-center justify-between gap-2 p-2 text-xs rounded-md cursor-pointer flex-nowrap relative border border-(--form-control-border) hover:bg-(--link-hover-bg) focus-visible:bg-(--link-hover-bg) text-black dark:text-white font-medium'
						}}
					/>
				</div>
				{isLoading ? (
					<div className="min-h-[360px] flex flex-col items-center justify-center">
						<p>Loading...</p>
					</div>
				) : (
					<React.Suspense fallback={<div className="min-h-[360px]" />}>
						<LineAndBarChart charts={charts} valueSymbol="$" />
					</React.Suspense>
				)}
			</div>
		</Layout>
	)
}
