import { createFilter } from 'react-select'
import { useState } from 'react'
import { useGetProtocolsList } from '~/api/categories/protocols/client'
import { ReactSelect } from '~/components/MultiSelect/ReactSelect'
import { sluggify } from '~/utils/cache-client'
import { Modal } from './Modal'
import { getChainData } from '~/containers/ComparePage'
import { ChartTypes } from '~/containers/Defi/Protocol/ProtocolPro'
import { useQuery } from '@tanstack/react-query'

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

export const ItemsSelect = ({ chains, setItems, setProtocolProps }: Props) => {
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
		<div className="flex align-middle rounded-md shadow w-fit h-fit min-h-[38px] p-2 bg-[var(--primary1)] bg-opacity-90">
			<Modal onClose={reset} onSave={onCloseClick} openText="Add Chart" style={{ marhinTop: '8px' }}>
				<div style={{ paddingRight: '8px' }}>
					<div className="w-[500px] flex justify-between items-center mb-4">
						<div className="text-sm mx-4 mt-1">Select protocol or chain</div>
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
					</div>
					<div className="w-[500px] flex justify-between items-center mb-4">
						<div className="text-sm mx-4 mt-1">Pick charts</div>
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
					</div>
				</div>
			</Modal>
		</div>
	)
}
