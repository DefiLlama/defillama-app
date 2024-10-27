import styled from 'styled-components'
import { SelectArrow } from 'ariakit/select'
import { SelectItem, ItemsSelected, SelectButton, SelectPopover } from '../common'
import { OptionToggle } from '~/components/OptionToggle'
import { Checkbox } from '~/components'
import { useDefiManager, useFeesManager, useTvlAndFeesManager } from '~/contexts/LocalStorage'
import { feesOptions, protocolsAndChainsOptions } from './options'
import { useProtocolsFilterState } from './useProtocolFilterState'
import { useSetPopoverStyles } from '~/components/Popover/utils'
import { Tooltip } from '~/components/Tooltip'
import { Icon } from '~/components/Icon'

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

export const ListWrapper = styled.ul`
	display: flex;
	justify-content: flex-end;
	align-items: center;
	margin: 0;
	padding: 0;
	list-style: none;
	font-size: 0.875rem;
`

export const ListItem = styled.li`
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
								<OptionToggle {...option} toggle={updater(option.key, true)} enabled={extraTvlEnabled[option.key]} />
							</ListItem>
						))}
						<ListItem>
							<AddlOptions options={tvlOptions.slice(3)} />
						</ListItem>
					</>
				) : (
					tvlOptions.map((option) => (
						<ListItem key={option.key}>
							<OptionToggle {...option} toggle={updater(option.key, true)} enabled={extraTvlEnabled[option.key]} />
						</ListItem>
					))
				)}
			</ListWrapper>
		</Wrapper>
	)
}

export const DesktopFeesFilters = ({ options, ...props }) => {
	const [extraTvlEnabled, updater] = useFeesManager()

	return (
		<Wrapper>
			<label>INCLUDE IN FEES:</label>
			<ListWrapper {...props}>
				{feesOptions.length > 3 ? (
					<>
						{feesOptions.slice(0, 3).map((option) => (
							<ListItem key={option.key}>
								<OptionToggle {...option} toggle={updater(option.key)} enabled={extraTvlEnabled[option.key]} />
							</ListItem>
						))}
						<ListItem>
							<AddlOptions options={feesOptions.slice(3)} />
						</ListItem>
					</>
				) : (
					feesOptions.map((option) => (
						<ListItem key={option.key}>
							<OptionToggle {...option} toggle={updater(option.key)} enabled={extraTvlEnabled[option.key]} />
						</ListItem>
					))
				)}
			</ListWrapper>
		</Wrapper>
	)
}

export const DesktopTvlAndFeesFilters = ({ options, ...props }) => {
	const [extraTvlEnabled, updater] = useTvlAndFeesManager()

	return (
		<Wrapper>
			<label>INCLUDE IN STATS:</label>
			<ListWrapper {...props}>
				{feesOptions.length > 3 ? (
					<>
						{options.slice(0, 3).map((option) => (
							<ListItem key={option.key}>
								<OptionToggle {...option} toggle={updater(option.key)} enabled={extraTvlEnabled[option.key]} />
							</ListItem>
						))}
						<ListItem>
							<AddlOptions options={options.slice(3)} />
						</ListItem>
					</>
				) : (
					options.map((option) => (
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
							{help ? (
								<Tooltip content={help}>
									<span>{name}</span>
									<Icon name="help-circle" height={15} width={15} />
								</Tooltip>
							) : (
								name
							)}
							<Checkbox checked={select.value.includes(key)} />
						</SelectItem>
					))}
				</SelectPopover>
			)}
		</span>
	)
}
