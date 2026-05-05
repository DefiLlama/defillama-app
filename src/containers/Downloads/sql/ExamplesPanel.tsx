import { useMemo, useState } from 'react'
import { Icon } from '~/components/Icon'
import { LoadingSpinner } from '~/components/Loaders'
import { EXAMPLE_QUERIES, SUBCATEGORY_META, type ExampleQuery, type ExampleSubcategory } from './examples'

interface ExamplesPanelProps {
	onApply: (example: ExampleQuery) => void
	busyTaskId?: string | null
	collapsed?: boolean
	onToggleCollapsed?: () => void
}

export function ExamplesPanel({ onApply, busyTaskId, collapsed = false, onToggleCollapsed }: ExamplesPanelProps) {
	if (collapsed) {
		return <CollapsedExamplesRail onExpand={onToggleCollapsed} />
	}
	return <ExpandedExamplesPanel onApply={onApply} busyTaskId={busyTaskId} onCollapse={onToggleCollapsed} />
}

function CollapsedExamplesRail({ onExpand }: { onExpand?: () => void }) {
	return (
		<aside className="flex flex-col items-stretch gap-2 rounded-md border border-(--divider) bg-(--cards-bg) p-1.5">
			<button
				type="button"
				onClick={onExpand}
				title="Expand playbook"
				aria-label="Expand playbook"
				className="flex h-7 w-7 items-center justify-center rounded-md text-(--text-tertiary) transition-colors hover:bg-(--link-hover-bg) hover:text-(--text-primary)"
			>
				<Icon name="panel-left-open" className="h-3.5 w-3.5 rotate-180" />
			</button>
			<button
				type="button"
				onClick={onExpand}
				title={`Playbook · ${EXAMPLE_QUERIES.length} queries`}
				aria-label={`Playbook · ${EXAMPLE_QUERIES.length} queries`}
				className="group flex flex-1 flex-col items-center gap-2 rounded-md px-1 py-3 text-[11px] font-medium text-(--text-tertiary) transition-colors hover:text-(--primary)"
			>
				<Icon
					name="sparkles"
					className="h-3.5 w-3.5 text-(--text-tertiary) transition-colors group-hover:text-(--primary)"
				/>
				<span
					className="font-semibold tracking-[0.16em] uppercase [writing-mode:vertical-rl]"
					style={{ transform: 'rotate(180deg)' }}
				>
					Playbook
				</span>
				<span className="tabular-nums">{EXAMPLE_QUERIES.length}</span>
			</button>
		</aside>
	)
}

