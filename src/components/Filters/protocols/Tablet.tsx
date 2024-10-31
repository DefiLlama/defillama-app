import { SelectLabel, SelectArrow } from 'ariakit/select'
import { Checkbox } from '~/components'
import { feesOptions, protocolsAndChainsOptions } from './options'
import { SelectItem, SelectPopover, Select } from '../common'
import { useFeesFilterState, useProtocolsFilterState, useTvlAndFeesFilterState } from './useProtocolFilterState'
import { useSetPopoverStyles } from '~/components/Popover/utils'
import { Tooltip } from '~/components/Tooltip'
import { Icon } from '~/components/Icon'

function renderValue(value: string[]) {
	if (value.length === 0) return 'No option selected'
	if (value.length === 1) return protocolsAndChainsOptions.find((e) => e.key === value[0])?.name ?? value[0]
	return `${value.length} options selected`
}

interface IProps {
	options?: { name: string; key: string; help?: string }[]
}

export function TabletProtocolsFilters({ options, ...props }: IProps) {
	const select = useProtocolsFilterState({ sameWidth: true })

	const [isLarge] = useSetPopoverStyles()

	const tvlOptions = options || protocolsAndChainsOptions

	return (
		<div {...props} className="hidden items-center ml-auto gap-2 lg:flex 2xl:hidden -my-[10px] -mr-[2px]">
			<SelectLabel state={select} className="text-[var(--text1)] font-normal text-xs whitespace-nowrap">
				INCLUDE IN TVL:{' '}
			</SelectLabel>
			<Select state={select} className="bg-[#f5f5f5] dark:bg-black">
				<span>{renderValue(select.value)}</span>
				<SelectArrow />
			</Select>
			{select.mounted && (
				<SelectPopover state={select} modal={!isLarge}>
					{tvlOptions.map(({ key, name, help }) => (
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
		</div>
	)
}

export function TabletFeesFilters({ options, ...props }: IProps) {
	const select = useFeesFilterState({ sameWidth: true })

	const [isLarge] = useSetPopoverStyles()

	return (
		<div {...props} className="hidden items-center ml-auto gap-2 lg:flex 2xl:hidden -my-[10px] -mr-[2px]">
			<SelectLabel state={select} className="text-[var(--text1)] font-normal text-xs whitespace-nowrap">
				INCLUDE IN FEES:{' '}
			</SelectLabel>
			<Select state={select} className="bg-[#f5f5f5] dark:bg-black">
				<span>{renderValue(select.value)}</span>
				<SelectArrow />
			</Select>
			{select.mounted && (
				<SelectPopover state={select} modal={!isLarge}>
					{feesOptions.map(({ key, name, help }) => (
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
		</div>
	)
}

export function TabletTvlAndFeesFilters({ options, ...props }: IProps) {
	const select = useTvlAndFeesFilterState({ options })

	const [isLarge] = useSetPopoverStyles()

	return (
		<div {...props} className="hidden items-center ml-auto gap-2 lg:flex 2xl:hidden -my-[10px] -mr-[2px]">
			<SelectLabel state={select} className="text-[var(--text1)] font-normal text-xs whitespace-nowrap">
				INCLUDE IN STATS:{' '}
			</SelectLabel>
			<Select state={select} className="bg-[#f5f5f5] dark:bg-black">
				<span>{renderValue(select.value)}</span>
				<SelectArrow />
			</Select>
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
		</div>
	)
}
