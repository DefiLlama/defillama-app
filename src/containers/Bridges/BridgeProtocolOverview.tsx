import { useQuery } from '@tanstack/react-query'
import * as React from 'react'
import { ChartExportButtons } from '~/components/ButtonStyled/ChartExportButtons'
import type { IPieChartProps } from '~/components/ECharts/types'
import { Icon } from '~/components/Icon'
import { LocalLoader } from '~/components/Loaders'
import { LinkPreviewCard } from '~/components/SEO'
import { TagGroup } from '~/components/TagGroup'
import { TokenLogo } from '~/components/TokenLogo'
import { Tooltip } from '~/components/Tooltip'
import { BridgeAddressesTable } from '~/containers/Bridges/BridgeAddressesTable'
import { BridgeChainSelector } from '~/containers/Bridges/BridgeChainSelector'
import { BridgeTokensTable } from '~/containers/Bridges/BridgeTokensTable'
import { getBridgePageDatanew } from '~/containers/Bridges/queries.server'
import { AddressesTableSwitch } from '~/containers/Bridges/TableSwitch'
import { BRIDGES_SHOWING_ADDRESSES, useLocalStorageSettingsManager } from '~/contexts/LocalStorage'
import { useGetChartInstance } from '~/hooks/useGetChartInstance'
import Layout from '~/layout'
import { firstDayOfMonth, formattedNum, getPercentChange, lastDayOfWeek, slug } from '~/utils'

const MultiSeriesChart2 = React.lazy(() => import('~/components/ECharts/MultiSeriesChart2'))
const PieChart = React.lazy(() => import('~/components/ECharts/PieChart')) as React.FC<IPieChartProps>
const CHART_TYPES = ['Inflows', 'Volume', 'Tokens To', 'Tokens From'] as const
type ChartType = (typeof CHART_TYPES)[number]

const GROUP_BY_VALUES = ['daily', 'weekly', 'monthly'] as const

