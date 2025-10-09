import * as Ariakit from '@ariakit/react'
import { useProtocolsFilterState } from '~/components/Filters/useProtocolFilterState'
import { Icon } from '~/components/Icon'
import { DARK_MODE, useDarkModeManager } from '~/contexts/LocalStorage'

export function Settings({ metricFilters = [] }: { metricFilters?: { name: string; key: string }[] }) {
	const [darkMode, toggleDarkMode] = useDarkModeManager()

	const { selectedValues, setSelectedValues } = useProtocolsFilterState(metricFilters)

	return (
		<Ariakit.SelectProvider value={selectedValues} setValue={setSelectedValues}>
			<Ariakit.Select className="-my-0.5 rounded-md bg-[#445ed0] p-3 text-white shadow">
				<span className="sr-only">Open Settings Menu</span>
				<Icon name="settings" height={16} width={16} />
			</Ariakit.Select>
			<Ariakit.SelectPopover
				unmountOnHide
				hideOnInteractOutside
				gutter={6}
				wrapperProps={{
					className: 'max-sm:fixed! max-sm:bottom-0! max-sm:top-[unset]! max-sm:transform-none! max-sm:w-full!'
				}}
				className="max-sm:drawer z-10 flex h-[calc(100dvh-80px)] min-w-[180px] flex-col overflow-auto overscroll-contain rounded-md border border-[hsl(204,20%,88%)] bg-(--bg-main) max-sm:rounded-b-none sm:max-h-[60dvh] lg:h-full lg:max-h-(--popover-available-height) dark:border-[hsl(204,3%,32%)]"
			>
				<Ariakit.PopoverDismiss className="ml-auto p-2 opacity-50 sm:hidden">
					<Icon name="x" className="h-5 w-5" />
				</Ariakit.PopoverDismiss>

				<h1 className="mx-3 my-2 text-(--text-secondary)">Settings</h1>
				<hr className="border-black/20 dark:border-white/20" />
				{metricFilters.map((option) => (
					<Ariakit.SelectItem
						value={option.key}
						key={option.key}
						className="flex items-center justify-between gap-3 px-3 py-2"
					>
						{option.name}
						<Ariakit.SelectItemCheck />
					</Ariakit.SelectItem>
				))}
				<Ariakit.SelectItem
					value={DARK_MODE}
					onClick={() => toggleDarkMode()}
					className="flex items-center justify-between gap-3 px-3 py-2"
				>
					Dark Mode
					<Ariakit.SelectItemCheck checked={darkMode} />
				</Ariakit.SelectItem>
			</Ariakit.SelectPopover>
		</Ariakit.SelectProvider>
	)
}
