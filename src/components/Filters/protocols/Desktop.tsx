import { Select, SelectArrow, SelectItem, SelectPopover } from 'ariakit/select'
import { Checkbox } from '~/components'
import { useDefiManager, useFeesManager, useTvlAndFeesManager } from '~/contexts/LocalStorage'
import { feesOptions, protocolsAndChainsOptions } from './options'
import { useProtocolsFilterState } from './useProtocolFilterState'
import { Tooltip } from '~/components/Tooltip'
import { Icon } from '~/components/Icon'
import ReactSwitch from 'react-switch'

export const DesktopProtocolFilters = ({ options, ...props }) => {
	const [extraTvlEnabled, updater] = useDefiManager()

	let tvlOptions = options || protocolsAndChainsOptions

	return (
		<span className="text-[var(---text1)] font-normal hidden 2xl:flex items-center gap-2 ml-auto -my-[6px] -mr-[2px]">
			<label>INCLUDE IN TVL:</label>
			<ul {...props} className="flex items-center flex-end">
				{tvlOptions.length > 3 ? (
					<>
						{tvlOptions.slice(0, 3).map((option) => (
							<li key={option.key} className="ml-5 first-of-type:ml-0 flex items-center gap-1">
								<ReactSwitch
									onChange={updater(option.key, true)}
									checked={extraTvlEnabled[option.key]}
									onColor="#0A71F1"
									height={20}
									width={40}
									uncheckedIcon={false}
									checkedIcon={false}
								/>
								{option.help ? (
									<Tooltip content={option.help}>
										<span className="mr-1">{option.name}</span>
										<Icon name="help-circle" height={15} width={15} />
									</Tooltip>
								) : (
									<span>{option.name}</span>
								)}
							</li>
						))}
						<li className="ml-5 first-of-type:ml-0">
							<AddlOptions options={tvlOptions.slice(3)} />
						</li>
					</>
				) : (
					tvlOptions.map((option) => (
						<li key={option.key} className="ml-5 first-of-type:ml-0 flex items-center gap-1">
							<ReactSwitch
								onChange={updater(option.key, true)}
								checked={extraTvlEnabled[option.key]}
								onColor="#0A71F1"
								height={20}
								width={40}
								uncheckedIcon={false}
								checkedIcon={false}
							/>
							{option.help ? (
								<Tooltip content={option.help}>
									<span className="mr-1">{option.name}</span>
									<Icon name="help-circle" height={15} width={15} />
								</Tooltip>
							) : (
								<span>{option.name}</span>
							)}
						</li>
					))
				)}
			</ul>
		</span>
	)
}

export const DesktopFeesFilters = ({ options, ...props }) => {
	const [extraTvlEnabled, updater] = useFeesManager()

	return (
		<span className="text-[var(---text1)] font-normal hidden 2xl:flex items-center gap-2 ml-auto -my-[6px] -mr-[2px]">
			<label>INCLUDE IN FEES:</label>
			<ul {...props} className="flex items-center flex-end">
				{feesOptions.length > 3 ? (
					<>
						{feesOptions.slice(0, 3).map((option) => (
							<li key={option.key} className="ml-5 first-of-type:ml-0 flex items-center gap-1">
								<ReactSwitch
									onChange={updater(option.key, true)}
									checked={extraTvlEnabled[option.key]}
									onColor="#0A71F1"
									height={20}
									width={40}
									uncheckedIcon={false}
									checkedIcon={false}
								/>
								{option.help ? (
									<Tooltip content={option.help}>
										<span className="mr-1">{option.name}</span>
										<Icon name="help-circle" height={15} width={15} />
									</Tooltip>
								) : (
									<span>{option.name}</span>
								)}
							</li>
						))}
						<li className="ml-5 first-of-type:ml-0">
							<AddlOptions options={feesOptions.slice(3)} />
						</li>
					</>
				) : (
					feesOptions.map((option) => (
						<li key={option.key} className="ml-5 first-of-type:ml-0 flex items-center gap-1">
							<ReactSwitch
								onChange={updater(option.key, true)}
								checked={extraTvlEnabled[option.key]}
								onColor="#0A71F1"
								height={20}
								width={40}
								uncheckedIcon={false}
								checkedIcon={false}
							/>
							{option.help ? (
								<Tooltip content={option.help}>
									<span className="mr-1">{option.name}</span>
									<Icon name="help-circle" height={15} width={15} />
								</Tooltip>
							) : (
								<span>{option.name}</span>
							)}
						</li>
					))
				)}
			</ul>
		</span>
	)
}

