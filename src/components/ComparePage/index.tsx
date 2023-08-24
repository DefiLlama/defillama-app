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
import { Header } from '~/Theme'

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

const getChainData = async (chain: string, extraTvlsEnabled: ISettings) => {
	const {
		data: {
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
		}
	} = await fetch('https://fe-cache.llama.fi/' + chain).then((r) => r.json())

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
		chains: chainsSet
	}
}

const useCompare = ({
	chains = ['Ethereum', 'BSC'],
	extraTvlsEnabled
}: {
	chains?: string[]
	extraTvlsEnabled: ISettings
}) => {
	const data = useQueries(
		chains.map((chain) => ({
			queryKey: ['compare', JSON.stringify(chain), JSON.stringify(extraTvlsEnabled)],
			queryFn: () => getChainData(chain, extraTvlsEnabled)
		}))
	)

	const chainsData = useQuery(['chains'], () =>
		fetch('https://defillama-datasets.llama.fi/lite/protocols2')
			.then((r) => r.json())
			.then((pData) => pData?.chains?.map((val) => ({ value: val, label: val })))
	)

	return {
		data: data.map((r) => r?.data),
		chains: chainsData.data,
		isLoading: data.some((r) => r.status === 'loading') || data.some((r) => r.isRefetching) || chainsData.isLoading
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
			<Header>Compare chains </Header>

			<ControlsWrapper>
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
						<ChainChart title="" datasets={data?.data} isThemeDark={isDark} />
					)}
				</BreakpointPanel>
			</DataWrapper>
		</>
	)
}

export default ComparePage
