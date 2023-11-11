import { capitalize } from 'lodash'
import { createFilter } from 'react-select'
import { useState } from 'react'
import styled from 'styled-components'
import { useGetProtocolsList } from '~/api/categories/protocols/client'
import ReactSelect from '~/components/MultiSelect/ReactSelect'
import { sluggify } from '~/utils/cache-client'
import Modal from '~/components/Modal'
import useSWR from 'swr'
import { getChainData } from '~/components/ComparePage'
import { useFetchAndFormatChartData } from '~/components/ECharts/ProtocolDNDChart/useFetchAndFormatChartData'
import { ChainState } from '.'

export const Filters = styled.div`
	display: flex;
	vertical-align: center;
	border-radius: 12px;
	background-color: ${({ theme }) => (theme.mode === 'dark' ? 'black' : 'white')};
	box-shadow: ${({ theme }) => theme.shadowSm};
	width: fit-content;
	height: fit-content;
	padding: 8px;
	margin-top: 8px;
	min-height: 56px;
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
	}
]

const useAvailableCharts = ({ itemType, name }: { itemType: 'protocol' | 'chain'; name: string }) => {
	const { data, error } = useSWR(`pro/chain/${name}`, () => getChainData(name, {}))
	const availableCharts = chainChartOptions.filter((opt) => !!data?.[opt.key]?.length)
	return { data, availableCharts }
}
interface Props {
	chains: Array<{ label: string; to: string }>
	setItems: (item) => void
}
const ItemsSelect = ({ chains, setItems }: Props) => {
	const { fullProtocolsList, parentProtocols, isLoading: fetchingProtocolsList } = useGetProtocolsList({ chain: 'All' })
	const [selectedChain, setSelectedChain] = useState(null)
	const [selectedCharts, setSelectedCharts] = useState([])
	const protocolOptions = fullProtocolsList.map(({ name }) => ({ label: name, value: sluggify(name) }))
	const { availableCharts } = useAvailableCharts({ itemType: 'protocol', name: selectedChain?.label })

	const chartOptions = availableCharts?.map(({ id, name }) => ({ label: name, value: id }))

	const reset = () => {
		setSelectedChain(null)
		setSelectedCharts([])
	}
	const onCloseClick = () => {
		setItems((items) => items.concat(selectedCharts.map((chart) => `chain-${selectedChain.label}-${chart.value}`)))
		reset()
	}
	return (
		<Filters>
			<Modal onClose={reset} onSave={onCloseClick} openText="Add Chart" style={{ marhinTop: '8px' }}>
				<div style={{ paddingRight: '8px' }}>
					<FilterRow>
						<FilterHeader>Select protocol or chain</FilterHeader>
						<ReactSelect
							style={{ width: '300px' }}
							filterOption={createFilter({ ignoreAccents: false, ignoreCase: false })}
							options={chains.map(({ label }) => ({ label, value: sluggify(label) }))}
							placeholder="Search..."
							onChange={(val: { label: string; to: string }) => setSelectedChain(val)}
							value={selectedChain}
						/>
					</FilterRow>
					<FilterRow>
						<FilterHeader>Pick charts</FilterHeader>
						<ReactSelect
							isMulti
							isDisabled={!selectedChain}
							style={{ width: '300px' }}
							filterOption={createFilter({ ignoreAccents: false, ignoreCase: false })}
							options={chartOptions}
							placeholder="Search..."
							onChange={(val: Array<string>) => setSelectedCharts(val)}
							value={selectedCharts}
						/>
					</FilterRow>
				</div>
			</Modal>
		</Filters>
	)
}
export default ItemsSelect
