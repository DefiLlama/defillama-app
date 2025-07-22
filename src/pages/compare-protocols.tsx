import * as React from 'react'
import { useRouter } from 'next/router'
import Layout from '~/layout'
import { maxAgeForNext } from '~/api'
import { getSimpleProtocolsPageData } from '~/api/categories/protocols'
import { ILineAndBarChartProps } from '~/components/ECharts/types'
import { PROTOCOL_API } from '~/constants'
import { slug, getNDistinctColors, formattedNum, tokenIconUrl, getPercentChange } from '~/utils'
import { useLocalStorageSettingsManager } from '~/contexts/LocalStorage'
import { withPerformanceLogging } from '~/utils/perf'
import { useQueries } from '@tanstack/react-query'
import { SelectWithCombobox } from '~/components/SelectWithCombobox'
import { fetchJson } from '~/utils/async'
import { oldBlue } from '~/constants/colors'
import { basicPropertiesToKeep } from '~/api/categories/protocols/utils'
import { TokenLogo } from '~/components/TokenLogo'
import { Flag } from '~/containers/ProtocolOverview/Flag'
import { IconsRow } from '~/components/IconsRow'
import { ProtocolsChainsSearch } from '~/components/Search/ProtocolsChains'

const LineAndBarChart = React.lazy(
	() => import('~/components/ECharts/LineAndBarChart')
) as React.FC<ILineAndBarChartProps>

export const getStaticProps = withPerformanceLogging('comparison', async () => {
	const { protocols } = await getSimpleProtocolsPageData([...basicPropertiesToKeep, 'logo'])

	return {
		props: {
			protocols
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

export default function CompareProtocolsTvls({ protocols }) {
	const router = useRouter()

	const protocolsNames = React.useMemo(() => {
		return protocols.map((p) => p.name)
	}, [protocols])

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

	// TODO handle extra tvl settings
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
		const unselectedProtocols = protocolsNames.filter((protocol) => !selectedSet.has(protocol))

		return [...selectedProtocols, ...unselectedProtocols]
	}, [selectedProtocols, protocolsNames])

	const [extraTvlsEnabled] = useLocalStorageSettingsManager('tvl')

	const selectedProtocolsData = React.useMemo(() => {
		return selectedProtocols
			.map((protocolName) => {
				return protocols.find((p) => p.name === protocolName)
			})
			.filter(Boolean)
	}, [selectedProtocols, protocols, extraTvlsEnabled])

	return (
		<Layout title={`Compare Protocols - DefiLlama`} defaultSEO>
			<ProtocolsChainsSearch />
			<div className="bg-(--cards-bg) border border-(--cards-border) rounded-md isolate">
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
			{selectedProtocolsData.length > 0 && (
				<div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-2">
					{selectedProtocolsData.map((protocolData) => (
						<ProtocolInfoCard key={protocolData.name} protocolData={protocolData} />
					))}
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
		<div className="flex flex-col gap-4 bg-(--cards-bg) border border-(--cards-border) rounded-md p-4">
			<div className="flex items-center flex-wrap gap-2">
				<TokenLogo logo={tokenIconUrl(protocolData.name)} size={24} />
				<span className="font-bold text-lg">{protocolData.name || ''}</span>
				{protocolData.symbol && protocolData.symbol !== '-' ? (
					<span className="font-normal">({protocolData.symbol})</span>
				) : null}
			</div>

			<CompactProtocolTVL tvl={tvl} name={protocolData.name} category={protocolData.category} />

			<KeyMetrics change_1d={change1d} change_7d={change7d} change_1m={change1m} protocolName={protocolData.name} />

			{protocolData.chains.length > 0 && (
				<div className="mt-2">
					<h3 className="font-semibold text-sm mb-1">Chains</h3>
					<IconsRow links={protocolData.chains} url="/chain" iconType="chain" iconsAlignment="start" />
				</div>
			)}
		</div>
	)
}

const CompactProtocolTVL = ({ tvl, name, category }) => {
	return (
		<div className="flex flex-col">
			<span className="flex items-center flex-nowrap gap-2">
				<span className="text-[#545757] dark:text-[#cccccc]">Total Value Locked</span>
				<Flag
					protocol={name}
					dataType="TVL"
					isLending={category === 'Lending'}
					className="opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100"
				/>
			</span>
			<span className="font-semibold text-xl font-jetbrains min-h-6" suppressHydrationWarning>
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
						<span className="text-[#545757] dark:text-[#cccccc]">{metric.name}</span>
						<span
							className={`font-jetbrains ${
								metric.name.includes('Change')
									? parseFloat(metric.value) > 0
										? 'text-(--pct-green)'
										: parseFloat(metric.value) < 0
										? 'text-(--pct-red)'
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
