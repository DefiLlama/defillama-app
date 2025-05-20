import * as React from 'react'
import dynamic from 'next/dynamic'
import Layout from '~/layout'
import { BridgesSearch } from '~/components/Search/Bridges'
import { TokenLogo } from '~/components/TokenLogo'
import { SEO } from '~/components/SEO'
import { BRIDGES_SHOWING_ADDRESSES, useLocalStorageSettingsManager } from '~/contexts/LocalStorage'
import { formattedNum, getPercentChange } from '~/utils'
import type { IBarChartProps, IPieChartProps } from '~/components/ECharts/types'
import { BridgeTokensTable, BridgeAddressesTable } from '~/components/Table/Bridges'
import { AddressesTableSwitch } from '~/containers/Bridges/TableSwitch'
import { BridgeChainSelector } from '~/containers/Bridges/BridgeChainSelector'
import { getBridgePageDatanew } from '~/containers/Bridges/queries.server'
import { useQuery } from '@tanstack/react-query'
import { Icon } from '~/components/Icon'
import { LazyChart } from '~/components/LazyChart'

const BarChart = dynamic(() => import('~/components/ECharts/BarChart'), {
	ssr: false
}) as React.FC<IBarChartProps>

const PieChart = dynamic(() => import('~/components/ECharts/PieChart'), {
	ssr: false
}) as React.FC<IPieChartProps>

const BridgeInfo = ({
	displayName,
	logo,
	chains,
	defaultChain,
	volumeDataByChain,
	tableDataByChain,
	config = {} as Record<string, string>
}) => {
	const [chartType, setChartType] = React.useState('Inflows')
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
			<div className="bg-[var(--cards-bg)] rounded-md p-3 flex items-center justify-between gap-2">
				<h1 className="flex flex-nowrap items-center gap-1 text-xl font-semibold">
					<TokenLogo logo={logo} size={24} />
					<span>{displayName}</span>
				</h1>
				<BridgeChainSelector currentChain={currentChain} options={chainOptions} handleClick={setChain} />
			</div>
			<div className="grid grid-cols-2 relative isolate xl:grid-cols-3 gap-1">
				<div className="bg-[var(--cards-bg)] rounded-md flex flex-col gap-3 p-5 col-span-2 w-full xl:col-span-1 overflow-x-auto">
					<p className="flex flex-col gap-1 text-base">
						<span className="text-[#545757] dark:text-[#cccccc]">Deposited to {currentChain} (24h)</span>
						<span className="font-jetbrains font-semibold text-2xl">
							{formattedNum(
								currentChain === 'All Chains' ? config?.last24hVolume || '0' : currentDepositsUSD || '0',
								true
							)}
						</span>
					</p>

					<p className="flex flex-col gap-1 text-base">
						<span className="text-[#545757] dark:text-[#cccccc]">Withdrawn from {currentChain} (24h)</span>
						<span className="font-jetbrains font-semibold text-2xl">
							{formattedNum(
								currentChain === 'All Chains' ? config?.last24hVolume || '0' : currentWithdrawalsUSD || '0',
								true
							)}
						</span>
					</p>

					<p className="flex flex-col gap-1 text-base">
						<span className="text-[#545757] dark:text-[#cccccc]">Volume Change (24h)</span>
						<span className="font-jetbrains font-semibold text-2xl">{volPercentChange + '%'}</span>
					</p>
					{config?.url ? (
						<a
							className="flex items-center gap-1 justify-center py-1 px-2 whitespace-nowrap text-xs rounded-md text-[var(--link-text)] bg-[var(--link-bg)] hover:bg-[var(--link-hover-bg)] focus-visible:bg-[var(--link-hover-bg)] mt-auto mr-auto"
							href={config.url}
							target="_blank"
							rel="noreferrer noopener"
						>
							<span>Website</span> <Icon name="arrow-up-right" height={14} width={14} />
						</a>
					) : null}
				</div>

				<div className="bg-[var(--cards-bg)] rounded-md col-span-2">
					<div className="w-full max-w-fit overflow-x-auto ml-auto p-3">
						<div className="text-xs font-medium flex items-center rounded-md overflow-x-auto flex-nowrap w-fit border border-[var(--form-control-border)] text-[#666] dark:text-[#919296]">
							<button
								className="flex-shrink-0 py-2 px-3 whitespace-nowrap hover:bg-[var(--link-hover-bg)] focus-visible:bg-[var(--link-hover-bg)] data-[active=true]:bg-[var(--old-blue)] data-[active=true]:text-white"
								data-active={chartType === 'Inflows'}
								onClick={() => setChartType('Inflows')}
							>
								Inflows
							</button>
							<button
								className="flex-shrink-0 py-2 px-3 whitespace-nowrap hover:bg-[var(--link-hover-bg)] focus-visible:bg-[var(--link-hover-bg)] data-[active=true]:bg-[var(--old-blue)] data-[active=true]:text-white"
								data-active={chartType === 'Tokens To'}
								onClick={() => setChartType('Tokens To')}
							>
								Tokens To
							</button>
							<button
								className="flex-shrink-0 py-2 px-3 whitespace-nowrap hover:bg-[var(--link-hover-bg)] focus-visible:bg-[var(--link-hover-bg)] data-[active=true]:bg-[var(--old-blue)] data-[active=true]:text-white"
								data-active={chartType === 'Tokens From'}
								onClick={() => setChartType('Tokens From')}
							>
								Tokens From
							</button>
						</div>
					</div>
					<LazyChart className="relative col-span-full min-h-[360px] flex flex-col xl:col-span-1 xl:[&:last-child:nth-child(2n_-_1)]:col-span-full">
						{chartType === 'Inflows' && volumeChartDataByChain && volumeChartDataByChain.length > 0 && (
							<BarChart
								chartData={volumeChartDataByChain}
								title=""
								chartOptions={volumeChartOptions}
								stacks={inflowChartStacks}
							/>
						)}
						{chartType === 'Tokens To' && tokenWithdrawals && tokenWithdrawals.length > 0 && (
							<PieChart chartData={tokenWithdrawals} />
						)}
						{chartType === 'Tokens From' && tokenDeposits && tokenDeposits.length > 0 && (
							<PieChart chartData={tokenDeposits} />
						)}
					</LazyChart>
				</div>
			</div>
			<div className="bg-[var(--cards-bg)] rounded-md">
				<div className="flex items-end justify-between flex-wrap gap-2 p-3">
					<AddressesTableSwitch />
					<p className="opacity-60 text-sm italic">All stats in table are for the previous day.</p>
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
		<Layout title={`${props.displayName}: Bridge Volume - DefiLlama`}>
			<SEO cardName={props.displayName} token={props.displayName} />

			<BridgesSearch />

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
		return <p className="my-[180px] text-center">Loading...</p>
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
