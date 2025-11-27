import * as React from 'react'
import { useRouter } from 'next/router'
import { useQueries } from '@tanstack/react-query'
import { maxAgeForNext } from '~/api'
import { ILineAndBarChartProps } from '~/components/ECharts/types'
import { tvlOptions } from '~/components/Filters/options'
import { LocalLoader } from '~/components/Loaders'
import { MultiSelectCombobox } from '~/components/MultiSelectCombobox'
import { PROTOCOL_API } from '~/constants'
import { getChainOverviewData } from '~/containers/ChainOverview/queries.server'
import { ChainProtocolsTable } from '~/containers/ChainOverview/Table'
import { IChainOverviewData } from '~/containers/ChainOverview/types'
import { useLocalStorageSettingsManager } from '~/contexts/LocalStorage'
import { formatProtocolsList2 } from '~/hooks/data/defi'
import Layout from '~/layout'
import { getNDistinctColors, slug, tokenIconUrl, toNumberOrNullFromQueryParam } from '~/utils'
import { fetchJson } from '~/utils/async'
import { withPerformanceLogging } from '~/utils/perf'

const LineAndBarChart = React.lazy(
	() => import('~/components/ECharts/LineAndBarChart')
) as React.FC<ILineAndBarChartProps>

export const getStaticProps = withPerformanceLogging('comparison', async () => {
	const { protocols } = await getChainOverviewData({ chain: 'All' })

	return {
		props: {
			protocols,
			protocolsList: protocols
				.reduce((acc, protocol) => {
					acc.push({
						value: protocol.name,
						label: protocol.name,
						logo: tokenIconUrl(protocol.name),
						score: protocol.tvl?.default?.tvl ?? 0
					})
					if (protocol.childProtocols) {
						for (const childProtocol of protocol.childProtocols) {
							acc.push({
								value: childProtocol.name,
								label: childProtocol.name,
								logo: tokenIconUrl(childProtocol.name),
								score: 1
							})
						}
					}
					return acc
				}, [])
				.sort((a, b) => b.score - a.score)
		},
		revalidate: maxAgeForNext([22])
	}
})

const fetchProtocol = async (selectedProtocol: string | null) => {
	if (!selectedProtocol) return null

	try {
		const protocolData = await fetchJson(`${PROTOCOL_API}/${slug(selectedProtocol)}`)

		return {
			protocolData,
			protocolName: protocolData.name
		}
	} catch (error) {
		throw new Error(error instanceof Error ? error.message : 'Failed to fetch')
	}
}

const pageName = ['Compare Protocols']

export default function CompareProtocols({
	protocols,
	protocolsList
}: {
	protocols: IChainOverviewData['protocols']
	protocolsList: Array<{ value: string; label: string; logo: string }>
}) {
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

	const minTvl = toNumberOrNullFromQueryParam(router.query.minTvl)
	const maxTvl = toNumberOrNullFromQueryParam(router.query.maxTvl)

	const { charts } = React.useMemo(() => {
		const formattedData =
			results
				.filter((r) => r.data)
				.map((res: any) => ({
					protocolChartData: res.data.protocolData.chainTvls ?? {},
					protocolName: res.data.protocolData.name
				})) ?? []

		let totalProtocols = 0
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
			totalProtocols++
		}

		const distinctColors = getNDistinctColors(totalProtocols)

		const charts = {}
		let chartIndex = 0
		for (const protocol in chartsByProtocol) {
			const color = distinctColors[chartIndex]

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

	const { selectedProtocolsData, selectedProtocolsNames } = React.useMemo(() => {
		const selectedProtocolsData = selectedProtocols.reduce((acc, protocolName) => {
			const data = protocols.find(
				(p) => p.name === protocolName || p.childProtocols?.find((cp) => cp.name === protocolName)
			)
			if (!data) return acc
			if (data.name === protocolName) {
				acc.push(data)
			} else {
				const child = data.childProtocols?.find((cp) => cp.name === protocolName)
				if (child) {
					acc.push(child)
				}
			}
			return acc
		}, [])
		return { selectedProtocolsData, selectedProtocolsNames: selectedProtocolsData.map((p) => p.name) }
	}, [selectedProtocols, protocols])

	const protocolsTableData = React.useMemo(() => {
		return formatProtocolsList2({ protocols: selectedProtocolsData, extraTvlsEnabled: extraTvlEnabled, minTvl, maxTvl })
	}, [selectedProtocolsData, extraTvlEnabled, minTvl, maxTvl])

	return (
		<Layout
			title={`Compare Protocols - DefiLlama`}
			description={`Compare protocols on DefiLlama. DefiLlama is committed to providing accurate data without ads or sponsored content, as well as transparency.`}
			keywords={`compare protocols, compare protocols on blockchain`}
			canonicalUrl={`/compare-protocols`}
			pageName={pageName}
			metricFilters={tvlOptions}
		>
			<div className="flex items-center gap-3 rounded-md border border-(--cards-border) bg-(--cards-bg)">
				<MultiSelectCombobox
					data={protocolsList}
					placeholder="Select Protocols..."
					selectedValues={selectedProtocolsNames}
					setSelectedValues={(values) => {
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
					}}
				/>
			</div>
			{selectedProtocols.length > 1 ? (
				<div className="relative flex flex-col gap-2">
					<div className="min-h-[362px] rounded-md border border-(--cards-border) bg-(--cards-bg)">
						{isLoading || !router.isReady ? (
							<div className="flex h-full w-full items-center justify-center">
								<LocalLoader />
							</div>
						) : (
							<React.Suspense fallback={<></>}>
								<LineAndBarChart charts={charts} valueSymbol="$" />
							</React.Suspense>
						)}
					</div>

					{protocolsTableData.length && (
						<div>
							<ChainProtocolsTable protocols={protocolsTableData} useStickyHeader={false} />
						</div>
					)}
				</div>
			) : (
				<div className="flex min-h-[362px] items-center justify-center rounded-md border border-(--cards-border) bg-(--cards-bg)">
					<p className="text-sm text-(--text-secondary)">Select at least 2 protocols to compare</p>
				</div>
			)}
		</Layout>
	)
}
