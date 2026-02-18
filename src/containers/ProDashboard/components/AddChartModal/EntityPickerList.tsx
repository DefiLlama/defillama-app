import { useVirtualizer } from '@tanstack/react-virtual'
import { matchSorter } from 'match-sorter'
import { useMemo, useRef, useState } from 'react'
import { Icon } from '~/components/Icon'
import { LocalLoader } from '~/components/Loaders'
import { getItemIconUrl } from '../../utils'

interface EntityOption {
	value: string
	label: string
	logo?: string
	isChild?: boolean
}

interface EntityPickerListProps {
	mode: 'chain' | 'protocol'
	entities: EntityOption[]
	selectedEntities: string[]
	onToggle: (value: string) => void
	onClear: () => void
	isLoading?: boolean
}

export function EntityPickerList({
	mode,
	entities,
	selectedEntities,
	onToggle,
	onClear,
	isLoading = false
}: EntityPickerListProps) {
	const [search, setSearch] = useState('')
	const listRef = useRef<HTMLDivElement | null>(null)
	const selectedEntitiesSet = useMemo(() => new Set(selectedEntities), [selectedEntities])

	const filteredEntities = useMemo(() => {
		if (!search) return entities
		return matchSorter(entities, search, { keys: ['label'] })
	}, [entities, search])

	const virtualizer = useVirtualizer({
		count: filteredEntities.length,
		getScrollElement: () => listRef.current,
		estimateSize: () => 40,
		overscan: 10
	})

	if (isLoading) {
		return (
			<div className="flex h-full min-h-[200px] items-center justify-center rounded-lg border border-(--cards-border) bg-(--cards-bg)">
				<LocalLoader />
			</div>
		)
	}

	return (
		<div className="flex h-full min-h-0 flex-col overflow-hidden rounded-lg border border-(--cards-border)">
			<div className="flex items-center justify-between border-b border-(--cards-border) bg-(--cards-bg) px-3 py-2">
				<div className="relative flex-1">
					<Icon
						name="search"
						width={14}
						height={14}
						className="absolute top-1/2 left-2.5 -translate-y-1/2 text-(--text-tertiary)"
					/>
					<input
						value={search}
						onChange={(e) => setSearch(e.target.value)}
						placeholder={`Search ${mode === 'chain' ? 'chains' : 'protocols'}...`}
						className="w-full rounded-md border border-(--form-control-border) bg-(--bg-input) py-1.5 pr-2.5 pl-8 text-xs transition-colors focus:border-(--primary) focus:ring-1 focus:ring-(--primary) focus:outline-hidden"
					/>
				</div>
				{selectedEntities.length > 0 && (
					<div className="ml-3 flex items-center gap-2">
						<span className="text-xs font-medium text-(--text-secondary)">{selectedEntities.length} selected</span>
						<button
							type="button"
							onClick={onClear}
							className="text-xs font-medium text-(--text-tertiary) transition-colors hover:text-(--primary)"
						>
							Clear
						</button>
					</div>
				)}
			</div>

			<div ref={listRef} className="thin-scrollbar flex-1 overflow-y-auto bg-(--cards-bg-alt)/30">
				{filteredEntities.length === 0 ? (
					<div className="flex h-full items-center justify-center text-xs text-(--text-tertiary)">
						No {mode === 'chain' ? 'chains' : 'protocols'} found
					</div>
				) : (
					<div
						style={{
							height: virtualizer.getTotalSize(),
							position: 'relative'
						}}
					>
						{virtualizer.getVirtualItems().map((row) => {
							const entity = filteredEntities[row.index]
							if (!entity) return null
							const isSelected = selectedEntitiesSet.has(entity.value)
							const iconUrl = getItemIconUrl(mode, null, entity.value)
							const isChild = entity.isChild

							return (
								<button
									key={entity.value}
									type="button"
									onClick={() => onToggle(entity.value)}
									className={`flex w-full items-center gap-3 py-2 pr-3 text-left text-xs transition-all hover:bg-(--cards-bg-alt) ${
										isSelected ? 'bg-(--primary)/10' : ''
									} ${isChild ? 'pl-8' : 'pl-3'}`}
									style={{
										position: 'absolute',
										top: 0,
										left: 0,
										width: '100%',
										transform: `translateY(${row.start}px)`
									}}
								>
									<div
										className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors ${
											isSelected
												? 'border-(--primary) bg-(--primary)'
												: 'border-(--form-control-border) bg-(--bg-input)'
										}`}
									>
										{isSelected && <Icon name="check" width={10} height={10} className="text-white" />}
									</div>

									{iconUrl && (
										<img
											src={iconUrl}
											alt={entity.label}
											className="h-5 w-5 shrink-0 rounded-full object-cover ring-1 ring-(--cards-border)"
											onError={(e) => {
												e.currentTarget.style.display = 'none'
											}}
										/>
									)}

									<span className={`truncate ${isSelected ? 'font-medium text-(--primary)' : 'text-(--text-primary)'}`}>
										{entity.label}
									</span>
								</button>
							)
						})}
					</div>
				)}
			</div>
		</div>
	)
}
