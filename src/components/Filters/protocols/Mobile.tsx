import styled from 'styled-components'
import { SelectLabel, SelectArrow } from 'ariakit/select'
import HeadHelp from '~/components/HeadHelp'
import { Checkbox } from '~/components'
import { Item, FilterPopover, SelectMenu } from '~/components/Select/AriakitSelect'
import { options } from './options'
import { useProtocolsFilterState } from './useProtocolFilterState'

const WrapperWithLabel = styled.div`
	display: none;
	gap: 8px;
	align-items: center;
	margin-left: auto;

	@media (min-width: ${({ theme }) => theme.bpLg}) and (max-width: ${({ theme }) => theme.bp2Xl}) {
		display: flex;
		padding: 0 4px;
	}
`

const Label = styled(SelectLabel)`
	color: ${({ theme }) => theme.text1};
	font-weight: 400;
	font-size: 0.75rem;
	opacity: 0.8;
	white-space: nowrap;
`

function renderValue(value: string[]) {
	if (value.length === 0) return 'No option selected'
	if (value.length === 1) return options.find((e) => e.key === value[0])?.name ?? value[0]
	return `${value.length} options selected`
}

interface IProps {
	options?: { name: string; key: string; help?: string }[]
}

export function MobileProtocolFilters({ options, ...props }: IProps) {
	const select = useProtocolsFilterState()

	return (
		<WrapperWithLabel {...props}>
			<Label state={select}>INCLUDE IN TVL: </Label>
			<SelectMenu state={select}>
				<span>{renderValue(select.value)}</span>
				<SelectArrow />
			</SelectMenu>
			{select.mounted && (
				<FilterPopover state={select}>
					{options.map(({ key, name, help }) => (
						<Item key={key} value={key}>
							{help ? <HeadHelp title={name} text={help} /> : name}
							<Checkbox checked={select.value.includes(key)} />
						</Item>
					))}
				</FilterPopover>
			)}
		</WrapperWithLabel>
	)
}