const BridgeInfo = ({
	displayName,
	logo,
	chains,
	defaultChain,
	volumeDataByChain,
	tableDataByChain,
	config = {} as Record<string, string>
}) => {
	const [chartType, setChartType] = React.useState<ChartType>('Volume')
	const [groupBy, setGroupBy] = React.useState<'daily' | 'weekly' | 'monthly'>('daily')
	const [currentChain, setChain] = React.useState(defaultChain)
	const { chartInstance: exportChartInstance, handleChartReady } = useGetChartInstance()

	const [bridgesSettings] = useLocalStorageSettingsManager('bridges')
	const isBridgesShowingAddresses = bridgesSettings[BRIDGES_SHOWING_ADDRESSES]

	const { tokensTableData, addressesTableData, tokenDeposits, tokenWithdrawals } = tableDataByChain[currentChain]

	const volumeChartDataByChain = volumeDataByChain[currentChain]
	const prevDayChart = volumeChartDataByChain[volumeChartDataByChain.length - 2]
	const currentDepositsUSD = prevDayChart?.Deposited ?? 0
	const currentWithdrawalsUSD = -(prevDayChart?.Withdrawn ?? 0)
	const currentVolume = currentDepositsUSD + currentWithdrawalsUSD

	const isAllChains = currentChain === 'All Chains'

	let volPercentChange = '0 '

	if (volumeChartDataByChain.length > 3) {
		const prev2DayChart = volumeChartDataByChain[volumeChartDataByChain.length - 3]
		const prevDepositsUSD = prev2DayChart.Deposited ?? 0
		const prevWithdrawalsUSD = -(prev2DayChart.Withdrawn ?? 0)
		const prevVolume = prevDepositsUSD + prevWithdrawalsUSD
		if (prevVolume > 0) {
			volPercentChange = getPercentChange(currentVolume, prevVolume)?.toFixed(2)
		}
	}

	const chainOptions = chains.map((chain) => {
		return { name: chain, route: '' }
	})

	const allChainsVolumePairs = React.useMemo(() => {
		if (!isAllChains || !Array.isArray(volumeChartDataByChain)) return [] as Array<[number, number]>
		return volumeChartDataByChain.map((d: any) => [
			d.date,
			(Number(d?.Deposited ?? 0) + Math.abs(Number(d?.Withdrawn ?? 0))) / 2
		])
	}, [isAllChains, volumeChartDataByChain])

	const groupedAllChainsVolumePairs = React.useMemo(() => {
		if (!isAllChains) return [] as Array<[number, number]>
		if (groupBy === 'daily' || allChainsVolumePairs.length === 0) return allChainsVolumePairs
		const store: Record<number, number> = {}
		for (const [date, value] of allChainsVolumePairs) {
			const key = groupBy === 'weekly' ? lastDayOfWeek(date) : firstDayOfMonth(date)
			store[key] = (store[key] ?? 0) + (value ?? 0)
		}
		return Object.entries(store)
			.map(([k, v]) => [Number(k), v] as [number, number])
			.sort((a, b) => a[0] - b[0])
	}, [isAllChains, groupBy, allChainsVolumePairs])

	const prevDayVolumeValue = React.useMemo(() => {
		if (!isAllChains) return 0
		const arr = allChainsVolumePairs as Array<[number, number]>
		if (arr.length > 1) return arr[arr.length - 2][1]
		if (arr.length === 1) return arr[0][1]
		return 0
	}, [isAllChains, allChainsVolumePairs])

	const chartTypes = (
		isAllChains ? (['Volume', 'Tokens To', 'Tokens From'] as const) : (['Inflows', 'Tokens To', 'Tokens From'] as const)
	) as readonly ChartType[]

	const groupedInflowsData = React.useMemo(() => {
		if (isAllChains) return [] as any[]
		if (!Array.isArray(volumeChartDataByChain) || volumeChartDataByChain.length === 0) return []
		if (groupBy === 'daily') return volumeChartDataByChain
		const store: Record<number, { Deposited: number; Withdrawn: number }> = {}
		for (const point of volumeChartDataByChain as Array<any>) {
			const key = groupBy === 'weekly' ? lastDayOfWeek(point.date) : firstDayOfMonth(point.date)
			store[key] = store[key] || { Deposited: 0, Withdrawn: 0 }
			store[key].Deposited += Number(point.Deposited ?? 0)
			store[key].Withdrawn += Number(point.Withdrawn ?? 0)
		}
		return Object.entries(store)
			.map(([k, v]) => ({ date: Number(k), ...v }))
			.sort((a, b) => a.date - b.date)
	}, [isAllChains, groupBy, volumeChartDataByChain])

	const volumeDataset = React.useMemo(
		() => ({
			source: groupedAllChainsVolumePairs.map(([d, v]) => ({ timestamp: +d * 1e3, Volume: v })),
			dimensions: ['timestamp', 'Volume']
		}),
		[groupedAllChainsVolumePairs]
	)

	const inflowsDataset = React.useMemo(
		() => ({
			source: groupedInflowsData.map(({ date, Deposited, Withdrawn }) => ({
				timestamp: +date * 1e3,
				Deposited: Deposited ?? 0,
				Withdrawn: -(Withdrawn ?? 0)
			})),
			dimensions: ['timestamp', 'Deposited', 'Withdrawn']
		}),
		[groupedInflowsData]
	)

	const chartFilename = `${slug(displayName)}-${chartType === 'Volume' ? 'volume' : chartType === 'Inflows' ? 'inflows' : chartType === 'Tokens To' ? 'tokens-to' : 'tokens-from'}`

	return (
		<>
			<div className="flex items-center justify-between gap-2 rounded-md border border-(--cards-border) bg-(--cards-bg) p-2">
				<h1 className="flex flex-nowrap items-center gap-1 text-xl font-semibold">
					<TokenLogo logo={logo} size={24} />
					<span>{displayName}</span>
				</h1>
				<BridgeChainSelector
					currentChain={currentChain}
					options={chainOptions}
					handleClick={(chain) => {
						setChain(chain)
						if (chain === 'All Chains') {
							setChartType('Volume')
						} else {
							setChartType('Inflows')
						}
					}}
				/>
			</div>
			<div className="relative isolate grid grid-cols-2 gap-2 xl:grid-cols-3">
				<div className="col-span-2 flex w-full flex-col gap-6 overflow-x-auto rounded-md border border-(--cards-border) bg-(--cards-bg) p-5 xl:col-span-1">
					{isAllChains ? (
						<>
							<p className="flex flex-col gap-1 text-base">
								<span className="inline-flex items-center gap-1 text-(--text-label)">
									Total Volume (prev day, UTC)
									<Tooltip
										content={
											'Daily volume equals (Deposited + Withdrawn)/2 for the previous UTC day to avoid double counting.'
										}
									>
										<Icon name="help-circle" height={14} width={14} />
									</Tooltip>
								</span>
								<span className="font-jetbrains text-2xl font-semibold">
									{formattedNum(prevDayVolumeValue || '0', true)}
								</span>
							</p>
						</>
					) : (
						<>
							<p className="flex flex-col gap-1 text-base">
								<span className="text-(--text-label)">Deposited to {currentChain} (prev day, UTC)</span>
								<span className="font-jetbrains text-2xl font-semibold">
									{formattedNum(currentDepositsUSD || '0', true)}
								</span>
							</p>

							<p className="flex flex-col gap-1 text-base">
								<span className="text-(--text-label)">Withdrawn from {currentChain} (prev day, UTC)</span>
								<span className="font-jetbrains text-2xl font-semibold">
									{formattedNum(currentWithdrawalsUSD || '0', true)}
								</span>
							</p>
						</>
					)}

					<p className="flex flex-col gap-1 text-base">
						<span className="text-(--text-label)">Volume Change (prev day)</span>
						<span className="font-jetbrains text-2xl font-semibold">{volPercentChange + '%'}</span>
					</p>
					{config?.url ? (
						<a
							className="mt-auto mr-auto flex items-center justify-center gap-1 rounded-md bg-(--link-bg) px-2 py-1 text-xs whitespace-nowrap text-(--link-text) hover:bg-(--link-hover-bg) focus-visible:bg-(--link-hover-bg)"
							href={config.url}
							target="_blank"
							rel="noreferrer noopener"
						>
							<span>Website</span> <Icon name="arrow-up-right" height={14} width={14} />
						</a>
					) : null}
				</div>

				<div className="col-span-2 rounded-md border border-(--cards-border) bg-(--cards-bg)">
					<div className="flex flex-wrap items-center justify-end gap-2 p-2 pb-0">
						<TagGroup
							selectedValue={chartType}
							setValue={(chartType) => setChartType(chartType as ChartType)}
							values={chartTypes}
							className="mr-auto"
						/>
						{chartType === 'Volume' || chartType === 'Inflows' ? (
							<TagGroup selectedValue={groupBy} setValue={(v) => setGroupBy(v as any)} values={GROUP_BY_VALUES} />
						) : null}
						<ChartExportButtons
							chartInstance={exportChartInstance}
							filename={chartFilename}
							title={`${displayName} ${chartType}`}
						/>
					</div>
					<>
						{chartType === 'Volume' && isAllChains && groupedAllChainsVolumePairs.length > 0 ? (
							<React.Suspense fallback={<div className="min-h-[360px]" />}>
								<MultiSeriesChart2
									dataset={volumeDataset}
									charts={VOLUME_CHARTS}
									valueSymbol="$"
									onReady={handleChartReady}
								/>
							</React.Suspense>
						) : null}
						{chartType === 'Inflows' && !isAllChains && groupedInflowsData && groupedInflowsData.length > 0 ? (
							<React.Suspense fallback={<div className="min-h-[360px]" />}>
								<MultiSeriesChart2
									dataset={inflowsDataset}
									charts={INFLOW_CHARTS}
									valueSymbol="$"
									onReady={handleChartReady}
								/>
							</React.Suspense>
						) : null}
						{chartType === 'Tokens To' && tokenWithdrawals && tokenWithdrawals.length > 0 ? (
							<React.Suspense fallback={<div className="min-h-[360px]" />}>
								<PieChart chartData={tokenWithdrawals} onReady={handleChartReady} />
							</React.Suspense>
						) : null}
						{chartType === 'Tokens From' && tokenDeposits && tokenDeposits.length > 0 ? (
							<React.Suspense fallback={<div className="min-h-[360px]" />}>
								<PieChart chartData={tokenDeposits} onReady={handleChartReady} />
							</React.Suspense>
						) : null}
					</>
				</div>
			</div>
			<div className="rounded-md border border-(--cards-border) bg-(--cards-bg)">
				<div className="flex flex-wrap items-end justify-between gap-2 p-3">
					<AddressesTableSwitch />
					<p className="text-sm italic opacity-60">All stats in table are for the previous day.</p>
				</div>
				{isBridgesShowingAddresses ? (
					<BridgeAddressesTable data={addressesTableData} />
				) : (
					<BridgeTokensTable data={tokensTableData} />
				)}
			</div>
		</>
	)
}

