import { useRouter } from 'next/router'
import * as Ariakit from '@ariakit/react'
import { nftOptions } from '~/components/Filters/nfts/options'
import { feesOptions, tvlOptions } from '~/components/Filters/options'
import { Icon } from '~/components/Icon'
import { DARK_MODE, TSETTINGTYPE, useDarkModeManager, useLocalStorageSettingsManager } from '~/contexts/LocalStorage'

export function Settings() {
	const [darkMode, toggleDarkMode] = useDarkModeManager()

	const { options, dashboardType } = useAppSettings()

	const [enabledOptions, updater] = useLocalStorageSettingsManager(dashboardType)

	const selectedOptions = options
		.map((o) => o.key)
		.filter((key) => enabledOptions[key])
		.concat(darkMode ? [DARK_MODE] : [])

	const onChange = (values: string[]) => {
		const isDarkMode = values.includes(DARK_MODE)
		if (isDarkMode !== darkMode) {
			toggleDarkMode()
		} else if (values.length < selectedOptions.length) {
			const off = selectedOptions.find((o) => !values.includes(o))
			updater(off)
		} else {
			const on = values.find((o) => !selectedOptions.includes(o))
			updater(on)
		}
	}

	return (
		<Ariakit.SelectProvider value={selectedOptions} setValue={onChange}>
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
				className="max-sm:drawer z-10 flex h-[calc(100vh-80px)] min-w-[180px] flex-col overflow-auto overscroll-contain rounded-md border border-[hsl(204,20%,88%)] bg-(--bg-main) max-sm:rounded-b-none sm:max-h-[60vh] lg:h-full lg:max-h-[var(--popover-available-height)] dark:border-[hsl(204,3%,32%)]"
			>
				<Ariakit.PopoverDismiss className="ml-auto p-2 opacity-50 sm:hidden">
					<Icon name="x" className="h-5 w-5" />
				</Ariakit.PopoverDismiss>

				<h1 className="mx-3 my-2 text-(--text-secondary)">Settings</h1>
				<hr className="border-black/20 dark:border-white/20" />
				{options.map((option) => (
					<Ariakit.SelectItem
						value={option.key}
						key={option.key}
						className="flex items-center justify-between gap-3 px-3 py-2"
					>
						{option.name}
						<Ariakit.SelectItemCheck />
					</Ariakit.SelectItem>
				))}
				<Ariakit.SelectItem value={DARK_MODE} className="flex items-center justify-between gap-3 px-3 py-2">
					Dark Mode
					<Ariakit.SelectItemCheck />
				</Ariakit.SelectItem>
			</Ariakit.SelectPopover>
		</Ariakit.SelectProvider>
	)
}

const useAppSettings = (): {
	options: Array<{ name: string; key: string; help?: string }>
	dashboardType: TSETTINGTYPE
} => {
	const router = useRouter()

	if (router.pathname.startsWith('/yields')) {
		return { options: [], dashboardType: 'tvl' }
	}

	if (router.pathname.startsWith('/stablecoin')) {
		return { options: [], dashboardType: 'tvl' }
	}

	if (router.pathname.startsWith('/liquidations')) {
		return { options: [], dashboardType: 'tvl' }
	}

	if (router.pathname.startsWith('/dex')) {
		return { options: [], dashboardType: 'tvl' }
	}

	if (router.pathname.startsWith('/raises')) {
		return { options: [], dashboardType: 'tvl' }
	}

	if (router.pathname.startsWith('/hacks')) {
		return { options: [], dashboardType: 'tvl' }
	}

	if (router.pathname.startsWith('/bridge')) {
		return { options: [], dashboardType: 'tvl' }
	}

	if (router.pathname.startsWith('/borrow')) {
		return { options: [], dashboardType: 'tvl' }
	}

	if (router.pathname.startsWith('/nfts')) {
		return { options: nftOptions, dashboardType: 'nfts' }
	}

	if (router.pathname.startsWith('/protocol')) {
		return { options: [...tvlOptions, ...feesOptions], dashboardType: 'tvl_fees' }
	}

	return { options: tvlOptions, dashboardType: 'tvl_fees' }
}
