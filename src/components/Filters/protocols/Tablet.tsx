import { SelectLabel, Select, SelectArrow, SelectItem, SelectPopover } from 'ariakit/select'
import { Checkbox } from '~/components'
import { feesOptions, protocolsAndChainsOptions } from './options'
import { useFeesFilterState, useProtocolsFilterState, useTvlAndFeesFilterState } from './useProtocolFilterState'
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
	const select = useProtocolsFilterState()

	const tvlOptions = options || protocolsAndChainsOptions

	return (
		<span {...props} className="hidden items-center ml-auto gap-2 lg:flex 2xl:hidden -my-[10px] -mr-[2px]">
			<SelectLabel state={select} className="text-[var(--text1)] font-normal text-xs whitespace-nowrap">
				INCLUDE IN TVL:{' '}
			</SelectLabel>
			<Select
				state={select}
				className="bg-[var(--btn-bg)] hover:bg-[var(--btn-hover-bg)] focus-visible:bg-[var(--btn-hover-bg)] flex items-center justify-between gap-2 py-2 px-3 rounded-md cursor-pointer text-[var(--text1)] flex-nowrap"
			>
				<span>{renderValue(select.value)}</span>
				<SelectArrow />
			</Select>
			{select.mounted ? (
				<SelectPopover
					state={select}
					className="flex flex-col bg-[var(--bg1)] rounded-md z-10 overflow-auto overscroll-contain min-w-[180px] max-h-[60vh] border border-[hsl(204,20%,88%)] dark:border-[hsl(204,3%,32%)]"
				>
					{tvlOptions.map(({ key, name, help }) => (
						<SelectItem
							key={key}
							value={key}
							className="flex items-center justify-between gap-4 py-2 px-3 flex-shrink-0 hover:bg-[var(--primary1-hover)] focus-visible:bg-[var(--primary1-hover)] cursor-pointer first-of-type:rounded-t-md last-of-type:rounded-b-md border-b border-black/10 dark:border-white/10"
						>
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
			) : null}
		</span>
	)
}

export function TabletFeesFilters({ options, ...props }: IProps) {
	const select = useFeesFilterState()

	return (
		<span {...props} className="hidden items-center ml-auto gap-2 lg:flex 2xl:hidden -my-[10px] -mr-[2px]">
			<SelectLabel state={select} className="text-[var(--text1)] font-normal text-xs whitespace-nowrap">
				INCLUDE IN FEES:{' '}
			</SelectLabel>
			<Select
				state={select}
				className="bg-[var(--btn-bg)] hover:bg-[var(--btn-hover-bg)] focus-visible:bg-[var(--btn-hover-bg)] flex items-center justify-between gap-2 py-2 px-3 rounded-md cursor-pointer text-[var(--text1)] flex-nowrap"
			>
				<span>{renderValue(select.value)}</span>
				<SelectArrow />
			</Select>
			{select.mounted ? (
				<SelectPopover
					state={select}
					className="flex flex-col bg-[var(--bg1)] rounded-md z-10 overflow-auto overscroll-contain min-w-[180px] max-h-[60vh] border border-[hsl(204,20%,88%)] dark:border-[hsl(204,3%,32%)] max-sm:drawer"
				>
					{feesOptions.map(({ key, name, help }) => (
						<SelectItem
							key={key}
							value={key}
							className="flex items-center justify-between gap-4 py-2 px-3 flex-shrink-0 hover:bg-[var(--primary1-hover)] focus-visible:bg-[var(--primary1-hover)] cursor-pointer first-of-type:rounded-t-md last-of-type:rounded-b-md border-b border-black/10 dark:border-white/10"
						>
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
			) : null}
		</span>
	)
}

export function TabletTvlAndFeesFilters({ options, ...props }: IProps) {
	const select = useTvlAndFeesFilterState({ options })

	return (
		<span {...props} className="hidden items-center ml-auto gap-2 lg:flex 2xl:hidden -my-[10px] -mr-[2px]">
			<SelectLabel state={select} className="text-[var(--text1)] font-normal text-xs whitespace-nowrap">
				INCLUDE IN STATS:{' '}
			</SelectLabel>
			<Select
				state={select}
				className="bg-[var(--btn-bg)] hover:bg-[var(--btn-hover-bg)] focus-visible:bg-[var(--btn-hover-bg)] flex items-center justify-between gap-2 py-2 px-3 rounded-md cursor-pointer text-[var(--text1)] flex-nowrap"
			>
				<span>{renderValue(select.value)}</span>
				<SelectArrow />
			</Select>
			{select.mounted ? (
				<SelectPopover
					state={select}
					className="flex flex-col bg-[var(--bg1)] rounded-md z-10 overflow-auto overscroll-contain min-w-[180px] max-h-[60vh] border border-[hsl(204,20%,88%)] dark:border-[hsl(204,3%,32%)] max-sm:drawer"
				>
					{options.map(({ key, name, help }) => (
						<SelectItem
							key={key}
							value={key}
							className="flex items-center justify-between gap-4 py-2 px-3 flex-shrink-0 hover:bg-[var(--primary1-hover)] focus-visible:bg-[var(--primary1-hover)] cursor-pointer first-of-type:rounded-t-md last-of-type:rounded-b-md border-b border-black/10 dark:border-white/10"
						>
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
			) : null}
		</span>
	)
}
