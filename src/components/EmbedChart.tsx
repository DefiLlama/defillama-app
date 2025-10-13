import * as React from 'react'
import { useRouter } from 'next/router'
import * as Ariakit from '@ariakit/react'
import { Icon } from '~/components/Icon'
import { useDarkModeManager, useLocalStorageSettingsManager } from '~/contexts/LocalStorage'
import { CopyHelper } from './Copy'

export function EmbedChart() {
	const router = useRouter()

	const [tvlSettings] = useLocalStorageSettingsManager('tvl')
	const [feesSettings] = useLocalStorageSettingsManager('fees')
	const [isDarkTheme] = useDarkModeManager()

	const url = React.useMemo(() => {
		let path = router.asPath === '/' ? '/chain/All' : router.asPath.split('#')[0].split('?')[0]

		if (typeof document !== 'undefined') {
			path += window.location.search
		}

		if (!path.includes('?')) {
			path += '?'
		} else {
			path += '&'
		}

		const extras = []
		for (const option in tvlSettings) {
			if (tvlSettings[option]) {
				extras.push(`include_${option}_in_tvl=true`)
			}
		}

		for (const option in feesSettings) {
			if (feesSettings[option]) {
				extras.push(`include_${option}_in_fees=true`)
			}
		}

		extras.push(isDarkTheme ? 'theme=dark' : 'theme=light')

		return `<iframe width="640px" height="360px" src="https://defillama.com/chart${path}${extras.join(
			'&'
		)}" title="DefiLlama" frameborder="0"></iframe>`
	}, [router.asPath, tvlSettings, feesSettings, isDarkTheme])

	return (
		<Ariakit.PopoverProvider>
			<Ariakit.PopoverDisclosure className="flex items-center justify-center rounded-md border border-(--form-control-border) px-2 py-2 text-sm font-medium text-(--text-form)! hover:bg-(--link-hover-bg) focus-visible:bg-(--link-hover-bg)">
				<Icon name="code" height={12} width={12} />
				<span className="sr-only">Embed Chart</span>
			</Ariakit.PopoverDisclosure>

			<Ariakit.Popover
				unmountOnHide
				hideOnInteractOutside
				gutter={6}
				className="z-10 mr-1 flex max-h-[calc(100dvh-80px)] w-[min(calc(100vw-16px),320px)] flex-col items-end gap-2 overflow-auto overscroll-contain rounded-md border border-[hsl(204,20%,88%)] bg-(--bg-main) p-1 text-xs lg:mr-4 lg:max-h-(--popover-available-height) dark:border-[hsl(204,3%,32%)]"
			>
				<code className="block rounded-md bg-white p-2 text-xs break-all sm:text-sm dark:bg-black">{url}</code>
				<CopyHelper toCopy={url} />
			</Ariakit.Popover>
		</Ariakit.PopoverProvider>
	)
}
