import { createFilter } from 'react-select'
import { useState } from 'react'
import styled from 'styled-components'
import { useGetProtocolsList } from '~/api/categories/protocols/client'
import { ReactSelect } from '~/components/MultiSelect/ReactSelect'
import { sluggify } from '~/utils/cache-client'
import { Modal } from './Modal'
import { getChainData } from '~/containers/ComparePage'
import { ChartTypes } from '~/containers/Defi/Protocol/ProtocolPro'
import { transparentize } from 'polished'
import { useQuery } from '@tanstack/react-query'

export const Filters = styled.div`
	display: flex;
	vertical-align: center;
	border-radius: 12px;
	background-color: ${({ theme }) => transparentize(0.9, theme.primary1)};
	box-shadow: ${({ theme }) => theme.shadowSm};
	width: fit-content;
	height: fit-content;
	padding: 8px;
	min-height: 38px;
`
export const FilterHeader = styled.div`
	font-size: 14px;
	line-height: 2;
	margin-right: 16px;
	margin-left: 16px;
	margin-top: 4px;
`

export const FilterRow = styled.div`
	width: 500px;
	display: flex;
	margin-bottom: 16px;
	justify-content: space-between;
`

export const chainChartOptions = [
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
		id: 'txs',
		name: 'Transactions',
		key: 'txsData'
	},

	{
		id: 'inflows',
		name: 'Inflows',
		key: 'bridges'
	},
	{
		id: 'table',
		name: 'Table',
		key: 'table'
	}
]

const useAvailableCharts = ({ itemType, name }: { itemType: 'protocol' | 'chain'; name: string }) => {
	const { data } = useQuery({
		queryKey: ['pro-chain', name],
		queryFn: () =>
			itemType === 'chain'
				? getChainData(name, {})
				: fetch(`https://fe-cache.llama.fi/protocol/${name}`).then((r) => r.json())
	})
	if (itemType === 'chain') {
		const availableCharts = chainChartOptions
			.filter((opt) => !!data?.[opt.key]?.length)
			.concat([{ id: 'table', name: 'Table', isVisible: true, key: 'table' }])
		return { data, availableCharts }
	} else {
		if (!data?.availableCharts) return { data, availableCharts: null }
		const availableCharts = Object.entries(data?.availableCharts)
			.filter(([_, isAvailable]) => isAvailable)
			.map(([key]) => (ChartTypes[key] ? { id: key, name: ChartTypes[key] } : null))
			.filter(Boolean)
		return { data, availableCharts }
	}
}
interface Props {
	chains: Array<{ label: string; to: string }>
	setItems: (item) => void
	setProtocolProps: (item) => void
}

const getProtocolData = (data) => {
	const chartProps = {
		twitterHandle: data?.protocolData.twitter,
		protocol: data?.protocol,
		color: data?.backgroundColor,
		historicalChainTvls: data?.protocolData.historicalChainTvls,
		hallmarks: data?.protocolData.hallmarks,
		geckoId: data?.protocolData.gecko_id,
		chartColors: data?.chartColors,
		metrics: data?.protocolData.metrics,
		activeUsersId: data?.users ? data?.protocolData.id : null,
		governanceApis: data?.governanceApis,
		isHourlyChart: false,
		isCEX: false,
		tokenSymbol: data?.protocolData.symbol,
		protocolId: data?.protocolData.id,
		chartDenominations: data?.chartDenominations,
		nftVolumeData: data?.nftVolumeData
	}

	return chartProps
}

const ItemsSelect = ({ chains, setItems, setProtocolProps }: Props) => {
	const { fullProtocolsList, parentProtocols } = useGetProtocolsList({ chain: 'All' })
	const [selectedItem, setSelectedChain] = useState(null)
	const [selectedCharts, setSelectedCharts] = useState([])
	const protocolOptions = parentProtocols
		.concat(fullProtocolsList)
		.map(({ name }) => ({ label: name, value: sluggify(name), type: 'protocol' }))
		.slice(0, 1000)
	const { availableCharts, data } = useAvailableCharts({ itemType: selectedItem?.type, name: selectedItem?.label })

	const chartOptions = availableCharts?.map(({ id, name }) => ({ label: name, value: id }))
	const reset = () => {
		setSelectedChain(null)
		setSelectedCharts([])
	}
	const onCloseClick = () => {
		setItems((items) =>
			items.concat(selectedCharts.map((chart) => `${selectedItem.type}-${selectedItem.label}-${chart.value}`))
		)
		if (selectedItem.type === 'protocol') {
			setProtocolProps((props) => ({ ...props, [selectedItem.value]: getProtocolData(data?.protocol) }))
		}
		reset()
	}
	return (
		<Filters>
			<Modal onClose={reset} onSave={onCloseClick} openText="Add Chart" style={{ marhinTop: '8px' }}>
				<div style={{ paddingRight: '8px' }}>
					<FilterRow>
						<FilterHeader>Select protocol or chain</FilterHeader>
						<span className="w-[300px]">
							<ReactSelect
								filterOption={createFilter({ ignoreAccents: false, ignoreCase: false })}
								options={chains
									.map(({ label }) => ({ label, value: sluggify(label), type: 'chain' }))
									.concat(protocolOptions)}
								placeholder="Search..."
								onChange={(val: { label: string; to: string }) => setSelectedChain(val)}
								value={selectedItem}
							/>
						</span>
					</FilterRow>
					<FilterRow>
						<FilterHeader>Pick charts</FilterHeader>
						<span className="w-[300px]">
							<ReactSelect
								isMulti
								isDisabled={!selectedItem}
								filterOption={createFilter({ ignoreAccents: false, ignoreCase: false })}
								options={chartOptions}
								placeholder="Search..."
								onChange={(val: Array<string>) => setSelectedCharts(val)}
								value={selectedCharts}
							/>
						</span>
					</FilterRow>
				</div>
			</Modal>
		</Filters>
	)
}
export default ItemsSelect