function ExpandedExamplesPanel({
	onApply,
	busyTaskId,
	onCollapse
}: {
	onApply: (example: ExampleQuery) => void
	busyTaskId?: string | null
	onCollapse?: () => void
}) {
	const [filter, setFilter] = useState('')
	const [hoveredGroup, setHoveredGroup] = useState<ExampleSubcategory | null>(null)

	const filteredGroups = useMemo(() => {
		const q = filter.trim().toLowerCase()
		const matches = q
			? EXAMPLE_QUERIES.filter(
					(ex) =>
						ex.title.toLowerCase().includes(q) ||
						ex.description.toLowerCase().includes(q) ||
						ex.subcategory.toLowerCase().includes(q)
				)
			: EXAMPLE_QUERIES

		const byGroup = new Map<ExampleSubcategory, ExampleQuery[]>()
		for (const ex of matches) {
			const list = byGroup.get(ex.subcategory) ?? []
			list.push(ex)
			byGroup.set(ex.subcategory, list)
		}
		return SUBCATEGORY_META.filter((g) => byGroup.has(g.name)).map((g) => ({ meta: g, items: byGroup.get(g.name)! }))
	}, [filter])

	const totalVisible = filteredGroups.reduce((sum, g) => sum + g.items.length, 0)
	const activeBlurb = useMemo(() => {
		const active = hoveredGroup ? SUBCATEGORY_META.find((g) => g.name === hoveredGroup) : filteredGroups[0]?.meta
		return active ?? SUBCATEGORY_META[0]
	}, [hoveredGroup, filteredGroups])

	let ordinal = 0

	return (
		<aside className="flex max-h-[min(38rem,calc(100vh-11rem))] flex-col gap-3 rounded-md border border-(--divider) bg-(--cards-bg) p-3">
			<header className="flex items-baseline justify-between gap-2">
				<div className="flex items-baseline gap-2">
					<h3 className="text-sm font-semibold tracking-tight text-(--text-primary)">Playbook</h3>
					<span className="text-[11px] text-(--text-tertiary) tabular-nums">{EXAMPLE_QUERIES.length}</span>
				</div>
				<div className="flex items-center gap-1">
					<Icon name="sparkles" className="h-3.5 w-3.5 text-(--text-tertiary)" />
					{onCollapse ? (
						<button
							type="button"
							onClick={onCollapse}
							title="Collapse playbook"
							aria-label="Collapse playbook"
							className="flex h-5 w-5 items-center justify-center rounded-sm text-(--text-tertiary) transition-colors hover:bg-(--link-hover-bg) hover:text-(--text-primary)"
						>
							<Icon name="panel-left-close" className="h-3 w-3 rotate-180" />
						</button>
					) : null}
				</div>
			</header>

			<div className="relative">
				<Icon
					name="search"
					className="pointer-events-none absolute top-1/2 left-0 h-3 w-3 -translate-y-1/2 text-(--text-tertiary)"
				/>
				<input
					type="text"
					value={filter}
					onChange={(e) => setFilter(e.target.value)}
					placeholder="Filter queries…"
					className="w-full border-b border-(--divider) bg-transparent pr-5 pb-1.5 pl-5 text-xs text-(--text-primary) transition-colors placeholder:text-(--text-tertiary)/80 focus:border-(--primary) focus:outline-none"
				/>
				{filter ? (
					<button
						type="button"
						onClick={() => setFilter('')}
						aria-label="Clear filter"
						className="absolute top-1/2 right-0 flex h-4 w-4 -translate-y-1/2 items-center justify-center rounded-sm text-(--text-tertiary) hover:text-(--text-primary)"
					>
						<Icon name="x" className="h-3 w-3" />
					</button>
				) : null}
			</div>

			<div
				className="-mr-1 flex thin-scrollbar flex-col gap-4 overflow-y-auto pr-1"
				onMouseLeave={() => setHoveredGroup(null)}
			>
				{filteredGroups.length === 0 ? (
					<p className="py-8 text-center text-xs text-(--text-tertiary)">
						No queries match <span className="font-mono text-(--text-secondary)">"{filter}"</span>
					</p>
				) : null}

				{filteredGroups.map(({ meta, items }) => (
					<section key={meta.name} onMouseEnter={() => setHoveredGroup(meta.name)} className="flex flex-col gap-1">
						<header className="flex items-baseline justify-between">
							<h4 className="flex items-center gap-1.5 text-[11px] font-semibold text-(--text-secondary)">
								<span
									aria-hidden
									className="inline-block h-1.5 w-1.5 shrink-0 rounded-full"
									style={{ background: meta.color }}
								/>
								{meta.name}
							</h4>
							<span className="text-[11px] text-(--text-tertiary) tabular-nums">{items.length}</span>
						</header>
						<ul className="flex flex-col border-t border-(--divider)/60">
							{items.map((ex) => {
								ordinal += 1
								const itemId = `example:${ex.title}`
								const isBusy = busyTaskId === itemId
								const isDisabled = !!busyTaskId && !isBusy
								return (
									<PlaybookItem
										key={ex.title}
										ordinal={ordinal}
										example={ex}
										accentColor={meta.color}
										onApply={onApply}
										isBusy={isBusy}
										isDisabled={isDisabled}
									/>
								)
							})}
						</ul>
					</section>
				))}
			</div>

			<footer className="border-t border-(--divider) pt-2">
				<p className="flex items-baseline gap-1.5 text-[11px] leading-snug text-(--text-tertiary)">
					<span
						aria-hidden
						className="inline-block h-1 w-1 shrink-0 translate-y-[-1px] rounded-full"
						style={{ background: activeBlurb.color }}
					/>
					<span>
						<span className="font-semibold text-(--text-secondary)">{activeBlurb.name}.</span> {activeBlurb.blurb}
					</span>
				</p>
				<p className="mt-1 text-[11px] text-(--text-tertiary)/80">
					Click an example to load tables and run it.
					{totalVisible !== EXAMPLE_QUERIES.length ? ` · ${totalVisible} shown` : ''}
				</p>
			</footer>
		</aside>
	)
}

function PlaybookItem({
	ordinal,
	example,
	accentColor,
	onApply,
	isBusy,
	isDisabled
}: {
	ordinal: number
	example: ExampleQuery
	accentColor: string
	onApply: (example: ExampleQuery) => void
	isBusy: boolean
	isDisabled: boolean
}) {
	return (
		<li
			className={`group/item relative border-b border-(--divider)/40 last:border-b-0 ${
				isDisabled ? 'opacity-40' : ''
			} ${isBusy ? 'bg-(--primary)/5' : ''}`}
		>
			<span
				aria-hidden
				className={`pointer-events-none absolute top-1 bottom-1 -left-0.5 w-0.5 origin-left rounded-full transition-all duration-200 ${
					isBusy
						? 'scale-y-100 opacity-100'
						: 'scale-y-0 opacity-0 group-hover/item:scale-y-100 group-hover/item:opacity-100'
				}`}
				style={{ background: accentColor }}
			/>
			<button
				type="button"
				onClick={() => onApply(example)}
				title={example.description}
				disabled={isDisabled || isBusy}
				aria-busy={isBusy}
				className={`grid w-full grid-cols-[1.5rem_minmax(0,1fr)_0.75rem] items-center gap-2 py-1.5 text-left transition-transform duration-200 disabled:cursor-not-allowed ${
					!isDisabled && !isBusy ? 'group-hover/item:translate-x-0.5' : ''
				}`}
			>
				<span className="flex h-4 w-4 items-center justify-center">
					{isBusy ? (
						<LoadingSpinner size={10} />
					) : (
						<span className="text-[11px] text-(--text-tertiary) tabular-nums transition-colors group-hover/item:text-(--text-primary)">
							{String(ordinal).padStart(2, '0')}
						</span>
					)}
				</span>
				<span
					className={`truncate text-[12.5px] leading-snug transition-colors ${
						isBusy ? 'text-(--primary)' : 'text-(--text-primary) group-hover/item:text-(--primary)'
					}`}
				>
					{example.title}
				</span>
				<Icon
					name="arrow-right"
					className={`h-3 w-3 transition-all duration-200 ${
						isBusy
							? 'translate-x-0 text-(--primary) opacity-100'
							: '-translate-x-1 text-(--text-tertiary) opacity-0 group-hover/item:translate-x-0 group-hover/item:text-(--primary) group-hover/item:opacity-100'
					}`}
				/>
			</button>
		</li>
	)
}