export const DesktopTvlAndFeesFilters = ({ options, ...props }) => {
	const [extraTvlEnabled, updater] = useTvlAndFeesManager()

	return (
		<span className="text-[var(---text1)] font-normal hidden 2xl:flex items-center gap-2 ml-auto -my-[6px] -mr-[2px]">
			<label>INCLUDE IN STATS:</label>
			<ul {...props} className="flex items-center flex-end">
				{feesOptions.length > 3 ? (
					<>
						{options.slice(0, 3).map((option) => (
							<li key={option.key} className="ml-5 first-of-type:ml-0 flex items-center gap-1">
								<ReactSwitch
									onChange={updater(option.key, true)}
									checked={extraTvlEnabled[option.key]}
									onColor="#0A71F1"
									height={20}
									width={40}
									uncheckedIcon={false}
									checkedIcon={false}
								/>
								{option.help ? (
									<Tooltip content={option.help}>
										<span className="mr-1">{option.name}</span>
										<Icon name="help-circle" height={15} width={15} />
									</Tooltip>
								) : (
									<span>{option.name}</span>
								)}
							</li>
						))}
						<li className="ml-5 first-of-type:ml-0">
							<AddlOptions options={options.slice(3)} />
						</li>
					</>
				) : (
					options.map((option) => (
						<li key={option.key} className="ml-5 first-of-type:ml-0 flex items-center gap-1">
							<ReactSwitch
								onChange={updater(option.key, true)}
								checked={extraTvlEnabled[option.key]}
								onColor="#0A71F1"
								height={20}
								width={40}
								uncheckedIcon={false}
								checkedIcon={false}
							/>
							{option.help ? (
								<Tooltip content={option.help}>
									<span className="mr-1">{option.name}</span>
									<Icon name="help-circle" height={15} width={15} />
								</Tooltip>
							) : (
								<span>{option.name}</span>
							)}
						</li>
					))
				)}
			</ul>
		</span>
	)
}

interface IAllOptionsProps {
	options: { name: string; key: string; help?: string }[]
}

function AddlOptions({ options }: IAllOptionsProps) {
	const select = useProtocolsFilterState()

	let totalSelected = 0

	options.forEach((option) => {
		if (select.value.includes(option.key)) {
			totalSelected += 1
		}
	})

	return (
		<>
			<Select
				state={select}
				className="bg-[var(--btn-bg)] hover:bg-[var(--btn-hover-bg)] focus-visible:bg-[var(--btn-hover-bg)] flex items-center justify-between gap-2 py-2 px-3 rounded-md cursor-pointer text-[var(--text1)] flex-nowrap"
			>
				{totalSelected > 0 ? (
					<span className="rounded-full p-[2px] min-w-4 text-xs bg-[var(--bg4)]">{totalSelected}</span>
				) : null}
				<span>Others</span>
				<SelectArrow />
			</Select>
			{select.mounted ? (
				<SelectPopover
					state={select}
					className="flex flex-col bg-[var(--bg1)] rounded-md z-10 overflow-auto overscroll-contain min-w-[180px] max-h-[60vh]"
				>
					{options.map(({ key, name, help }) => (
						<SelectItem
							key={key}
							value={key}
							className="flex items-center justify-between gap-4 p-3 flex-shrink-0 hover:bg-[var(--primary1-hover)] focus-visible:bg-[var(--primary1-hover)] cursor-pointer first-of-type:rounded-t-md last-of-type:rounded-b-md"
						>
							{help ? (
								<Tooltip content={help}>
									<span className="mr-1">{name}</span>
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
		</>
	)
}
