import * as React from 'react'
import { useQuery } from '@tanstack/react-query'
import type { IBarChartProps, IPieChartProps } from '~/components/ECharts/types'
import { Icon } from '~/components/Icon'
import { LazyChart } from '~/components/LazyChart'
import { LoadingDots } from '~/components/Loaders'
import { SEO } from '~/components/SEO'
import { BridgeAddressesTable, BridgeTokensTable } from '~/components/Table/Bridges'
import { TagGroup } from '~/components/TagGroup'
import { TokenLogo } from '~/components/TokenLogo'
import { BridgeChainSelector } from '~/containers/Bridges/BridgeChainSelector'
import { getBridgePageDatanew } from '~/containers/Bridges/queries.server'
import { AddressesTableSwitch } from '~/containers/Bridges/TableSwitch'
import { BRIDGES_SHOWING_ADDRESSES, useLocalStorageSettingsManager } from '~/contexts/LocalStorage'
import Layout from '~/layout'
import { formattedNum, getPercentChange } from '~/utils'

const BarChart = React.lazy(() => import('~/components/ECharts/BarChart')) as React.FC<IBarChartProps>
const PieChart = React.lazy(() => import('~/components/ECharts/PieChart')) as React.FC<IPieChartProps>
const CHART_TYPES = ['Inflows', 'Tokens To', 'Tokens From'] as const
type ChartType = (typeof CHART_TYPES)[number]

const BridgeInfo = ({
	displayName,
	logo,
	chains,
	defaultChain,
	volumeDataByChain,
	tableDataByChain,
	config = {} as Record<string, string>
}) => {
	const [chartType, setChartType] = React.useState<ChartType>('Inflows')
	const [currentChain, setChain] = React.useState(defaultChain)

	const [bridgesSettings] = useLocalStorageSettingsManager('bridges')
	const isBridgesShowingAddresses = bridgesSettings[BRIDGES_SHOWING_ADDRESSES]

	const { tokensTableData, addressesTableData, tokenDeposits, tokenWithdrawals } = tableDataByChain[currentChain]

	const volumeChartDataByChain = volumeDataByChain[currentChain]
	const prevDayChart = volumeChartDataByChain[volumeChartDataByChain.length - 2]
	const currentDepositsUSD = prevDayChart?.Deposited ?? 0
	const currentWithdrawalsUSD = -(prevDayChart?.Withdrawn ?? 0)
	const currentVolume = currentDepositsUSD + currentWithdrawalsUSD

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

	return (
		<>
			<div className="flex items-center justify-between gap-2 rounded-md border border-(--cards-border) bg-(--cards-bg) p-2">
				<h1 className="flex flex-nowrap items-center gap-1 text-xl font-semibold">
					<TokenLogo logo={logo} size={24} />
					<span>{displayName}</span>
				</h1>
				<BridgeChainSelector currentChain={currentChain} options={chainOptions} handleClick={setChain} />
			</div>
			<div className="relative isolate grid grid-cols-2 gap-2 xl:grid-cols-3">
				<div className="col-span-2 flex w-full flex-col gap-6 overflow-x-auto rounded-md border border-(--cards-border) bg-(--cards-bg) p-5 xl:col-span-1">
					<p className="flex flex-col gap-1 text-base">
						<span className="text-(--text-label)">Deposited to {currentChain} (24h)</span>
						<span className="font-jetbrains text-2xl font-semibold">
							{formattedNum(
								currentChain === 'All Chains' ? config?.last24hVolume || '0' : currentDepositsUSD || '0',
								true
							)}
						</span>
					</p>

					<p className="flex flex-col gap-1 text-base">
						<span className="text-(--text-label)">Withdrawn from {currentChain} (24h)</span>
						<span className="font-jetbrains text-2xl font-semibold">
							{formattedNum(
								currentChain === 'All Chains' ? config?.last24hVolume || '0' : currentWithdrawalsUSD || '0',
								true
							)}
						</span>
					</p>

					<p className="flex flex-col gap-1 text-base">
						<span className="text-(--text-label)">Volume Change (24h)</span>
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
					<div className="ml-auto w-full max-w-fit overflow-x-auto p-3">
						<TagGroup
							selectedValue={chartType}
							setValue={(chartType) => setChartType(chartType as ChartType)}
							values={CHART_TYPES}
							className="ml-auto"
						/>
					</div>
					<LazyChart className="relative col-span-full flex min-h-[360px] flex-col xl:col-span-1 xl:[&:last-child:nth-child(2n-1)]:col-span-full">
						{chartType === 'Inflows' && volumeChartDataByChain && volumeChartDataByChain.length > 0 && (
							<React.Suspense fallback={<></>}>
								<BarChart
									chartData={volumeChartDataByChain}
									title=""
									chartOptions={volumeChartOptions}
									stacks={inflowChartStacks}
								/>
							</React.Suspense>
						)}
						{chartType === 'Tokens To' && tokenWithdrawals && tokenWithdrawals.length > 0 && (
							<React.Suspense fallback={<></>}>
								<PieChart chartData={tokenWithdrawals} />
							</React.Suspense>
						)}
						{chartType === 'Tokens From' && tokenDeposits && tokenDeposits.length > 0 && (
							<React.Suspense fallback={<></>}>
								<PieChart chartData={tokenDeposits} />
							</React.Suspense>
						)}
					</LazyChart>
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
		<Layout title={`${props.displayName}: Bridge Volume - DefiLlama`} customSEO>
			<SEO cardName={props.displayName} token={props.displayName} />
			<BridgeInfo {...props} />
		</Layout>
	)
}

export const BridgeContainerOnClient = ({ protocol }: { protocol: string }) => {
	const { data, isLoading, error } = useQuery({
		queryKey: ['bridged-data', protocol],
		queryFn: () => getBridgePageDatanew(protocol),
		staleTime: 60 * 60 * 1000
	})

	if (isLoading) {
		return (
			<p className="my-[180px] flex items-center justify-center gap-1 text-center">
				Loading
				<LoadingDots />
			</p>
		)
	}

	if (error) {
		return <p className="my-[180px] text-center">{error.message}</p>
	}

	if (!data) {
		return <p className="my-[180px] text-center">Something went wrong, couldn't fetch data</p>
	}

	return (
		<div className="flex flex-col gap-10 p-4">
			<BridgeInfo {...data} />
		</div>
	)
}

export const useFetchBridgeVolumeOnAllChains = (protocol?: string | null) => {
	return useQuery({
		queryKey: ['bridged-volume-on-all-chains', protocol],
		queryFn: protocol
			? () => getBridgePageDatanew(protocol).then((data) => data.volumeDataByChain['All Chains'])
			: () => null,
		staleTime: 60 * 60 * 1000
	})
}
const volumeChartOptions = {
	overrides: {
		inflow: true
	}
}

const inflowChartStacks = {
	Deposited: 'stackA',
	Withdrawn: 'stackA'
}
