import { useDefiManager, useFeesManager, useTvlAndFeesManager } from '~/contexts/LocalStorage'
import { feesOptions, protocolsAndChainsOptions } from './options'
import { useProtocolsFilterState } from './useProtocolFilterState'
import { Tooltip } from '~/components/Tooltip'
import { Icon } from '~/components/Icon'
import ReactSwitch from 'react-switch'
import { Select } from '~/components/Select'

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
	const { selectedValues, setSelectedValues } = useProtocolsFilterState()
	const finalSelectedValues = selectedValues.filter((val) => options.find((opt) => opt.key === val))

	return (
		<Select
			allValues={options}
			selectedValues={finalSelectedValues}
			setSelectedValues={setSelectedValues}
			label="Others"
			smolLabel
		/>
	)
}
