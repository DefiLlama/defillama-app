import { useMemo } from 'react'
import * as React from 'react'
import dynamic from 'next/dynamic'
import { useQueries, useQuery } from 'react-query'
import { useRouter } from 'next/router'
import type { NextRouter } from 'next/router'

import { BreakpointPanel } from '~/components'
import { Toggle, FiltersWrapper } from '~/components/ECharts/ProtocolChart/Misc'
import { ProtocolsChainsSearch } from '~/components/Search'
import { useDarkModeManager, useDefiManager } from '~/contexts/LocalStorage'
import LocalLoader from '~/components/LocalLoader'

import { ISettings } from '~/contexts/types'
import ReactSelect from '../MultiSelect/ReactSelect'

import { fetchWithErrorLogging } from '~/utils/async'
import { PROTOCOLS_API } from '~/constants'
import { OverallMetricsWrapper } from '~/containers/ChainContainer'
import { Name } from '~/layout/ProtocolAndPool'
import TokenLogo from '../TokenLogo'
import { chainIconUrl, formattedNum } from '~/utils'
import { AccordionStat, StatInARow } from '~/layout/Stats/Large'
import { ChevronRight } from 'react-feather'
import { last } from 'lodash'
import { RowWithSubRows, StatsTable2 } from '~/containers/Defi/Protocol'
import { Card, ControlsWrapper, DataWrapper, Grid, ToggleWrapper } from './styles'
import { get24hChange, getNDaysChange, getTotalNDaysSum } from './utils'

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
	const data = useQueries(
		chains.map((chain) => ({
			queryKey: ['compare', JSON.stringify(chain), JSON.stringify(extraTvlsEnabled)],
			queryFn: () => getChainData(chain, extraTvlsEnabled)
		}))
	)

	const chainsData = useQuery(['chains'], () =>
		fetch(PROTOCOLS_API)
			.then((r) => r.json())
			.then((pData) => pData?.chains?.map((val) => ({ value: val, label: val })))
	)
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
			<ControlsWrapper>
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
			</ControlsWrapper>

			<DataWrapper>
				<BreakpointPanel id="chartWrapper" style={{ minHeight: '430px' }}>
					<FiltersWrapper style={{ margin: 0, marginBottom: 'auto' }}>
						<ToggleWrapper>
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
						</ToggleWrapper>
					</FiltersWrapper>

					{data.isLoading || !router.isReady ? (
						<LocalLoader style={{ marginBottom: 'auto' }} />
					) : (
						<ChainChart title="" datasets={data?.data} isThemeDark={isDark} />
					)}
				</BreakpointPanel>
				<Grid>
					{data?.data.filter(Boolean)?.map((chainData, i) => {
						return (
							<Card key={`${chainData?.chain || i}`}>
								<OverallMetricsWrapper style={{ borderRight: 'none', maxWidth: '100%' }}>
									{
										<Name data-chainname>
											<TokenLogo logo={chainIconUrl(chainData?.chain)} size={24} />
											<span>{chainData.chain}</span>
										</Name>
									}
									<AccordionStat data-tvl>
										<summary>
											<span data-arrowicon>
												<ChevronRight size={20} />
											</span>

											<span data-summaryheader>
												<span>Total Value Locked</span>
												<span>{formattedNum(last(chainData.globalChart)?.[1], true)}</span>
											</span>
										</summary>

										<span style={{ gap: '8px' }}>
											<StatInARow>
												<span>Change (24h)</span>
												<span>{get24hChange(chainData.globalChart) || 0}%</span>
											</StatInARow>
										</span>
									</AccordionStat>

									<StatsTable2>
										<tbody>
											{chainData?.feesChart?.length ? (
												<tr>
													<th>Fees (24h)</th>
													<td>{formattedNum(last(chainData.feesChart)?.[1], true)}</td>
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
																	<th>Volume (7d)</th>
																	<td>{formattedNum(getTotalNDaysSum(chainData.volumeChart, 7), true)}</td>
																</tr>
															) : null}

															{chainData.volumeChart?.length ? (
																<tr>
																	<th>Volume (30d)</th>
																	<td>{formattedNum(getTotalNDaysSum(chainData.volumeChart, 30), true)}</td>
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
																	<th>Change (24H)</th>
																	<td>{formattedNum(get24hChange(chainData.usersData)) || 0}%</td>
																</tr>
															) : null}
															{chainData.usersData.length > 7 ? (
																<tr>
																	<th>Change (7d)</th>
																	<td>{formattedNum(getNDaysChange(chainData.usersData, 7)) || 0}%</td>
																</tr>
															) : null}
															{chainData.usersData.length > 30 ? (
																<tr>
																	<th>Change (30d)</th>
																	<td>{formattedNum(getNDaysChange(chainData.usersData, 30)) || 0}%</td>
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
																	<th>Stablecoins</th>
																	<td>
																		{formattedNum(chainData.rawData.chainTreasury.tokenBreakdowns?.stablecoins, true)}
																	</td>
																</tr>
															) : null}
															{chainData.rawData.chainTreasury.tokenBreakdowns?.majors ? (
																<tr>
																	<th>Major Tokens (ETH, BTC)</th>
																	<td>{formattedNum(chainData.rawData.chainTreasury.tokenBreakdowns?.majors, true)}</td>
																</tr>
															) : null}
															{chainData.rawData.chainTreasury.tokenBreakdowns?.others ? (
																<tr>
																	<th>Other Tokens</th>
																	<td>{formattedNum(chainData.rawData.chainTreasury.tokenBreakdowns?.others, true)}</td>
																</tr>
															) : null}
															{chainData.rawData.chainTreasury.tokenBreakdowns?.ownTokens ? (
																<tr>
																	<th>Own Tokens</th>
																	<td>
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
													<th>{chainData.rawData?.chainTokenInfo?.tokenSymbol} Price</th>
													<td>
														{formattedNum(chainData.rawData?.chainTokenInfo?.market_data?.current_price?.usd, true)}
													</td>
												</tr>
											) : null}

											{chainData.rawData?.chainTokenInfo?.market_data ? (
												<tr>
													<th>{chainData.rawData?.chainTokenInfo?.tokenSymbol} Market Cap</th>
													<td>{formattedNum(chainData.rawData?.chainTokenInfo?.market_data?.market_cap?.usd, true)}</td>
												</tr>
											) : null}
											{chainData.rawData?.chainTokenInfo?.market_data ? (
												<tr>
													<th>{chainData.rawData?.chainTokenInfo?.tokenSymbol} FDV</th>
													<td>
														{formattedNum(
															chainData.rawData?.chainTokenInfo?.market_data?.fully_diluted_valuation?.usd,
															true
														)}
													</td>
												</tr>
											) : null}
										</tbody>
									</StatsTable2>
								</OverallMetricsWrapper>
							</Card>
						)
					})}
				</Grid>
			</DataWrapper>
		</>
	)
}

export default ComparePage
