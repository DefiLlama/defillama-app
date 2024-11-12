import { ReactSelect } from '~/components/MultiSelect/ReactSelect'
import { ChartTypes } from '../Defi/Protocol/ProtocolPro'
import { chainChartOptions } from './ItemsSelect'

const getName = (item, type) =>
	type === 'chain' ? chainChartOptions.find((opt) => opt.id === item)?.name : ChartTypes[item]

export const SelectedItem = ({ name, setItems, items, type }) => {
	return (
		<div key={name} className="flex items-center px-4 w-fit rounded-xl bg-[var(--primary1)]">
			<div className="mt-3">{name}</div>
			<span className="w-fit">
				<ReactSelect
					components={{ DropdownIndicator: () => null, IndicatorSeparator: () => null }}
					isMulti
					isClearable={false}
					styles={{
						control: (provided) => ({
							...provided,
							background: 'transparent',
							border: 'none',
							boxShadow: 'none'
						})
					}}
					menuIsOpen={false}
					placeholder="Search..."
					onChange={(_, { removedValue }: any) => {
						setItems((items) => {
							return items.filter((item) => item !== `${type}-${name}-${removedValue?.value}`)
						})
					}}
					value={items.map((item) => ({ label: getName(item, type), value: item }))}
				/>
			</span>
		</div>
	)
}
