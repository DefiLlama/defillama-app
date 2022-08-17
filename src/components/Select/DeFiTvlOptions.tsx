import styled from 'styled-components'
import { SelectLabel, useSelectState, SelectArrow, SelectItemCheck } from 'ariakit/select'
import { protocolsAndChainsOptions } from '~/components/Filters/protocols'
import { useDefiManager } from '~/contexts/LocalStorage'
import { Item, Popover, SelectMenu } from './AriakitSelect'

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

const extraTvls = protocolsAndChainsOptions.map((g) => ({ label: g.name, value: g.key }))

function renderValue(value: string[]) {
	if (value.length === 0) return 'No option selected'
	if (value.length === 1) return extraTvls.find((e) => e.value === value[0])?.label ?? value[0]
	return `${value.length} options selected`
}

interface IProps {
	options?: { name: string; key: string }[]
}

export function DeFiTvlOptions({ options, ...props }: IProps) {
	const [extraTvlsEnabled, updater] = useDefiManager()

	const fitlers = { ...extraTvlsEnabled }

	let tvlOptions = options?.map((e) => e.key) ?? extraTvls.map((e) => e.value)

	const selectedOptions = Object.keys(fitlers).filter((key) => fitlers[key])

	const onChange = (values) => {
		if (values.length < selectedOptions.length) {
			const off = selectedOptions.find((o) => !values.includes(o))
			updater(off)()
		} else {
			const on = values.find((o) => !selectedOptions.includes(o))
			updater(on)()
		}
	}

	const select = useSelectState({
		value: selectedOptions,
		setValue: onChange,
		defaultValue: selectedOptions,
		sameWidth: true,
		gutter: 6
	})

	return (
		<WrapperWithLabel {...props}>
			<Label state={select}>INCLUDE IN TVL: </Label>
			<SelectMenu state={select}>
				<span>{renderValue(select.value)}</span>
				<SelectArrow />
			</SelectMenu>
			{select.mounted && (
				<Popover state={select}>
					{tvlOptions.map((value) => (
						<Item key={value} value={value}>
							<SelectItemCheck />
							{renderValue([value])}
						</Item>
					))}
				</Popover>
			)}
		</WrapperWithLabel>
	)
}
