import { useMemo } from 'react'
import * as React from 'react'
import dynamic from 'next/dynamic'
import { ArrowUpRight } from 'react-feather'
import { useQueries, useQuery } from 'react-query'
import Image from 'next/future/image'
import Link from 'next/link'
import { useRouter } from 'next/router'
import styled from 'styled-components'

import { BreakpointPanel } from '~/components'
import Announcement from '~/components/Announcement'
import { Toggle, FiltersWrapper } from '~/components/ECharts/ProtocolChart/Misc'
import { ProtocolsChainsSearch } from '~/components/Search'
import { useDefiManager } from '~/contexts/LocalStorage'
import LocalLoader from '~/components/LocalLoader'

import { ISettings } from '~/contexts/types'
import ReactSelect from '../MultiSelect/ReactSelect'

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
			queryKey: ['compare', chain, Object.values(extraTvlsEnabled)],
			queryFn: () => getChainData(chain, extraTvlsEnabled)
		}))
	)

	const protocolsData = useQuery(['chains'], () =>
		fetch('https://defillama-datasets.llama.fi/lite/protocols2').then((r) => r.json())
	)

	return {
		...data,
		data: data.map((r) => r?.data),
		chains: protocolsData?.data?.chains,
		isLoading: data.some((r) => r.status === 'loading')
	}
}

function ComparePage() {
	const [extraTvlsEnabled] = useDefiManager()

	const router = useRouter()

	const data = useCompare({ extraTvlsEnabled, chains: router.query?.chains ? [router.query?.chains].flat() : [] })
	const chains = useMemo(() => data?.chains?.map((val) => ({ value: val, label: val })), [data])

	const updateRoute = (key, val) => {
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

	const onChainSelect = (chains: Array<Record<string, string>>) => {
		const selectedChains = chains.map((val) => val.value)

		updateRoute('chains', selectedChains)
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
		if (!router?.query?.chains) updateRoute('chains', 'Ethereum')
	}, [])

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
					defaultValue={router?.query?.chains || chains?.[0]}
					isMulti
					value={selectedChains}
					name="colors"
					options={chains}
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
												updateRoute(id, router.query[id] === 'true' ? 'false' : 'true')
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

					{data.isLoading ? (
						<LocalLoader style={{ marginBottom: 'auto' }} />
					) : (
						<ChainChart
							height="360px"
							customLegendName="Chain"
							hideDefaultLegend
							valueSymbol="$"
							title=""
							updateRoute={updateRoute}
							router={router}
							datasets={data?.data}
						/>
					)}
				</BreakpointPanel>
			</DataWrapper>
		</>
	)
}

export default ComparePage
