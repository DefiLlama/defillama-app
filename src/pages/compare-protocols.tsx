import * as React from 'react'
import { useRouter } from 'next/router'
import { useQueries } from '@tanstack/react-query'
import { maxAgeForNext } from '~/api'
import { getSimpleProtocolsPageData } from '~/api/categories/protocols'
import { basicPropertiesToKeep } from '~/api/categories/protocols/utils'
import { ILineAndBarChartProps } from '~/components/ECharts/types'
import { tvlOptions } from '~/components/Filters/options'
import { IconsRow } from '~/components/IconsRow'
import { LocalLoader } from '~/components/Loaders'
import { MultiSelectCombobox } from '~/components/MultiSelectCombobox'
import { TokenLogo } from '~/components/TokenLogo'
import { PROTOCOL_API } from '~/constants'
import { getChainOverviewData } from '~/containers/ChainOverview/queries.server'
import { ChainProtocolsTable } from '~/containers/ChainOverview/Table'
import { Flag } from '~/containers/ProtocolOverview/Flag'
import { useLocalStorageSettingsManager } from '~/contexts/LocalStorage'
import { formatProtocolsList2 } from '~/hooks/data/defi'
import Layout from '~/layout'
import { formattedNum, getNDistinctColors, getPercentChange, slug, tokenIconUrl } from '~/utils'
import { fetchJson } from '~/utils/async'
import { withPerformanceLogging } from '~/utils/perf'

const LineAndBarChart = React.lazy(
	() => import('~/components/ECharts/LineAndBarChart')
) as React.FC<ILineAndBarChartProps>