export function BridgeProtocolOverview(props) {
	return (
		<Layout
			title={`${props.displayName}: Bridge Volume - DefiLlama`}
			description={`Track bridge volume and cross-chain transfers on ${props.displayName}. View bridged assets, transfer volumes, and DeFi bridge analytics from DefiLlama.`}
			keywords={`bridge volume ${props.displayName}, cross-chain transfers ${props.displayName}, DeFi bridges ${props.displayName}, bridged assets ${props.displayName}, bridge protocol ${props.displayName}`}
			canonicalUrl={`/bridges/${props.displayName}`}
		>
			<LinkPreviewCard cardName={props.displayName} token={props.displayName} />
			<BridgeInfo {...props} />
		</Layout>
	)
}

export const BridgeContainerOnClient = ({ protocol }: { protocol: string }) => {
	const { data, isLoading, error } = useQuery({
		queryKey: ['bridged-data', protocol],
		queryFn: () => getBridgePageDatanew(protocol),
		staleTime: 60 * 60 * 1000,
		refetchOnWindowFocus: false,
		retry: 0
	})

	if (isLoading) {
		return (
			<div className="flex flex-1 flex-col items-center justify-center rounded-md border border-(--cards-border) bg-(--cards-bg)">
				<LocalLoader />
			</div>
		)
	}

	if (error || !data) {
		return (
			<div className="flex flex-1 flex-col items-center justify-center rounded-md border border-(--cards-border) bg-(--cards-bg)">
				<p className="p-2">{error instanceof Error ? error.message : "Something went wrong, couldn't fetch data"}</p>
			</div>
		)
	}

	return (
		<div className="flex flex-col gap-10 p-4">
			<BridgeInfo {...data} />
		</div>
	)
}

// oxlint-disable-next-line no-unused-vars
const useFetchBridgeVolumeOnAllChains = (protocol?: string | null) => {
	return useQuery({
		queryKey: ['bridged-volume-on-all-chains', protocol],
		queryFn: protocol
			? () => getBridgePageDatanew(protocol).then((data) => data.volumeDataByChain['All Chains'])
			: () => null,
		staleTime: 60 * 60 * 1000,
		refetchOnWindowFocus: false,
		retry: 0
	})
}
const VOLUME_CHARTS = [{ type: 'bar' as const, name: 'Volume', encode: { x: 'timestamp', y: 'Volume' } }]

const INFLOW_CHARTS = [
	{ type: 'bar' as const, name: 'Deposited', encode: { x: 'timestamp', y: 'Deposited' }, stack: 'stackA' },
	{ type: 'bar' as const, name: 'Withdrawn', encode: { x: 'timestamp', y: 'Withdrawn' }, stack: 'stackA' }
]
