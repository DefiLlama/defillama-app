import { DARK_MODE, TSETTINGTYPE, useDarkModeManager, useLocalStorageSettingsManager } from '~/contexts/LocalStorage'
import { protocolsAndChainsOptions } from '~/components/Filters/options'
import { nftOptions } from '~/components/Filters/nfts/options'
import { useRouter } from 'next/router'
import { feesOptions } from '~/components/Filters/options'
import { Icon } from '~/components/Icon'
import * as Ariakit from '@ariakit/react'

export function Settings() {
	const [darkMode] = useDarkModeManager()

	const { options, dashboardType } = useAppSettings()

	const [enabledOptions, updater] = useLocalStorageSettingsManager(dashboardType)

	const selectedOptions = options
		.map((o) => o.key)
		.filter((key) => enabledOptions[key])
		.concat(darkMode ? [DARK_MODE] : [])

	const onChange = (values) => {
		if (values.length < selectedOptions.length) {
			const off = selectedOptions.find((o) => !values.includes(o))
			updater(off)
		} else {
			const on = values.find((o) => !selectedOptions.includes(o))
			updater(on)
		}
	}

	return (
		<Ariakit.SelectProvider value={selectedOptions} setValue={onChange}>
			<Ariakit.Select className="shadow p-3 rounded-md bg-[#445ed0] text-white -my-[2px]">
				<span className="sr-only">Open Settings Menu</span>
				<Icon name="settings" height={16} width={16} />
			</Ariakit.Select>
			<Ariakit.SelectPopover
				unmountOnHide
				hideOnInteractOutside
				gutter={6}
				wrapperProps={{
					className: 'max-sm:!fixed max-sm:!bottom-0 max-sm:!top-[unset] max-sm:!transform-none max-sm:!w-full'
				}}
				className="flex flex-col bg-[var(--bg1)] rounded-md z-10 overflow-auto overscroll-contain min-w-[180px] border border-[hsl(204,20%,88%)] dark:border-[hsl(204,3%,32%)] max-sm:drawer h-full max-h-[70vh] sm:max-h-[60vh]"
			>
				<h1 className="text-[var(--text2)] my-2 mx-3">Settings</h1>
				<hr className="border-black/20 dark:border-white/20" />
				{options.map((option) => (
					<Ariakit.SelectItem
						value={option.key}
						key={option.key}
						className="flex items-center justify-between gap-3 py-2 px-3"
					>
						{option.name}
						<Ariakit.SelectItemCheck />
					</Ariakit.SelectItem>
				))}
				<Ariakit.SelectItem value={DARK_MODE} className="flex items-center justify-between gap-3 py-2 px-3">
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
		return { options: [...protocolsAndChainsOptions, ...feesOptions], dashboardType: 'tvl+fees' }
	}

	return { options: protocolsAndChainsOptions, dashboardType: 'tvl+fees' }
}
