import * as React from 'react'
import * as Ariakit from '@ariakit/react'
import { useRouter } from 'next/router'
import { useDarkModeManager, useLocalStorageSettingsManager } from '~/contexts/LocalStorage'
import { Icon } from '~/components/Icon'

export function EmbedChart() {
	const router = useRouter()

	const [tvlSettings] = useLocalStorageSettingsManager('tvl')
	const [feesSettings] = useLocalStorageSettingsManager('fees')
	const [isDarkTheme] = useDarkModeManager()

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

	const url = `<iframe width="640px" height="360px" src="https://defillama.com/chart${path}${extras.join(
		'&'
	)}" title="DefiLlama" frameborder="0"></iframe>`

	return (
		<Ariakit.PopoverProvider>
			<Ariakit.PopoverDisclosure className="flex h-[30px] w-[30px] items-center justify-center rounded-md border border-(--form-control-border) text-sm font-medium text-(--text-form)! hover:bg-(--link-hover-bg) focus-visible:bg-(--link-hover-bg)">
				<Icon name="code" height={12} width={12} />
				<span className="sr-only">Embed Chart</span>
			</Ariakit.PopoverDisclosure>

			<Ariakit.Popover
				unmountOnHide
				hideOnInteractOutside
				gutter={6}
				className="z-10 max-h-[calc(100vh-200px)] w-full overflow-auto overscroll-contain rounded-md border border-[hsl(204,20%,88%)] bg-[hsl(204,20%,100%)] text-[hsl(204,10%,10%)] sm:max-w-[min(calc(100vw-16px),320px)] dark:border-[hsl(204,3%,32%)] dark:bg-[hsl(204,3%,12%)] dark:text-[hsl(0,0%,100%)]"
			>
				<div className="p-1">
					<p className="rounded-md bg-white p-2 break-all dark:bg-black">{url}</p>
				</div>
			</Ariakit.Popover>
		</Ariakit.PopoverProvider>
	)
}
