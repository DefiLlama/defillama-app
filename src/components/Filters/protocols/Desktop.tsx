import styled from 'styled-components'
import { SelectArrow } from 'ariakit/select'
import { FilterButton, FilterPopover } from '~/components/Select/AriakitSelect'
import { Item, Selected } from '../shared'
import OptionToggle from '~/components/OptionToggle'
import HeadHelp from '~/components/HeadHelp'
import { Checkbox } from '~/components'
import { useGetExtraTvlEnabled, useTvlToggles } from '~/contexts/LocalStorage'
import { options as extraTvlOptions } from './options'
import { useProtocolsFilterState } from './useProtocolFilterState'

const Wrapper = styled.section`
	color: ${({ theme }) => theme.text1};
	font-weight: 400;
	font-size: 0.75rem;
	display: none;
	gap: 8px;
	align-items: center;
	margin-left: auto;
	padding: 0 16px;

	label {
		opacity: 0.8;
	}

	@media (min-width: 96.0625rem) {
		display: flex;
	}
`

const ListWrapper = styled.ul`
	display: flex;
	justify-content: flex-end;
	align-items: center;
	margin: 0;
	padding: 0;
	list-style: none;
	font-size: 0.875rem;
`

const ListItem = styled.li`
	&:not(:first-child) {
		margin-left: 12px;
	}
`

const AddlFiltersButton = styled(FilterButton)`
	background: #000;
	font-size: 0.875rem;
`

export const DesktopProtocolFilters = ({ options, ...props }) => {
	const tvlToggles = useTvlToggles()
	const extraTvlEnabled = useGetExtraTvlEnabled()

	let tvlOptions = options || [...extraTvlOptions]

	return (
		<Wrapper>
			<label>INCLUDE IN TVL:</label>
			<ListWrapper {...props}>
				{tvlOptions.length > 3 ? (
					<>
						{tvlOptions.slice(0, 3).map((option) => (
							<ListItem key={option.key}>
								<OptionToggle {...option} toggle={tvlToggles(option.key)} enabled={extraTvlEnabled[option.key]} />
							</ListItem>
						))}
						<ListItem>
							<AddlOptions options={tvlOptions.slice(3)} />
						</ListItem>
					</>
				) : (
					tvlOptions.map((option) => (
						<ListItem key={option.key}>
							<OptionToggle {...option} toggle={tvlToggles(option.key)} enabled={extraTvlEnabled[option.key]} />
						</ListItem>
					))
				)}
			</ListWrapper>
		</Wrapper>
	)
}

interface IAllOptionsProps {
	options?: { name: string; key: string; help?: string }[]
}

function AddlOptions({ options, ...props }: IAllOptionsProps) {
	const select = useProtocolsFilterState()

	const tvlOptions = options || extraTvlOptions

	return (
		<span {...props}>
			<AddlFiltersButton state={select}>
				<span>Others</span>
				<SelectArrow />
				{select.value.length > 0 && <Selected>{select.value.length}</Selected>}
			</AddlFiltersButton>
			{select.mounted && (
				<FilterPopover state={select}>
					{tvlOptions.map(({ key, name, help }) => (
						<Item key={key} value={key}>
							{help ? <HeadHelp title={name} text={help} /> : name}
							<Checkbox checked={select.value.includes(key)} />
						</Item>
					))}
				</FilterPopover>
			)}
		</span>
	)
}
