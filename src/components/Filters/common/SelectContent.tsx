import { SelectItem } from 'ariakit/select'
import { Checkbox } from '~/components'
import { Icon } from '~/components/Icon'
import { Tooltip } from '~/components/Tooltip'

export const SelectContent = ({ clearAllOptions, toggleAllOptions, variant, pathname, options, selectedOptions }) => {
	return (
		<>
			<span className="sticky z-[1] top-0 flex flex-wrap justify-between gap-1 bg-[var(--bg1)] text-[var(--link)] text-xs border-b border-black/10 dark:border-white/10">
				<button onClick={clearAllOptions} className="p-3">
					Clear
				</button>
				<button onClick={toggleAllOptions} className="p-3">
					Toggle all
				</button>
			</span>
			{options.map((option) => (
				<SelectItem
					key={option.key}
					value={option.key}
					disabled={pathname ? option.disabledOnPages?.includes(pathname) ?? false : false}
					className="flex items-center justify-between gap-4 py-2 px-3 flex-shrink-0 hover:bg-[var(--primary1-hover)] focus-visible:bg-[var(--primary1-hover)] cursor-pointer last-of-type:rounded-b-md border-b border-black/10 dark:border-white/10"
				>
					{option.help ? (
						<Tooltip content={option.help}>
							<span>{option.name}</span>
							<Icon name="help-circle" height={15} width={15} />
						</Tooltip>
					) : (
						option.name
					)}
					<Checkbox
						checked={
							selectedOptions.includes(option.key) ||
							(pathname ? option.disabledOnPages?.includes(pathname) ?? false : false)
						}
					/>
				</SelectItem>
			))}
		</>
	)
}
