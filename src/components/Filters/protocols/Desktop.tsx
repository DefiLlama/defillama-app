import styled from 'styled-components'
import { SelectArrow } from 'ariakit/select'
import { SelectItem, ItemsSelected, SelectButton, SelectPopover } from '../shared'
import OptionToggle from '~/components/OptionToggle'
import HeadHelp from '~/components/HeadHelp'
import { Checkbox } from '~/components'
import { useDefiManager } from '~/contexts/LocalStorage'
import { protocolsAndChainsOptions } from './options'
import { useProtocolsFilterState } from './useProtocolFilterState'
import { useSetPopoverStyles } from '~/components/Popover/utils'

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

	@media screen and (min-width: 96.0625rem) {
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

const AddlFiltersButton = styled(SelectButton)`
	background: ${({ theme }) => (theme.mode === 'dark' ? '#000' : '#f5f5f5')};
	font-size: 0.875rem;
`

export const DesktopProtocolFilters = ({ options, ...props }) => {
	const [extraTvlEnabled, updater] = useDefiManager()

	let tvlOptions = options || protocolsAndChainsOptions

	return (
		<Wrapper>
			<label>INCLUDE IN TVL:</label>
			<ListWrapper {...props}>
				{tvlOptions.length > 3 ? (
					<>
						{tvlOptions.slice(0, 3).map((option) => (
							<ListItem key={option.key}>
								<OptionToggle {...option} toggle={updater(option.key)} enabled={extraTvlEnabled[option.key]} />
							</ListItem>
						))}
						<ListItem>
							<AddlOptions options={tvlOptions.slice(3)} />
						</ListItem>
					</>
				) : (
					tvlOptions.map((option) => (
						<ListItem key={option.key}>
							<OptionToggle {...option} toggle={updater(option.key)} enabled={extraTvlEnabled[option.key]} />
						</ListItem>
					))
				)}
			</ListWrapper>
		</Wrapper>
	)
}

interface IAllOptionsProps {
	options: { name: string; key: string; help?: string }[]
}

function AddlOptions({ options, ...props }: IAllOptionsProps) {
	const select = useProtocolsFilterState()

	const [isLarge] = useSetPopoverStyles()

	let totalSelected = 0

	options.forEach((option) => {
		if (select.value.includes(option.key)) {
			totalSelected += 1
		}
	})

	return (
		<span {...props}>
			<AddlFiltersButton state={select}>
				<span>Others</span>
				<SelectArrow />
				{totalSelected > 0 && <ItemsSelected>{totalSelected}</ItemsSelected>}
			</AddlFiltersButton>
			{select.mounted && (
				<SelectPopover state={select} modal={!isLarge}>
					{options.map(({ key, name, help }) => (
						<SelectItem key={key} value={key}>
							{help ? <HeadHelp title={name} text={help} /> : name}
							<Checkbox checked={select.value.includes(key)} />
						</SelectItem>
					))}
				</SelectPopover>
			)}
		</span>
	)
}
