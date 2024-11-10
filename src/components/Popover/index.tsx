import * as React from 'react'
import { Popover as AriaPopover, PopoverDisclosure, usePopoverState } from 'ariakit/popover'
import { transparentize } from 'polished'
import { useSetPopoverStyles } from './utils'
import { useRouter } from 'next/router'
import { Tooltip } from '../Tooltip'
import { useDarkModeManager, useDefiManager } from '~/contexts/LocalStorage'
import { Icon } from '~/components/Icon'

interface IProps {
	variant?: 'primary' | 'secondary'
	trigger: React.ReactNode
	content: React.ReactNode
	color?: string
}

export function Popover({ trigger, content, variant = 'primary', color, ...props }: IProps) {
	const [isLarge, renderCallback] = useSetPopoverStyles()

	const popover = usePopoverState({ renderCallback, gutter: 8, animated: isLarge ? false : true })

	return (
		<>
			<PopoverDisclosure
				state={popover}
				data-variant={variant}
				style={color ? ({ '--primary1': transparentize(0.8, color) } as any) : {}}
				className={
					variant === 'secondary'
						? 'bg-[var(--btn-bg)] hover:bg-[var(--btn-hover-bg)] focus-visible:bg-[var(--btn-hover-bg)] flex items-center justify-between gap-2 py-2 px-3 rounded-md cursor-pointer text-[var(--text1)] text-xs flex-nowrap'
						: 'bg-[var(--btn2-bg)]  hover:bg-[var(--btn2-hover-bg)] focus-visible:bg-[var(--btn2-hover-bg)] flex items-center justify-between gap-2 py-2 px-3 rounded-lg cursor-pointer text-[var(--text1)] flex-nowrap relative'
				}
			>
				{trigger}
			</PopoverDisclosure>
			{popover.mounted ? (
				<AriaPopover
					{...props}
					state={popover}
					modal={!isLarge}
					className="flex flex-col gap-4 pt-5 pb-8 sm:pt-0 sm:pb-0 w-full h-fit max-h-[calc(100vh-200px)] rounded-md text-[hsl(204,10%,10%)] dark:text-[hsl(0,0%,100%)] bg-[hsl(204,20%,100%)] dark:bg-[hsl(204,3%,12%)] overflow-auto overscroll-contain z-10 sm:max-w-[min(calc(100vw_-_16px),320px)] border border-[hsl(204,20%,88%)] dark:border-[hsl(204,3%,32%)] max-sm:drawer"
				>
					{content}
				</AriaPopover>
			) : null}
		</>
	)
}

export function EmbedChart({ color }) {
	const popover = usePopoverState({ gutter: 8 })

	const router = useRouter()

	const [extraTvlsEnabled] = useDefiManager()
	const [isDarkTheme] = useDarkModeManager()

	let path = router.asPath === '/' ? '/chain/All' : router.asPath.split('#')[0].split('?')[0]

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
		<>
			<Tooltip content="Embed Chart">
				<PopoverDisclosure
					state={popover}
					style={color ? ({ '--primary1': transparentize(0.8, color) } as any) : {}}
					className="font-medium text-sm inline-block rounded-xl py-[10px] px-3 text-black/60 dark:text-white/60 bg-[var(--primary1)]"
				>
					<Icon name="code" height={14} width={14} />
					<span className="sr-only">Embed Chart</span>
				</PopoverDisclosure>
			</Tooltip>

			{popover.mounted ? (
				<AriaPopover
					state={popover}
					className="w-full max-h-[calc(100vh-200px)] rounded-md text-[hsl(204,10%,10%)] dark:text-[hsl(0,0%,100%)] bg-[hsl(204,20%,100%)] dark:bg-[hsl(204,3%,12%)] overflow-auto overscroll-contain z-10 sm:max-w-[min(calc(100vw_-_16px),320px)] border border-[hsl(204,20%,88%)] dark:border-[hsl(204,3%,32%)]"
				>
					<div className="p-1">
						<p className="p-2 rounded-md bg-white dark:bg-black break-all">{url}</p>
					</div>
				</AriaPopover>
			) : null}
		</>
	)
}
