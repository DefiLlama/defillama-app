import { useEffect, useRef } from 'react'
import { TokenLogo } from '~/components/TokenLogo'

interface EntitySuggestion {
	slug: string
	displayName: string
	type: 'chain' | 'protocol' | 'subprotocol' | 'category'
	score: number
}

function getEntityIcon(type: string, slug: string): string {
	switch (type) {
		case 'protocol':
		case 'subprotocol':
			return `https://icons.llamao.fi/icons/protocols/${slug}?w=48&h=48`
		case 'chain':
			return `https://icons.llamao.fi/icons/chains/rsz_${slug}?w=48&h=48`
		default:
			return ''
	}
}

interface EntityAutocompleteProps {
	suggestions: EntitySuggestion[]
	onSelect: (suggestion: EntitySuggestion) => void
	onClose: () => void
	position: { top: number; left: number }
	selectedIndex: number
}

export function EntityAutocomplete({
	suggestions,
	onSelect,
	onClose,
	position,
	selectedIndex
}: EntityAutocompleteProps) {
	const containerRef = useRef<HTMLDivElement>(null)

	useEffect(() => {
		const container = containerRef.current
		if (!container) return

		const selected = container.querySelector('[data-selected="true"]')
		if (selected) {
			selected.scrollIntoView({ block: 'nearest' })
		}
	}, [selectedIndex])

	if (suggestions.length === 0) return null

	return (
		<div
			ref={containerRef}
			className="fixed z-50 w-[300px] overflow-hidden rounded-lg border border-[#e6e6e6] bg-(--app-bg) shadow-lg dark:border-[#222324]"
			style={{
				top: position.top,
				left: position.left
			}}
		>
			<div className="max-h-[300px] overflow-y-auto">
				{suggestions.map((suggestion, index) => {
					const iconUrl = getEntityIcon(suggestion.type, suggestion.slug)
					return (
						<button
							key={`${suggestion.type}-${suggestion.slug}`}
							data-selected={index === selectedIndex}
							onClick={() => onSelect(suggestion)}
							className={`flex w-full items-center gap-2 border-t border-[#e6e6e6] p-2.5 text-left first:border-t-0 hover:bg-[#f7f7f7] focus-visible:bg-[#f7f7f7] dark:border-[#222324] dark:hover:bg-[#222324] dark:focus-visible:bg-[#222324] ${
								index === selectedIndex ? 'bg-[#f7f7f7] dark:bg-[#222324]' : ''
							}`}
						>
							<TokenLogo logo={iconUrl} size={20} />
							<div className="flex flex-col gap-0.5">
								<div className="flex items-center gap-1.5">
									<span className="text-sm font-medium">{suggestion.displayName}</span>
									<span
										className={`rounded px-1.5 py-0.5 text-xs font-medium ${
											suggestion.type === 'chain'
												? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
												: suggestion.type === 'category'
													? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
													: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400'
										}`}
									>
										{suggestion.type === 'chain' ? 'Chain' : suggestion.type === 'category' ? 'Category' : 'Protocol'}
									</span>
								</div>
								{suggestion.displayName.toLowerCase() !== suggestion.slug && (
									<span className="text-xs text-[#666] dark:text-[#919296]">{suggestion.slug}</span>
								)}
							</div>
						</button>
					)
				})}
			</div>
		</div>
	)
}
