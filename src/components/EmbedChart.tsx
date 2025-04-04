import * as React from 'react'
import * as Ariakit from '@ariakit/react'
import { transparentize } from 'polished'
import { useRouter } from 'next/router'
import { Tooltip } from './Tooltip'
import { useDarkModeManager, useDefiManager } from '~/contexts/LocalStorage'
import { Icon } from '~/components/Icon'

export function EmbedChart({ color }) {
	const router = useRouter()

	const [extraTvlsEnabled] = useDefiManager()
	const [isDarkTheme] = useDarkModeManager()

	let path = router.asPath === '/' ? '/chain/All' : router.asPath.split('#')[0].split('?')[0]

	if (typeof document !== 'undefined') {
		path += window.location.search
	}

	if (!path.includes('?')) {
		path += '?'
	}

	const extras = []
	for (const option in extraTvlsEnabled) {
		if (extraTvlsEnabled[option]) {
			extras.push(`include_${option}_in_tvl=true`)
		}
	}

	extras.push(isDarkTheme ? 'theme=dark' : 'theme=light')

	const url = `<iframe width="640px" height="360px" src="https://defillama.com/chart${path}" title="DefiLlama" frameborder="0"></iframe>`

	return (
		<Ariakit.PopoverProvider>
			<Tooltip content="Embed Chart">
				<Ariakit.PopoverDisclosure
					style={color ? ({ '--primary1': transparentize(0.8, color) } as any) : {}}
					className="font-medium text-sm inline-block rounded-xl py-[10px] px-3 text-black/60 dark:text-white/60 bg-[var(--primary1)]"
				>
					<Icon name="code" height={14} width={14} />
					<span className="sr-only">Embed Chart</span>
				</Ariakit.PopoverDisclosure>
			</Tooltip>

			<Ariakit.Popover
				unmountOnHide
				hideOnInteractOutside
				gutter={6}
				className="w-full max-h-[calc(100vh-200px)] rounded-md text-[hsl(204,10%,10%)] dark:text-[hsl(0,0%,100%)] bg-[hsl(204,20%,100%)] dark:bg-[hsl(204,3%,12%)] overflow-auto overscroll-contain z-10 sm:max-w-[min(calc(100vw_-_16px),320px)] border border-[hsl(204,20%,88%)] dark:border-[hsl(204,3%,32%)]"
			>
				<div className="p-1">
					<p className="p-2 rounded-md bg-white dark:bg-black break-all">{url}</p>
				</div>
			</Ariakit.Popover>
		</Ariakit.PopoverProvider>
	)
}
