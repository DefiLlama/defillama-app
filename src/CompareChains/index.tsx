import * as React from 'react'
import dynamic from 'next/dynamic'
import { useQueries, useQuery } from '@tanstack/react-query'
import { useRouter } from 'next/router'
import type { NextRouter } from 'next/router'
import { useDarkModeManager, useDefiManager } from '~/contexts/LocalStorage'
import { LocalLoader } from '~/components/LocalLoader'
import { ISettings } from '~/contexts/types'
import { ReactSelect } from '~/components/MultiSelect/ReactSelect'
import { fetchWithErrorLogging } from '~/utils/async'
import { PROTOCOLS_API } from '~/constants'
import { TokenLogo } from '~/components/TokenLogo'
import { chainIconUrl, formattedNum } from '~/utils'
import { last } from 'lodash'
import { RowWithSubRows } from '~/containers/Defi/Protocol/RowWithSubRows'
import { get24hChange, getNDaysChange, getTotalNDaysSum } from './utils'
import { Icon } from '~/components/Icon'
import { Switch } from '~/components/Switch'

const fetch = fetchWithErrorLogging

const ChainChart: any = dynamic(() => import('~/ChainOverview/Chart').then((m) => m.ChainChart), {
	ssr: false
}) as React.FC<any>

const CustomOption = ({ innerProps, label, data }) => (
	<div {...innerProps} style={{ display: 'flex', margin: '8px', cursor: 'pointer' }}>
		<img
			src={`https://icons.llamao.fi/icons/chains/rsz_${label}?w=48&h=48`}
			alt={label}
			style={{ width: '20px', marginRight: '10px', borderRadius: '50%' }}
		/>
		{label}
	</div>
)

export const getChainData = async (chain: string, extraTvlsEnabled: ISettings) => {
	const data = await fetch(`/api/cache/chain/${chain}`).then((r) => r.json())

	const {
		chart,
		extraTvlCharts,
		bridgeData,
		feesData,
		volumeData,
		txsData,
		usersData,
		chainsSet,
		chainTreasury,
		chainTokenInfo,
		...others
	} = data?.chain
	const globalChart = (() => {
		const globalChart =
			chart &&
			chart.map((data) => {
				let sum = data[1]
				Object.entries(extraTvlCharts).forEach(([prop, propCharts]: any[]) => {
					const stakedData = propCharts.find((x) => x[0] === data[0])

					// find current date and only add values on that date in "data" above
					if (stakedData) {
						if (prop === 'doublecounted' && !extraTvlsEnabled['doublecounted']) {
							sum -= stakedData[1]
						}

						if (prop === 'liquidstaking' && !extraTvlsEnabled['liquidstaking']) {
							sum -= stakedData[1]
						}

						if (prop === 'dcAndLsOverlap') {
							if (!extraTvlsEnabled['doublecounted'] || !extraTvlsEnabled['liquidstaking']) {
								sum += stakedData[1]
							}
						}

						if (extraTvlsEnabled[prop.toLowerCase()] && prop !== 'doublecounted' && prop !== 'liquidstaking') {
							sum += stakedData[1]
						}
					}
				})
				return [data[0], sum]
			})

		return globalChart
	})()

	const bridgeChartData = (() => {
		return bridgeData
			? bridgeData?.chainVolumeData?.map((volume) => [volume?.date, volume?.Deposits, volume.Withdrawals])
			: null
	})()

	let volumeChart = null

	if (volumeData?.totalDataChart[0]?.length) {
		const index = volumeData?.totalDataChart[0]?.findIndex((val) => val[chain])
		volumeChart = volumeData.totalDataChart[0].slice(index).map((val) => [val.date, val[chain]])
	}

	const feesChart = (() =>
		feesData?.totalDataChart?.[0]?.length
			? feesData?.totalDataChart?.[0]?.map((val) => [val.date, val.Fees, val.Revenue])
			: null)()

	return {
		feesChart,
		volumeChart,
		bridgeChartData,
		globalChart,
		chain,
		txsData,
		usersData,
		chains: chainsSet,
		chainTreasury,
		chainTokenInfo,
		...others
	}
}

