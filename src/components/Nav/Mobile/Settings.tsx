import { Select, SelectItem, SelectItemCheck, SelectPopover, useSelectState } from 'ariakit/select'
import {
	DARK_MODE,
	useDarkModeManager,
	useDefiManager,
	useNftsManager,
	useTvlAndFeesManager
} from '~/contexts/LocalStorage'
import { protocolsAndChainsOptions } from '~/components/Filters/protocols/options'
import { nftOptions } from '~/components/Filters/nfts/options'
import { useRouter } from 'next/router'
import { feesOptions } from '~/components/Filters/protocols/options'
import { Icon } from '~/components/Icon'
import { useSetPopoverStyles } from '~/components/Popover/utils'

export function Settings() {
	const [darkMode] = useDarkModeManager()

	const { options, useSettings } = useAppSettings()

	const [enabledOptions, updater] = useSettings()

	const selectedOptions = options
		.map((o) => o.key)
		.filter((key) => enabledOptions[key])
		.concat(darkMode ? [DARK_MODE] : [])

	const onChange = (values) => {
		if (values.length < selectedOptions.length) {
			const off = selectedOptions.find((o) => !values.includes(o))
			updater(off)()
		} else {
			const on = values.find((o) => !selectedOptions.includes(o))
			updater(on)()
		}
	}
	const [isLarge, renderCallback] = useSetPopoverStyles()

	const select = useSelectState({
		value: selectedOptions,
		setValue: onChange,
		renderCallback
	})

	return (
		<>
			<Select className="shadow p-3 rounded-md bg-[#445ed0] text-white -my-[2px]" state={select}>
				<span className="sr-only">Open Settings Menu</span>
				<Icon name="settings" height={16} width={16} />
			</Select>

			<SelectPopover
				state={select}
				modal={!isLarge}
				className="flex flex-col w-full max-w-[none] min-h-[30vh] max-h-[calc(100vh-200px)] text-sm font-medium bg-[var(--bg1)] rounded-t-md z-10 overflow-auto overscroll-contain sm:hidden"
			>
				<h1 className="text-[var(--text2)] my-2 mx-3">Settings</h1>
				<hr className="border-black/20 dark:border-white/20" />
				{options.map((option) => (
					<SelectItem value={option.key} key={option.key} className="flex items-center justify-between gap-3 py-2 px-3">
						{option.name}
						<SelectItemCheck />
					</SelectItem>
				))}
				<SelectItem value={DARK_MODE} className="flex items-center justify-between gap-3 py-2 px-3">
					Dark Mode
					<SelectItemCheck />
				</SelectItem>
			</SelectPopover>
		</>
	)
}

const useAppSettings = () => {
	const router = useRouter()

	if (router.pathname.startsWith('/yields')) {
		return { options: [], useSettings: useDefiManager }
	}

	if (router.pathname.startsWith('/stablecoin')) {
		return { options: [], useSettings: useDefiManager }
	}

	if (router.pathname.startsWith('/liquidations')) {
		return { options: [], useSettings: useDefiManager }
	}

	if (router.pathname.startsWith('/dex')) {
		return { options: [], useSettings: useDefiManager }
	}

	if (router.pathname.startsWith('/raises')) {
		return { options: [], useSettings: useDefiManager }
	}

	if (router.pathname.startsWith('/hacks')) {
		return { options: [], useSettings: useDefiManager }
	}

	if (router.pathname.startsWith('/bridge')) {
		return { options: [], useSettings: useDefiManager }
	}

	if (router.pathname.startsWith('/borrow')) {
		return { options: [], useSettings: useDefiManager }
	}

	if (router.pathname.startsWith('/nfts')) {
		return { options: nftOptions, useSettings: useNftsManager }
	}

	if (router.pathname.startsWith('/protocol')) {
		return { options: [...protocolsAndChainsOptions, ...feesOptions], useSettings: useTvlAndFeesManager }
	}

	return { options: protocolsAndChainsOptions, useSettings: useTvlAndFeesManager }
}
