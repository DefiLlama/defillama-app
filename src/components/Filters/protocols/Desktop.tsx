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

export const DesktopProtocolFilters = ({ options, ...props }) => {
	const [extraTvlEnabled, updater] = useDefiManager()

	let tvlOptions = options || protocolsAndChainsOptions

	return (
		<section className="text-[var(---text1)] font-normal hidden 2xl:flex items-center gap-2 ml-auto -my-[7px] -mr-[2px]">
			<label>INCLUDE IN TVL:</label>
			<ul {...props} className="flex items-center flex-end">
				{tvlOptions.length > 3 ? (
					<>
						{tvlOptions.slice(0, 3).map((option) => (
							<li key={option.key} className="ml-5 first-of-type:ml-0">
								<OptionToggle {...option} toggle={updater(option.key, true)} enabled={extraTvlEnabled[option.key]} />
							</li>
						))}
						<li className="ml-5 first-of-type:ml-0">
							<AddlOptions options={tvlOptions.slice(3)} />
						</li>
					</>
				) : (
					tvlOptions.map((option) => (
						<li key={option.key} className="ml-5 first-of-type:ml-0">
							<OptionToggle {...option} toggle={updater(option.key, true)} enabled={extraTvlEnabled[option.key]} />
						</li>
					))
				)}
			</ul>
		</section>
	)
}

export const DesktopFeesFilters = ({ options, ...props }) => {
	const [extraTvlEnabled, updater] = useFeesManager()

	return (
		<section className="text-[var(---text1)] font-normal hidden 2xl:flex items-center gap-2 ml-auto -my-[7px] -mr-[2px]">
			<label>INCLUDE IN FEES:</label>
			<ul {...props} className="flex items-center flex-end">
				{feesOptions.length > 3 ? (
					<>
						{feesOptions.slice(0, 3).map((option) => (
							<li key={option.key} className="ml-5 first-of-type:ml-0">
								<OptionToggle {...option} toggle={updater(option.key)} enabled={extraTvlEnabled[option.key]} />
							</li>
						))}
						<li className="ml-5 first-of-type:ml-0">
							<AddlOptions options={feesOptions.slice(3)} />
						</li>
					</>
				) : (
					feesOptions.map((option) => (
						<li key={option.key} className="ml-5 first-of-type:ml-0">
							<OptionToggle {...option} toggle={updater(option.key)} enabled={extraTvlEnabled[option.key]} />
						</li>
					))
				)}
			</ul>
		</section>
	)
}

export const DesktopTvlAndFeesFilters = ({ options, ...props }) => {
	const [extraTvlEnabled, updater] = useTvlAndFeesManager()

	return (
		<section className="text-[var(---text1)] font-normal hidden 2xl:flex items-center gap-2 ml-auto -my-[7px] -mr-[2px]">
			<label>INCLUDE IN STATS:</label>
			<ul {...props} className="flex items-center flex-end">
				{feesOptions.length > 3 ? (
					<>
						{options.slice(0, 3).map((option) => (
							<li key={option.key} className="ml-5 first-of-type:ml-0">
								<OptionToggle {...option} toggle={updater(option.key)} enabled={extraTvlEnabled[option.key]} />
							</li>
						))}
						<li className="ml-5 first-of-type:ml-0">
							<AddlOptions options={options.slice(3)} />
						</li>
					</>
				) : (
					options.map((option) => (
						<li key={option.key} className="ml-5 first-of-type:ml-0">
							<OptionToggle {...option} toggle={updater(option.key)} enabled={extraTvlEnabled[option.key]} />
						</li>
					))
				)}
			</ul>
		</section>
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
			<SelectButton state={select} className="bg-[#f5f5f5] dark:bg-black">
				<span>Others</span>
				<SelectArrow />
				{totalSelected > 0 && <ItemsSelected>{totalSelected}</ItemsSelected>}
			</SelectButton>
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