export const useCompare = ({ chains = [], extraTvlsEnabled }: { chains?: string[]; extraTvlsEnabled: ISettings }) => {
	const data = useQueries({
		queries: chains.map((chain) => ({
			queryKey: ['compare', JSON.stringify(chain), JSON.stringify(extraTvlsEnabled)],
			queryFn: () => getChainData(chain, extraTvlsEnabled),
			staleTime: 60 * 60 * 1000
		}))
	})

	const chainsData = useQuery({
		queryKey: ['chains'],
		queryFn: () =>
			fetch(PROTOCOLS_API)
				.then((r) => r.json())
				.then((pData) => pData?.chains?.map((val) => ({ value: val, label: val }))),
		staleTime: 60 * 60 * 1000
	})
	return {
		data: data.map((r) => r?.data),
		chains: chainsData.data,
		isLoading:
			(chains.length > 0 && data.every((r) => r.isLoading)) || data.some((r) => r.isRefetching) || chainsData.isLoading
	}
}

const updateRoute = (key, val, router: NextRouter) => {
	router.push(
		{
			query: {
				...router.query,
				[key]: val
			}
		},
		undefined,
		{ shallow: true }
	)
}

export function CompareChains() {
	const [isDark] = useDarkModeManager()
	const [extraTvlsEnabled] = useDefiManager()

	const router = useRouter()

	const data = useCompare({ extraTvlsEnabled, chains: router.query?.chains ? [router.query?.chains].flat() : [] })

	const components = React.useMemo(
		() => ({
			Option: CustomOption
		}),
		[]
	)

	const selectedChains = React.useMemo(() => {
		return [router?.query?.chains]
			.flat()
			.filter(Boolean)
			.map((chain) => ({ value: chain, label: chain }))
	}, [router.query])

	const onChainSelect = (chains: Array<Record<string, string>>) => {
		const selectedChains = chains.map((val) => val.value)

		updateRoute('chains', selectedChains, router)
	}

	return (
		<>
			<div className="bg-[var(--cards-bg)] rounded-md flex items-center gap-3 p-3 last:*:-my-3">
				<h2 className="font-semibold text-base">Compare chains: </h2>

				<ReactSelect
					defaultValue={router?.query?.chains || data?.chains?.[0]}
					isMulti
					value={selectedChains}
					name="colors"
					options={data.chains as any}
					className="basic-multi-select"
					classNamePrefix="select"
					onChange={onChainSelect}
					components={components}
					placeholder="Select Chains..."
				/>
			</div>

			<div className="flex flex-col gap-1 relative">
				<div className="bg-[var(--cards-bg)] rounded-md min-h-[404px]">
					<div className="flex items-center flex-wrap gap-2 p-3">
						{supportedCharts.map(({ id, name, key }) =>
							data?.data?.some((val) => val?.[key] && val?.[key]?.length > 0) ? (
								<Switch
									key={id + 'chart-option'}
									label={name}
									value={id}
									onChange={() => {
										updateRoute(
											id,
											id === 'tvl'
												? router.query[id] !== 'false'
													? 'false'
													: 'true'
												: router.query[id] === 'true'
												? 'false'
												: 'true',
											router
										)
									}}
									checked={id === 'tvl' ? router.query[id] !== 'false' : router.query[id] === 'true'}
								/>
							) : (
								false
							)
						)}
					</div>
					{data.isLoading || !router.isReady ? (
						<div className="flex items-center justify-center m-auto min-h-[360px]">
							<LocalLoader />
						</div>
					) : (
						<React.Suspense fallback={<></>}>
							<ChainChart title="" datasets={data?.data} isThemeDark={isDark} />
						</React.Suspense>
					)}
				</div>
				<div className="grid grid-cols-1 xl:grid-cols-2 grow gap-1">
					{data?.data.filter(Boolean)?.map((chainData, i) => {
						return (
							<div
								className="flex flex-col justify-between relative isolate xl:grid-cols-[auto_1fr] bg-[var(--cards-bg)] rounded-md"
								key={`${chainData?.chain || i}`}
							>
								<div className="flex flex-col gap-8 p-5 col-span-1 w-full rounded-xl text-[var(--text1)] bg-[var(--bg7)] overflow-x-auto">
									<h1 className="flex items-center gap-2 text-xl">
										<TokenLogo logo={chainIconUrl(chainData?.chain)} size={24} />
										<span>{chainData.chain}</span>
									</h1>

									<details className="group text-base">
										<summary className="flex items-center">
											<Icon
												name="chevron-right"
												height={20}
												width={20}
												className="-ml-5 -mb-5 group-open:rotate-90 transition-transform duration-100"
											/>

											<span className="flex flex-col">
												<span className="text-[#545757] dark:text-[#cccccc]">Total Value Locked (DeFi)</span>
												<span className="font-semibold text-2xl font-jetbrains min-h-8">
													{formattedNum(last(chainData.globalChart)?.[1], true)}
												</span>
											</span>
										</summary>

										<p className="flex items-center flex-wrap justify-between gap-2 mt-3 mb-1">
											<span className="text-[#545757] dark:text-[#cccccc]">Change (24h)</span>
											<span className="font-jetbrains">{get24hChange(chainData.globalChart) || 0}%</span>
										</p>
									</details>

									<table className="text-base w-full border-collapse mt-4">
										<tbody>
											{chainData?.feesAndRevenueData?.totalFees24h ? (
												<>
													<tr>
														<th className="text-[#545757] dark:text-[#cccccc] font-normal text-left">Fees (24h)</th>
														<td className="font-jetbrains text-right">
															{formattedNum(chainData.feesAndRevenueData.totalFees24h, true)}
														</td>
													</tr>
													<tr>
														<th className="text-[#545757] dark:text-[#cccccc] font-normal text-left">Revenue (24h)</th>
														<td className="font-jetbrains text-right">
															{formattedNum(chainData.feesAndRevenueData.totalRevenue24h, true)}
														</td>
													</tr>
													<tr>
														<th className="text-[#545757] dark:text-[#cccccc] font-normal text-left">
															App Revenue (24h)
														</th>
														<td className="font-jetbrains text-right">
															{formattedNum(chainData.feesAndRevenueData.totalAppRevenue24h, true)}
														</td>
													</tr>
												</>
											) : null}

											{chainData.volumeChart?.length ? (
												<RowWithSubRows
													rowHeader={'Volume (24h)'}
													rowValue={formattedNum(last(chainData.volumeChart)?.[1], true)}
													helperText={null}
													protocolName={null}
													dataType={null}
													subRows={
														<>
															<tr>
																<th className="text-left font-normal pl-1 pb-1 text-[#545757] dark:text-[#cccccc]">
																	Volume (7d)
																</th>
																<td className="font-jetbrains text-right">
																	{formattedNum(getTotalNDaysSum(chainData.volumeChart, 7), true)}
																</td>
															</tr>

															<tr>
																<th className="text-left font-normal pl-1 pb-1 text-[#545757] dark:text-[#cccccc]">
																	Volume (30d)
																</th>
																<td className="font-jetbrains text-right">
																	{formattedNum(getTotalNDaysSum(chainData.volumeChart, 30), true)}
																</td>
															</tr>
														</>
													}
												/>
											) : null}

											{chainData.perpsData?.totalVolume24h ? (
												<RowWithSubRows
													rowHeader={'Perps Volume (24h)'}
													rowValue={formattedNum(chainData.perpsData.totalVolume24h, true)}
													helperText={null}
													protocolName={null}
													dataType={null}
													subRows={
														<>
															<tr>
																<th className="text-left font-normal pl-1 pb-1 text-[#545757] dark:text-[#cccccc]">
																	Volume (7d)
																</th>
																<td className="font-jetbrains text-right">
																	{formattedNum(chainData.perpsData.totalVolume7d, true)}
																</td>
															</tr>

															<tr>
																<th className="text-left font-normal pl-1 pb-1 text-[#545757] dark:text-[#cccccc]">
																	Weekly Change
																</th>
																<td className="font-jetbrains text-right">{chainData.perpsData.weeklyChange}%</td>
															</tr>
														</>
													}
												/>
											) : null}

											{chainData?.usersData?.length ? (
												<RowWithSubRows
													rowHeader={'Active Addresses (24h)'}
													rowValue={formattedNum(last(chainData.usersData)[1], false)}
													helperText={null}
													protocolName={null}
													dataType={null}
													subRows={
														<>
															{chainData.usersData ? (
																<tr>
																	<th className="text-left font-normal pl-1 pb-1 text-[#545757] dark:text-[#cccccc]">
																		Change (24H)
																	</th>
																	<td className="font-jetbrains text-right">
																		{formattedNum(get24hChange(chainData.usersData)) || 0}%
																	</td>
																</tr>
															) : null}
															{chainData.usersData.length > 7 ? (
																<tr>
																	<th className="text-left font-normal pl-1 pb-1 text-[#545757] dark:text-[#cccccc]">
																		Change (7d)
																	</th>
																	<td className="font-jetbrains text-right">
																		{formattedNum(getNDaysChange(chainData.usersData, 7)) || 0}%
																	</td>
																</tr>
															) : null}
															{chainData.usersData.length > 30 ? (
																<tr>
																	<th className="text-left font-normal pl-1 pb-1 text-[#545757] dark:text-[#cccccc]">
																		Change (30d)
																	</th>
																	<td className="font-jetbrains text-right">
																		{formattedNum(getNDaysChange(chainData.usersData, 30)) || 0}%
																	</td>
																</tr>
															) : null}
														</>
													}
												/>
											) : null}
											{chainData.chainTreasury ? (
												<RowWithSubRows
													rowHeader={'Treasury'}
													rowValue={formattedNum(chainData.chainTreasury?.tvl, true)}
													helperText={null}
													protocolName={null}
													dataType={null}
													subRows={
														<>
															{chainData.chainTreasury.tokenBreakdowns?.stablecoins ? (
																<tr>
																	<th className="text-left font-normal pl-1 pb-1 text-[#545757] dark:text-[#cccccc]">
																		Stablecoins
																	</th>
																	<td className="font-jetbrains text-right">
																		{formattedNum(chainData.chainTreasury.tokenBreakdowns?.stablecoins, true)}
																	</td>
																</tr>
															) : null}
															{chainData.chainTreasury.tokenBreakdowns?.majors ? (
																<tr>
																	<th className="text-left font-normal pl-1 pb-1 text-[#545757] dark:text-[#cccccc]">
																		Major Tokens (ETH, BTC)
																	</th>
																	<td className="font-jetbrains text-right">
																		{formattedNum(chainData.chainTreasury.tokenBreakdowns?.majors, true)}
																	</td>
																</tr>
															) : null}
															{chainData.chainTreasury.tokenBreakdowns?.others ? (
																<tr>
																	<th className="text-left font-normal pl-1 pb-1 text-[#545757] dark:text-[#cccccc]">
																		Other Tokens
																	</th>
																	<td className="font-jetbrains text-right">
																		{formattedNum(chainData.chainTreasury.tokenBreakdowns?.others, true)}
																	</td>
																</tr>
															) : null}
															{chainData.chainTreasury.tokenBreakdowns?.ownTokens ? (
																<tr>
																	<th className="text-left font-normal pl-1 pb-1 text-[#545757] dark:text-[#cccccc]">
																		Own Tokens
																	</th>
																	<td className="font-jetbrains text-right">
																		{formattedNum(chainData.chainTreasury.tokenBreakdowns?.ownTokens, true)}
																	</td>
																</tr>
															) : null}
														</>
													}
												/>
											) : null}
											{chainData?.chainTokenInfo?.market_data ? (
												<tr>
													<th className="text-[#545757] dark:text-[#cccccc] font-normal text-left">
														{chainData?.chainTokenInfo?.tokenSymbol} Price
													</th>
													<td className="font-jetbrains text-right">
														{formattedNum(chainData?.chainTokenInfo?.market_data?.current_price?.usd, true)}
													</td>
												</tr>
											) : null}

											{chainData?.chainTokenInfo?.market_data ? (
												<tr>
													<th className="text-[#545757] dark:text-[#cccccc] font-normal text-left">
														{chainData?.chainTokenInfo?.tokenSymbol} Market Cap
													</th>
													<td className="font-jetbrains text-right">
														{formattedNum(chainData?.chainTokenInfo?.market_data?.market_cap?.usd, true)}
													</td>
												</tr>
											) : null}
											{chainData?.chainTokenInfo?.market_data ? (
												<tr>
													<th className="text-[#545757] dark:text-[#cccccc] font-normal text-left">
														{chainData?.chainTokenInfo?.tokenSymbol} FDV
													</th>
													<td className="font-jetbrains text-right">
														{formattedNum(chainData?.chainTokenInfo?.market_data?.fully_diluted_valuation?.usd, true)}
													</td>
												</tr>
											) : null}
										</tbody>
									</table>
								</div>
							</div>
						)
					})}
				</div>
			</div>
		</>
	)
}

const supportedCharts = [
	{
		id: 'tvl',
		name: 'TVL',
		isVisible: true,
		key: 'globalChart'
	},
	{
		id: 'volume',
		name: 'DEXs Volume',
		key: 'volumeChart'
	},
	{
		id: 'chainFees',
		name: 'Chain Fees',
		key: 'feesChart'
	},
	{
		id: 'chainRevenue',
		name: 'Chain Revenue',
		key: 'feesChart'
	},
	{
		id: 'appRevenue',
		name: 'App Revenue',
		key: 'appRevenueChart'
	},
	{
		id: 'addresses',
		name: 'Active Addresses',
		key: 'usersData'
	},
	{
		id: 'txs',
		name: 'Transactions',
		key: 'txsData'
	}
]
