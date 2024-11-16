import { useMemo } from 'react'
import * as React from 'react'
import dynamic from 'next/dynamic'
import { useQueries, useQuery } from '@tanstack/react-query'
import { useRouter } from 'next/router'
import type { NextRouter } from 'next/router'

import { Toggle } from '~/components/ECharts/ProtocolChart/Misc'
import { ProtocolsChainsSearch } from '~/components/Search/ProtocolsChains'
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
// import { ControlsWrapper, DataWrapper, Grid } from './styles'
import { get24hChange, getNDaysChange, getTotalNDaysSum } from './utils'
import { Icon } from '~/components/Icon'

const fetch = fetchWithErrorLogging

const ChainChart = dynamic(() => import('~/components/ECharts/ChainChart'), {
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
	const data = await fetch('https://fe-cache.llama.fi/' + chain).then((r) => r.json())
	const {
		chart,
		extraTvlCharts,
		chainFeesData,
		chainVolumeData,
		bridgeData,
		feesData,
		volumeData,
		txsData,
		usersData,
		chainsSet
	} = data?.data
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

	const chainProtocolsVolumes = (() => {
		const allProtocolVolumes = []
		chainVolumeData &&
			chainVolumeData?.protocols?.forEach((prototcol) =>
				allProtocolVolumes.push(prototcol, ...(prototcol?.subRows || []))
			)

		return allProtocolVolumes
	})()

	const chainProtocolsFees = (() => {
		const allProtocolFees = []
		chainFeesData &&
			chainFeesData?.protocols?.forEach((prototcol) => allProtocolFees.push(prototcol, ...(prototcol?.subRows || [])))

		return allProtocolFees
	})()

	const bridgeChartData = (() => {
		return bridgeData
			? bridgeData?.chainVolumeData?.map((volume) => [volume?.date, volume?.Deposits, volume.Withdrawals])
			: null
	})()

	const volumeChart = (() =>
		volumeData?.totalDataChart[0]?.[0][chain]
			? volumeData?.totalDataChart?.[0].map((val) => [val.date, val[chain]])
			: null)()

	const feesChart = (() =>
		feesData?.totalDataChart?.[0].length
			? feesData?.totalDataChart?.[0]?.map((val) => [val.date, val.Fees, val.Revenue])
			: null)()

	return {
		feesChart,
		volumeChart,
		bridgeChartData,
		chainProtocolsFees,
		chainProtocolsVolumes,
		globalChart,
		chain,
		txsData,
		usersData,
		chains: chainsSet,
		rawData: data?.data
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
		isLoading: data.every((r) => r.status === 'loading') || data.some((r) => r.isRefetching) || chainsData.isLoading
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

function ComparePage() {
	const [isDark] = useDarkModeManager()
	const [extraTvlsEnabled] = useDefiManager()

	const router = useRouter()

	const data = useCompare({ extraTvlsEnabled, chains: router.query?.chains ? [router.query?.chains].flat() : [] })
	const onChainSelect = (chains: Array<Record<string, string>>) => {
		const selectedChains = chains.map((val) => val.value)

		updateRoute('chains', selectedChains, router)
	}

	const components = useMemo(
		() => ({
			Option: CustomOption
		}),
		[]
	)

	const selectedChains = [router?.query?.chains]
		.flat()
		.filter(Boolean)
		.map((chain) => ({ value: chain, label: chain }))

	return (
		<>
			<ProtocolsChainsSearch
				step={{
					category: 'Compare Protocols',
					name: 'Open Protocol'
				}}
			/>
			<div className="w-full max-w-fit flex items-center gap-2">
				<h2>Compare chains: </h2>

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

			<div className="flex flex-col gap-2 relative">
				<div className="border border-[var(--divider)] shadow rounded-md p-4 min-h-[438px]">
					<div className="mb-auto flex items-center gap-2 ml-auto">
						{[
							{
								id: 'tvl',
								name: 'TVL',
								isVisible: true,
								key: 'globalChart'
							},
							{
								id: 'volume',
								name: 'Volume',
								key: 'volumeChart'
							},
							{
								id: 'fees',
								name: 'Fees',
								key: 'feesChart'
							},
							{
								id: 'revenue',
								name: 'Revenue',
								key: 'feesChart'
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
						].map(({ id, name, key }) =>
							data?.data?.some((val) => val?.[key] && val?.[key]?.length > 0) ? (
								<Toggle key={id}>
									<input
										key={id}
										type="checkbox"
										onClick={() => {
											updateRoute(id, router.query[id] === 'true' ? 'false' : 'true', router)
										}}
										checked={router.query[id] === 'true'}
									/>
									<span data-wrapper="true">
										<span>{name}</span>
									</span>
								</Toggle>
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
						<ChainChart title="" datasets={data?.data} isThemeDark={isDark} />
					)}
				</div>
				<div className="grid grid-cols-1 xl:grid-cols-2 grow gap-2">
					{data?.data.filter(Boolean)?.map((chainData, i) => {
						return (
							<div
								className="flex flex-col justify-between relative isolate xl:grid-cols-[auto_1fr] bg-[var(--bg6)] border border-[var(--divider)] shadow rounded-xl"
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
												<span className="text-[#545757] dark:text-[#cccccc]">Total Value Locked</span>
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
											{chainData?.feesChart?.length ? (
												<tr>
													<th className="text-[#545757] dark:text-[#cccccc] font-normal text-left">Fees (24h)</th>
													<td className="font-jetbrains text-right">
														{formattedNum(last(chainData.feesChart)?.[1], true)}
													</td>
												</tr>
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
															{chainData.volumeChart?.length ? (
																<tr>
																	<th className="text-left font-normal pl-1 pb-1 text-[#545757] dark:text-[#cccccc]">
																		Volume (7d)
																	</th>
																	<td className="font-jetbrains text-right">
																		{formattedNum(getTotalNDaysSum(chainData.volumeChart, 7), true)}
																	</td>
																</tr>
															) : null}

															{chainData.volumeChart?.length ? (
																<tr>
																	<th className="text-left font-normal pl-1 pb-1 text-[#545757] dark:text-[#cccccc]">
																		Volume (30d)
																	</th>
																	<td className="font-jetbrains text-right">
																		{formattedNum(getTotalNDaysSum(chainData.volumeChart, 30), true)}
																	</td>
																</tr>
															) : null}
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
											{chainData.rawData.chainTreasury ? (
												<RowWithSubRows
													rowHeader={'Treasury'}
													rowValue={formattedNum(chainData.rawData.chainTreasury?.tvl, true)}
													helperText={null}
													protocolName={null}
													dataType={null}
													subRows={
														<>
															{chainData.rawData.chainTreasury.tokenBreakdowns?.stablecoins ? (
																<tr>
																	<th className="text-left font-normal pl-1 pb-1 text-[#545757] dark:text-[#cccccc]">
																		Stablecoins
																	</th>
																	<td className="font-jetbrains text-right">
																		{formattedNum(chainData.rawData.chainTreasury.tokenBreakdowns?.stablecoins, true)}
																	</td>
																</tr>
															) : null}
															{chainData.rawData.chainTreasury.tokenBreakdowns?.majors ? (
																<tr>
																	<th className="text-left font-normal pl-1 pb-1 text-[#545757] dark:text-[#cccccc]">
																		Major Tokens (ETH, BTC)
																	</th>
																	<td className="font-jetbrains text-right">
																		{formattedNum(chainData.rawData.chainTreasury.tokenBreakdowns?.majors, true)}
																	</td>
																</tr>
															) : null}
															{chainData.rawData.chainTreasury.tokenBreakdowns?.others ? (
																<tr>
																	<th className="text-left font-normal pl-1 pb-1 text-[#545757] dark:text-[#cccccc]">
																		Other Tokens
																	</th>
																	<td className="font-jetbrains text-right">
																		{formattedNum(chainData.rawData.chainTreasury.tokenBreakdowns?.others, true)}
																	</td>
																</tr>
															) : null}
															{chainData.rawData.chainTreasury.tokenBreakdowns?.ownTokens ? (
																<tr>
																	<th className="text-left font-normal pl-1 pb-1 text-[#545757] dark:text-[#cccccc]">
																		Own Tokens
																	</th>
																	<td className="font-jetbrains text-right">
																		{formattedNum(chainData.rawData.chainTreasury.tokenBreakdowns?.ownTokens, true)}
																	</td>
																</tr>
															) : null}
														</>
													}
												/>
											) : null}
											{chainData.rawData?.chainTokenInfo?.market_data ? (
												<tr>
													<th className="text-[#545757] dark:text-[#cccccc] font-normal text-left">
														{chainData.rawData?.chainTokenInfo?.tokenSymbol} Price
													</th>
													<td className="font-jetbrains text-right">
														{formattedNum(chainData.rawData?.chainTokenInfo?.market_data?.current_price?.usd, true)}
													</td>
												</tr>
											) : null}

											{chainData.rawData?.chainTokenInfo?.market_data ? (
												<tr>
													<th className="text-[#545757] dark:text-[#cccccc] font-normal text-left">
														{chainData.rawData?.chainTokenInfo?.tokenSymbol} Market Cap
													</th>
													<td className="font-jetbrains text-right">
														{formattedNum(chainData.rawData?.chainTokenInfo?.market_data?.market_cap?.usd, true)}
													</td>
												</tr>
											) : null}
											{chainData.rawData?.chainTokenInfo?.market_data ? (
												<tr>
													<th className="text-[#545757] dark:text-[#cccccc] font-normal text-left">
														{chainData.rawData?.chainTokenInfo?.tokenSymbol} FDV
													</th>
													<td className="font-jetbrains text-right">
														{formattedNum(
															chainData.rawData?.chainTokenInfo?.market_data?.fully_diluted_valuation?.usd,
															true
														)}
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

export default ComparePage