export const getStaticProps = withPerformanceLogging('comparison', async () => {
	const [{ protocols }, { protocols: basicProtocolsData }] = await Promise.all([
		getChainOverviewData({ chain: 'All' }),
		getSimpleProtocolsPageData([...basicPropertiesToKeep, 'logo'])
	])

	return {
		props: {
			protocols,
			basicProtocolsData
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

export default function CompareProtocols({ protocols, basicProtocolsData }) {
	const router = useRouter()

	const protocolsNames = React.useMemo(() => {
		return basicProtocolsData.map((p) => p.name)
	}, [basicProtocolsData])

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

	const minTvl =
		typeof router.query.minTvl === 'string' && router.query.minTvl !== '' && !Number.isNaN(Number(router.query.minTvl))
			? +router.query.minTvl
			: null

	const maxTvl =
		typeof router.query.maxTvl === 'string' && router.query.maxTvl !== '' && !Number.isNaN(Number(router.query.maxTvl))
			? +router.query.maxTvl
			: null

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
		const distinctColors = getNDistinctColors(protocolNames.length)
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

	const sortedProtocols = React.useMemo(() => {
		const selectedSet = new Set(selectedProtocols)
		const unselectedProtocols = protocolsNames.filter((protocol) => !selectedSet.has(protocol))

		return [...selectedProtocols, ...unselectedProtocols].map((protocol) => ({
			value: protocol,
			label: protocol,
			logo: tokenIconUrl(protocol)
		}))
	}, [selectedProtocols, protocolsNames])

	const selectedProtocolsData = React.useMemo(() => {
		return selectedProtocols
			.map((protocolName) => {
				return basicProtocolsData.find((p) => p.name === protocolName)
			})
			.filter(Boolean)
	}, [selectedProtocols, basicProtocolsData])

	const protocolsTableData = React.useMemo(() => {
		const selectedSet = new Set(selectedProtocols)

		const filteredProtocols = protocols.filter(
			(c) => selectedSet.has(c.name) || c.childProtocols?.some((cp) => selectedSet.has(cp.name))
		)
		return formatProtocolsList2({ protocols: filteredProtocols, extraTvlsEnabled: extraTvlEnabled, minTvl, maxTvl })
	}, [protocols, selectedProtocols, extraTvlEnabled, minTvl, maxTvl])

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
					data={sortedProtocols}
					placeholder="Select Protocols..."
					selectedValues={selectedProtocols}
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
					<div className="grid grid-cols-1 gap-2 lg:grid-cols-2 xl:grid-cols-3">
						{selectedProtocolsData.map((protocolData) => (
							<ProtocolInfoCard key={protocolData.name} protocolData={protocolData} />
						))}
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

const ProtocolInfoCard = ({ protocolData }) => {
	const [extraTvlsEnabled] = useLocalStorageSettingsManager('tvl')

	let tvl = protocolData.tvl || 0
	let tvlPrevDay = protocolData.tvlPrevDay || 0
	let tvlPrevWeek = protocolData.tvlPrevWeek || 0
	let tvlPrevMonth = protocolData.tvlPrevMonth || 0

	for (const tvlKey in protocolData.extraTvl) {
		if (extraTvlsEnabled[tvlKey] && tvlKey !== 'doublecounted' && tvlKey !== 'liquidstaking') {
			tvl = tvl + (protocolData.extraTvl[tvlKey].tvl || 0)
			tvlPrevDay = tvlPrevDay + (protocolData.extraTvl[tvlKey].tvlPrevDay || 0)
			tvlPrevWeek = tvlPrevWeek + (protocolData.extraTvl[tvlKey].tvlPrevWeek || 0)
			tvlPrevMonth = tvlPrevMonth + (protocolData.extraTvl[tvlKey].tvlPrevMonth || 0)
		}
	}

	let change1d = getPercentChange(tvl, tvlPrevDay)
	let change7d = getPercentChange(tvl, tvlPrevWeek)
	let change1m = getPercentChange(tvl, tvlPrevMonth)

	return (
		<div className="flex flex-col gap-4 rounded-md border border-(--cards-border) bg-(--cards-bg) p-4">
			<div className="flex flex-wrap items-center gap-2">
				<TokenLogo logo={tokenIconUrl(protocolData.name)} size={24} />
				<span className="text-lg font-bold">{protocolData.name || ''}</span>
				{protocolData.symbol && protocolData.symbol !== '-' ? (
					<span className="font-normal">({protocolData.symbol})</span>
				) : null}
			</div>

			<CompactProtocolTVL tvl={tvl} name={protocolData.name} category={protocolData.category} />

			<KeyMetrics change_1d={change1d} change_7d={change7d} change_1m={change1m} protocolName={protocolData.name} />

			{protocolData.chains.length > 0 && (
				<div className="mt-2">
					<h3 className="mb-1 text-sm font-semibold">Chains</h3>
					<IconsRow links={protocolData.chains} url="/chain" iconType="chain" iconsAlignment="start" />
				</div>
			)}
		</div>
	)
}

const CompactProtocolTVL = ({ tvl, name, category }) => {
	return (
		<div className="flex flex-col">
			<span className="flex flex-nowrap items-center gap-2">
				<span className="text-(--text-label)">Total Value Locked</span>
				<Flag
					protocol={name}
					dataType="TVL"
					isLending={category === 'Lending'}
					className="opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100"
				/>
			</span>
			<span className="font-jetbrains min-h-6 text-xl font-semibold" suppressHydrationWarning>
				{formattedNum(tvl, true)}
			</span>
		</div>
	)
}

const KeyMetrics = ({ change_1d, change_7d, change_1m, protocolName }) => {
	const metrics = []

	if (change_1d != null) {
		metrics.push({
			name: 'Change 24h',
			value: `${change_1d > 0 ? '+' : ''}${change_1d.toFixed(2)}%`,
			isPercentage: true
		})
	}

	if (change_7d != null) {
		metrics.push({
			name: 'Change 7d',
			value: `${change_7d > 0 ? '+' : ''}${change_7d.toFixed(2)}%`,
			isPercentage: true
		})
	}

	if (change_1m != null) {
		metrics.push({
			name: 'Change 30d',
			value: `${change_1m > 0 ? '+' : ''}${change_1m.toFixed(2)}%`,
			isPercentage: true
		})
	}

	if (metrics.length === 0) {
		return null
	}

	return (
		<div className="flex flex-col gap-2">
			<div className="grid grid-cols-1 gap-1">
				{metrics.map((metric) => (
					<div key={`${metric.name}-${protocolName}`} className="flex items-center justify-between gap-2 py-1 text-sm">
						<span className="text-(--text-label)">{metric.name}</span>
						<span
							className={`font-jetbrains ${
								metric.name.includes('Change')
									? parseFloat(metric.value) > 0
										? 'text-(--success)'
										: parseFloat(metric.value) < 0
											? 'text-(--error)'
											: ''
									: ''
							}`}
						>
							{metric.isPercentage ? metric.value : formattedNum(metric.value, true)}
						</span>
					</div>
				))}
			</div>
		</div>
	)
}
