import { useMemo } from 'react'
import * as React from 'react'
import dynamic from 'next/dynamic'
import { useQueries, useQuery } from 'react-query'
import { useRouter } from 'next/router'
import type { NextRouter } from 'next/router'
import styled from 'styled-components'

import { BreakpointPanel } from '~/components'
import { Toggle, FiltersWrapper } from '~/components/ECharts/ProtocolChart/Misc'
import { ProtocolsChainsSearch } from '~/components/Search'
import { useDarkModeManager, useDefiManager } from '~/contexts/LocalStorage'
import LocalLoader from '~/components/LocalLoader'

import { ISettings } from '~/contexts/types'
import ReactSelect from '../MultiSelect/ReactSelect'

import { fetchWithErrorLogging } from '~/utils/async'
import { getChainPageData } from '~/api/categories/chains'
import { formatChainTvlChart, formatChartDatasets } from '~/containers/ChainContainer/useFetchChainChartData'
import { chainCoingeckoIds, chainCoingeckoIdsForGasNotMcap } from '~/constants/chainTokens'
import { getDexVolumeByChain } from '~/api/categories/dexs'
import { getFeesAndRevenueChartDataByChain } from '~/api/categories/chains/client'
import { getStabelcoinsChartDataByChain } from '~/api/categories/stablecoins/client'
import { getBridgeChartDataByChain } from '~/api/categories/bridges/client'
import { fetchProtocolTransactions, getProtocolUsers } from '~/api/categories/protocols/client'

const fetch = fetchWithErrorLogging

const DataWrapper = styled.div`
	display: flex;
	flex-direction: column;
	gap: 10px;
	position: relative;
	min-height: 500px;

	#chartWrapper {
		flex: 1;
	}

	@media screen and (min-width: 105rem) {
		flex-direction: row;
	}
`

const ControlsWrapper = styled.div`
	width: fit-content;
`

const ToggleWrapper = styled.span`
	display: flex;
	align-items: center;
	gap: 8px;
	flex-wrap: wrap;
	margin-left: auto;
`

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

const getChainData = async ({ chain, extraTvlsEnabled }: { chain: string; extraTvlsEnabled: ISettings }) => {
	const {
		props: {
			volumeData,
			feesAndRevenueData,
			stablecoinsData,
			inflowsData,
			userData,
			raisesChart,
			chart,
			extraTvlCharts,
			chainsSet
		}
	} = await getChainPageData(chain)

	const chainDenomination = chainCoingeckoIds[chain] ?? chainCoingeckoIdsForGasNotMcap[chain] ?? null

	const chainGeckoId = chainDenomination?.geckoId ?? null

	const denomination = 'USD'

	const [volumeChart, feesAndRevenueChart, stablecoinsChartData, inflowsChartData, usersData, txsData] =
		await Promise.all([
			volumeData?.totalVolume24h
				? getDexVolumeByChain({ chain, excludeTotalDataChart: false, excludeTotalDataChartBreakdown: true }).then(
						(data) => data?.totalDataChart ?? null
				  )
				: () => null,
			feesAndRevenueData?.totalFees24h ? getFeesAndRevenueChartDataByChain({ chain }) : () => null,
			(stablecoinsData as any)?.totalMcapCurrent ? getStabelcoinsChartDataByChain({ chain }) : () => null,
			inflowsData?.netInflows ? getBridgeChartDataByChain({ chain }) : () => null,
			userData.activeUsers ? getProtocolUsers('chain$' + chain) : () => null,
			userData.transactions ? fetchProtocolTransactions('chain$' + chain) : () => null
		])
	const globalChart = formatChainTvlChart({ chart, extraTvlsEnabled, extraTvlCharts })

	const chartDatasets = formatChartDatasets({
		chainGeckoId,
		denomination,
		denominationPriceHistory: null,
		feesAndRevenueChart,
		globalChart,
		inflowsChartData,
		raisesChart,
		stablecoinsChartData,
		txsData,
		usersData,
		volumeChart
	})
	const [charts] = chartDatasets
	return { chain, chains: chainsSet, ...charts }
}

const useCompare = ({ query, extraTvlsEnabled }: { query: any; extraTvlsEnabled: ISettings }) => {
	const chains = query.chains ? [query.chains].flat() : []

	const data = useQueries(
		chains.map((chain) => ({
			queryKey: ['compare', JSON.stringify(chain), JSON.stringify(extraTvlsEnabled)],
			queryFn: () => getChainData({ chain, extraTvlsEnabled })
		}))
	)

	const chainsData = useQuery(['chains'], () =>
		fetch('https://defillama-datasets.llama.fi/lite/protocols2')
			.then((r) => r.json())
			.then((pData) => pData?.chains?.map((val) => ({ value: val, label: val })))
	)
	const isLoading = data.some((r) => r.status === 'loading') || data.some((r) => r.isRefetching) || chainsData.isLoading
	return {
		data: isLoading ? [] : data.map((r) => r?.data ?? {}),
		chains: chainsData.data,
		isLoading
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
	const [extraTvlsEnabled] = useDefiManager()
	const [darkMode] = useDarkModeManager()

	const router = useRouter()

	const data = useCompare({ extraTvlsEnabled, query: router?.query ?? {} })

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

	React.useEffect(() => {
		if (!router?.query?.chains) updateRoute('chains', 'Ethereum', router)
	}, [router])

	return (
		<>
			<ProtocolsChainsSearch
				step={{
					category: 'Compare Protocols',
					name: 'Open Protocol'
				}}
			/>
			<h2>Compare chains </h2>

			<ControlsWrapper>
				<ReactSelect
					defaultValue={router?.query?.chains ?? data?.chains?.[0]}
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
									id: 'users',
									name: 'Active Users',
									key: 'usersData'
								},
								{
									id: 'txs',
									name: 'Transactions',
									key: 'txsData'
								}
							].map(({ id, name, key }) =>
								data?.data?.some((val) => val?.[key] && val?.[key]?.length > 0) ? (
									<Toggle>
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
						<ChainChart title="" datasets={data?.data} isThemeDark={darkMode} />
					)}
				</BreakpointPanel>
			</DataWrapper>
		</>
	)
}

export default ComparePage
