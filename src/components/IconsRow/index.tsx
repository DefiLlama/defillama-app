import * as Ariakit from '@ariakit/react'
import { useMemo, useRef } from 'react'
import { TokenLogo } from '~/components/TokenLogo'
import { useResize } from '~/hooks/useResize'
import { chainIconUrl, tokenIconUrl } from '~/utils'

const ICON_WIDTH = 24
const MAX_ROW_WIDTH = 280

export interface IconsRowItem {
	label: string
	kind: 'chain' | 'token'
	href?: string
	title?: string
}

interface IIconItemLogoProps {
	item: IconsRowItem
}

const IconItemLogo = ({ item }: IIconItemLogoProps) => {
	const logo = item.kind === 'token' ? tokenIconUrl(item.label) : chainIconUrl(item.label)
	const title = item.title ?? item.label

	if (!item.href) {
		return <TokenLogo logo={logo} alt={`Logo of ${item.label}`} title={title} />
	}

	return (
		<a href={item.href} target="_blank" rel="noopener noreferrer" title={title}>
			<TokenLogo onClick={(e) => e.stopPropagation()} logo={logo} alt={`Logo of ${item.label}`} />
		</a>
	)
}

interface IIconsRowProps {
	items: IconsRowItem[]
	align?: 'start' | 'end'
}

const EMPTY_ITEMS: Array<IconsRowItem> = []

export const IconsRow = ({ items = EMPTY_ITEMS, align = 'end' }: IIconsRowProps) => {
	const mainWrapEl = useRef<HTMLDivElement>(null)
	const { width: mainWrapWidth } = useResize(mainWrapEl)

	const { visibleItems, hiddenItems } = useMemo(() => {
		let remainingWidth = Math.min(mainWrapWidth, MAX_ROW_WIDTH) - ICON_WIDTH
		let visibleItemCount = 0

		for (const _ of items) {
			if (remainingWidth < 0) break
			remainingWidth -= ICON_WIDTH
			visibleItemCount += 1
		}

		visibleItemCount = items.length > 2 ? visibleItemCount : items.length
		const overflowStartIndex = visibleItemCount < items.length ? Math.max(visibleItemCount - 1, 0) : visibleItemCount

		const visibleItems = items.length > 2 ? items.slice(0, overflowStartIndex) : items
		const hiddenItems = overflowStartIndex !== visibleItemCount ? items.slice(overflowStartIndex) : []

		return { visibleItems, hiddenItems }
	}, [items, mainWrapWidth])

	return (
		<div
			className={`flex items-center ${align === 'start' ? 'justify-start' : 'justify-end'} overflow-hidden bg-none`}
			ref={mainWrapEl}
		>
			{visibleItems.map((item) => (
				<IconItemLogo key={item.label} item={item} />
			))}
			{!!hiddenItems.length && items.length > 2 && (
				<Ariakit.HovercardProvider>
					<Ariakit.HovercardAnchor
						render={<button />}
						className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-(--bg-tertiary) text-[10px] text-(--text-primary)"
					>
						{`+${hiddenItems.length}`}
					</Ariakit.HovercardAnchor>
					<Ariakit.Hovercard
						className="z-10 flex max-w-xl flex-wrap items-center justify-start gap-1 overflow-hidden rounded-md border border-(--bg-tertiary) bg-(--bg-secondary) bg-none p-1 text-(--text-primary) shadow-sm"
						unmountOnHide
						portal
					>
						{hiddenItems.map((item) => (
							<IconItemLogo key={item.label} item={item} />
						))}
					</Ariakit.Hovercard>
				</Ariakit.HovercardProvider>
			)}
		</div>
	)
}
