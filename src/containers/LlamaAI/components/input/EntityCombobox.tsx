import * as Ariakit from '@ariakit/react'
import type { RefObject } from 'react'
import { TokenLogo } from '~/components/TokenLogo'
import { getAnchorRect } from '../../utils/entitySuggestions'

interface EntityMatch {
	id: string
	name: string
	logo?: string
	type: string
}

interface EntityComboboxPopoverProps {
	combobox: Ariakit.ComboboxStore
	promptInputRef: RefObject<HTMLTextAreaElement>
	matches: EntityMatch[] | undefined
	hasMatches: boolean
	isTriggerOnly: boolean
	isLoading: boolean
	isFetching: boolean
	onItemClick: (entity: { id: string; name: string; type: string }) => void
}

export function EntityComboboxPopover({
	combobox,
	promptInputRef,
	matches,
	hasMatches,
	isTriggerOnly,
	isLoading,
	isFetching,
	onItemClick
}: EntityComboboxPopoverProps) {
	const shouldShow = hasMatches || (isTriggerOnly && (isLoading || isFetching))

	if (!shouldShow) return null

	return (
		<Ariakit.ComboboxPopover
			store={combobox}
			unmountOnHide
			portal={true}
			flip={true}
			fitViewport
			getAnchorRect={() => {
				const textarea = promptInputRef.current
				if (!textarea) return null
				return getAnchorRect(textarea)
			}}
			className="relative z-50 flex max-h-(--popover-available-height) max-w-[280px] min-w-[100px] flex-col overflow-auto overscroll-contain rounded-lg border border-[#e6e6e6] bg-(--app-bg) shadow-lg dark:border-[#222324]"
		>
			{hasMatches && matches ? (
				matches.map(({ id, name, logo, type }) => (
					<Ariakit.ComboboxItem
						key={id}
						value={id}
						focusOnHover
						onClick={() => onItemClick({ id, name, type })}
						className="flex cursor-pointer items-center gap-1.5 border-t border-[#e6e6e6] px-3 py-2 first:border-t-0 hover:bg-[#e6e6e6] focus-visible:bg-[#e6e6e6] data-active-item:bg-[#e6e6e6] dark:border-[#222324] dark:hover:bg-[#222324] dark:focus-visible:bg-[#222324] dark:data-active-item:bg-[#222324]"
					>
						{logo && <TokenLogo logo={logo} size={20} />}
						<span className="flex items-center gap-1.5">
							<span className="text-sm font-medium">{name}</span>
							<EntityTypeBadge type={type} />
						</span>
					</Ariakit.ComboboxItem>
				))
			) : (
				<div className="px-3 py-2 text-sm text-[#666] dark:text-[#999]">Loading…</div>
			)}
		</Ariakit.ComboboxPopover>
	)
}

function EntityTypeBadge({ type }: { type: string }) {
	const colorClass =
		type === 'Chain'
			? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
			: type === 'Protocol'
				? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400'
				: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'

	return <span className={`rounded px-1.5 py-0.5 text-xs font-medium ${colorClass}`}>{type}</span>
}
