import styled from 'styled-components'
import ReactSelect from '~/components/MultiSelect/ReactSelect'
import { ChartTypes } from '../Defi/Protocol/PorotcolPro'
import { chainChartOptions } from './ItemsSelect'

const SelectedItemBody = styled.div`
	display: flex;
	padding: 8px 16px;
	background-color: ${({ theme }) => (theme.mode === 'dark' ? 'black' : 'white')};
	box-shadow: ${({ theme }) => theme.shadowSm};
	width: fit-content;
	border-radius: 12px;
	margin-top: 8px;
`

const getName = (item, type) =>
	type === 'chain' ? chainChartOptions.find((opt) => opt.id === item)?.name : ChartTypes[item]

const SelectedItem = ({ name, setItems, items, type }) => {
	return (
		<SelectedItemBody key={name} style={{ display: 'flex' }}>
			<div style={{ marginTop: '12px' }}>{name}</div>
			<ReactSelect
				components={{ DropdownIndicator: () => null, IndicatorSeparator: () => null }}
				isMulti
				isClearable={false}
				style={{ width: 'fit-content' }}
				menuIsOpen={false}
				placeholder="Search..."
				onChange={(_, { removedValue }: any) => {
					setItems((items) => {
						return items.filter((item) => item !== `${type}-${name}-${removedValue?.value}`)
					})
				}}
				value={items.map((item) => ({ label: getName(item, type), value: item }))}
			/>
		</SelectedItemBody>
	)
}

export default SelectedItem
