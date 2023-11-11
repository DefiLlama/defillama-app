import styled from 'styled-components'
import ReactSelect from '~/components/MultiSelect/ReactSelect'
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

const getType = (item) => chainChartOptions.find((opt) => opt.id === item)?.name
const SelectedItem = ({ name, setItems, items }) => {
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
				onChange={(items: Array<string>) =>
					setItems((item) => {
						if (item.length > 0) {
							const newItems = items?.filter((selectedItem) => !selectedItem?.includes(`${name}-${item[0]?.value}`))
							return newItems
						}
						return items.filter((selectedItem) => !selectedItem.includes(`${name}-`))
					})
				}
				value={items.map((item) => ({ label: getType(item), value: item }))}
			/>
		</SelectedItemBody>
	)
}

export default SelectedItem
