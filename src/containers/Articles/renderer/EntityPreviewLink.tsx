import { useQuery } from '@tanstack/react-query'
import { useState, type ReactNode } from 'react'
import { chainIconUrl, peggedAssetIconUrl, tokenIconUrl } from '~/utils/icons'
import type { EntityPreview } from '../entityPreviewTypes'
import { isPreviewableEntityType } from '../entityPreviewTypes'
import type { ArticleEntityRef, ArticleEntityType } from '../types'

const TYPE_LABEL: Record<ArticleEntityType, string> = {
	protocol: 'Protocol',
	chain: 'Chain',
	stablecoin: 'Stablecoin',
	metric: 'Page',
	hack: 'Hack',
	category: 'Category',
	cex: 'Exchange',
	bridge: 'Bridge'
}

const TYPE_HINT: Record<ArticleEntityType, string> = {
	protocol: 'Protocol overview — TVL, fees, revenue, and activity.',
	chain: 'Chain overview — TVL, protocols, and activity.',
	stablecoin: 'Stablecoin supply, backing, and chain breakdown.',
	metric: 'DefiLlama listing and rankings page.',
	hack: 'Incident detail — loss size and attack vector.',
	category: 'Category overview and member protocols.',
	cex: 'Centralized exchange transparency and reserves.',
	bridge: 'Bridge volume, routes, and source/destination flow.'
}

function entityLogoUrl(entity: ArticleEntityRef) {
	if (entity.entityType === 'chain') return chainIconUrl(entity.slug)
	if (entity.entityType === 'stablecoin') return peggedAssetIconUrl(entity.slug)
	if (entity.entityType === 'protocol') return tokenIconUrl(entity.slug)
	return null
}

const fmtCompactUsd = (n?: number | null): string | null => {
	if (typeof n !== 'number' || !isFinite(n)) return null
	const abs = Math.abs(n)
	if (abs >= 1e12) return `$${(n / 1e12).toFixed(2)}T`
	if (abs >= 1e9) return `$${(n / 1e9).toFixed(2)}B`
	if (abs >= 1e6) return `$${(n / 1e6).toFixed(2)}M`
	if (abs >= 1e3) return `$${(n / 1e3).toFixed(1)}K`
	return `$${n.toFixed(2)}`
}

const fmtPct = (n?: number | null): string | null => {
	if (typeof n !== 'number' || !isFinite(n)) return null
	const sign = n > 0 ? '+' : ''
	return `${sign}${(n * 100).toFixed(2)}%`
}

const changeColor = (n?: number | null) =>
	typeof n !== 'number'
		? 'text-(--text-tertiary)'
		: n > 0
			? 'text-[#16a34a]'
			: n < 0
				? 'text-[#dc2626]'
				: 'text-(--text-tertiary)'

function fetchEntityPreview(
	type: ArticleEntityType,
	slug: string,
	signal?: AbortSignal
): Promise<EntityPreview | null> {
	const url = `/api/research/entities/preview?type=${encodeURIComponent(type)}&slug=${encodeURIComponent(slug)}`
	return fetch(url, { signal })
		.then((r) => (r.ok ? r.json() : null))
		.then((j) => (j && typeof j === 'object' ? ((j.preview as EntityPreview | null) ?? null) : null))
		.catch(() => null)
}

function ChangeChip({ value, label }: { value?: number | null; label: string }) {
	const text = fmtPct(value)
	if (!text) return null
	return (
		<span className={`inline-flex items-baseline gap-1 ${changeColor(value)}`}>
			<span className="text-[10px] font-medium tabular-nums">{text}</span>
			<span className="text-[9px] tracking-wider text-(--text-tertiary) uppercase">{label}</span>
		</span>
	)
}

function MetricRow({ label, value }: { label: string; value: ReactNode }) {
	return (
		<span className="flex items-baseline justify-between gap-3">
			<span className="text-[10px] tracking-wider text-(--text-tertiary) uppercase">{label}</span>
			<span className="text-xs text-(--text-primary) tabular-nums">{value}</span>
		</span>
	)
}

function PreviewBody({
	entity,
	preview,
	loading
}: {
	entity: ArticleEntityRef
	preview: EntityPreview | null
	loading: boolean
}) {
	if (loading && !preview) {
		return (
			<span className="block px-3 pb-3">
				<span className="block h-3 w-2/3 animate-pulse rounded bg-(--cards-border)" />
				<span className="mt-2 block h-3 w-1/2 animate-pulse rounded bg-(--cards-border)" />
			</span>
		)
	}
	if (!preview) {
		return (
			<span className="block px-3 pb-3 text-xs leading-relaxed text-(--text-secondary)">
				{TYPE_HINT[entity.entityType] ?? 'Open the linked DefiLlama page.'}
			</span>
		)
	}
	switch (preview.kind) {
		case 'protocol': {
			const tvl = fmtCompactUsd(preview.tvl)
			return (
				<span className="flex flex-col gap-2 px-3 pb-3">
					{preview.category ? (
						<span className="self-start rounded-full border border-(--cards-border) px-2 py-0.5 text-[10px] tracking-wider text-(--text-tertiary) uppercase">
							{preview.category}
						</span>
					) : null}
					{tvl ? (
						<span className="flex items-baseline gap-2">
							<span className="text-2xl leading-none font-semibold text-(--text-primary) tabular-nums">{tvl}</span>
							<span className="text-[10px] tracking-wider text-(--text-tertiary) uppercase">TVL</span>
						</span>
					) : null}
					<span className="flex flex-wrap gap-x-3 gap-y-1">
						<ChangeChip value={preview.change1d} label="24h" />
						<ChangeChip value={preview.change7d} label="7d" />
						<ChangeChip value={preview.change30d} label="30d" />
					</span>
					{preview.chains && preview.chains.length > 0 ? (
						<span className="flex flex-wrap gap-1">
							{preview.chains.slice(0, 6).map((c) => (
								<span
									key={c}
									className="rounded border border-(--cards-border) px-1.5 py-px text-[9px] text-(--text-tertiary)"
								>
									{c}
								</span>
							))}
						</span>
					) : null}
				</span>
			)
		}
		case 'chain': {
			const tvl = fmtCompactUsd(preview.tvl)
			return (
				<span className="flex flex-col gap-2 px-3 pb-3">
					{tvl ? (
						<span className="flex items-baseline gap-2">
							<span className="text-2xl leading-none font-semibold text-(--text-primary) tabular-nums">{tvl}</span>
							<span className="text-[10px] tracking-wider text-(--text-tertiary) uppercase">TVL</span>
						</span>
					) : null}
					<span className="flex flex-wrap gap-x-3 gap-y-1">
						<ChangeChip value={preview.change1d} label="24h" />
						<ChangeChip value={preview.change7d} label="7d" />
					</span>
					{typeof preview.protocolCount === 'number' ? (
						<MetricRow label="Protocols" value={preview.protocolCount.toLocaleString()} />
					) : null}
				</span>
			)
		}
		case 'stablecoin': {
			const circ = fmtCompactUsd(preview.circulating)
			return (
				<span className="flex flex-col gap-2 px-3 pb-3">
					<span className="flex flex-wrap gap-1">
						{preview.pegType ? (
							<span className="rounded-full border border-(--cards-border) px-2 py-0.5 text-[10px] tracking-wider text-(--text-tertiary) uppercase">
								{preview.pegType}
							</span>
						) : null}
						{preview.pegMechanism ? (
							<span className="rounded-full border border-(--cards-border) px-2 py-0.5 text-[10px] tracking-wider text-(--text-tertiary) uppercase">
								{preview.pegMechanism}
							</span>
						) : null}
					</span>
					{circ ? (
						<span className="flex items-baseline gap-2">
							<span className="text-2xl leading-none font-semibold text-(--text-primary) tabular-nums">{circ}</span>
							<span className="text-[10px] tracking-wider text-(--text-tertiary) uppercase">Circulating</span>
						</span>
					) : null}
					<ChangeChip value={preview.change7d} label="7d" />
					{preview.topChains && preview.topChains.length > 0 ? (
						<span className="flex flex-col gap-0.5">
							<span className="text-[10px] tracking-wider text-(--text-tertiary) uppercase">Top chains</span>
							{preview.topChains.slice(0, 3).map((c) => (
								<MetricRow key={c.name} label={c.name} value={fmtCompactUsd(c.circulating)} />
							))}
						</span>
					) : null}
				</span>
			)
		}
		case 'category': {
			return (
				<span className="flex flex-col gap-2 px-3 pb-3">
					<span className="flex items-baseline gap-2">
						<span className="text-2xl leading-none font-semibold text-(--text-primary) tabular-nums">
							{fmtCompactUsd(preview.tvl) ?? '—'}
						</span>
						<span className="text-[10px] tracking-wider text-(--text-tertiary) uppercase">Total TVL</span>
					</span>
					{typeof preview.protocolCount === 'number' ? (
						<MetricRow label="Protocols" value={preview.protocolCount.toLocaleString()} />
					) : null}
					{preview.topProtocols && preview.topProtocols.length > 0 ? (
						<span className="mt-1 flex flex-col gap-1">
							<span className="text-[10px] tracking-wider text-(--text-tertiary) uppercase">Top protocols</span>
							{preview.topProtocols.map((p) => (
								<span key={p.slug} className="flex items-center gap-2">
									{p.logo ? <img src={p.logo} alt="" className="h-4 w-4 shrink-0 rounded-full" loading="lazy" /> : null}
									<span className="truncate text-xs text-(--text-secondary)">{p.name}</span>
									<span className="ml-auto text-[11px] text-(--text-tertiary) tabular-nums">
										{fmtCompactUsd(p.tvl)}
									</span>
								</span>
							))}
						</span>
					) : null}
				</span>
			)
		}
		case 'cex': {
			const tvl = fmtCompactUsd(preview.tvl)
			const clean = fmtCompactUsd(preview.cleanAssetsTvl)
			const cleanRatio =
				typeof preview.tvl === 'number' && typeof preview.cleanAssetsTvl === 'number' && preview.tvl > 0
					? Math.max(0, Math.min(1, preview.cleanAssetsTvl / preview.tvl))
					: null
			return (
				<span className="flex flex-col gap-2 px-3 pb-3">
					{tvl ? (
						<span className="flex items-baseline gap-2">
							<span className="text-2xl leading-none font-semibold text-(--text-primary) tabular-nums">{tvl}</span>
							<span className="text-[10px] tracking-wider text-(--text-tertiary) uppercase">Reserves</span>
						</span>
					) : null}
					{cleanRatio !== null ? (
						<span className="flex flex-col gap-1">
							<span className="flex items-baseline justify-between gap-2 text-[10px] tracking-wider text-(--text-tertiary) uppercase">
								<span>Clean assets {clean}</span>
								<span className="tabular-nums">{(cleanRatio * 100).toFixed(0)}%</span>
							</span>
							<span className="block h-1 overflow-hidden rounded bg-(--cards-border)">
								<span className="block h-full rounded bg-(--link-text)" style={{ width: `${cleanRatio * 100}%` }} />
							</span>
						</span>
					) : null}
					{preview.spotVolume != null ? (
						<MetricRow label="Spot 24h" value={fmtCompactUsd(preview.spotVolume) ?? '—'} />
					) : null}
					{preview.inflows1w != null ? (
						<MetricRow
							label="Net 1w"
							value={<span className={changeColor(preview.inflows1w)}>{fmtCompactUsd(preview.inflows1w)}</span>}
						/>
					) : null}
				</span>
			)
		}
		case 'bridge': {
			return (
				<span className="flex flex-col gap-2 px-3 pb-3">
					{preview.volume24h != null ? (
						<span className="flex items-baseline gap-2">
							<span className="text-2xl leading-none font-semibold text-(--text-primary) tabular-nums">
								{fmtCompactUsd(preview.volume24h) ?? '—'}
							</span>
							<span className="text-[10px] tracking-wider text-(--text-tertiary) uppercase">24h volume</span>
						</span>
					) : null}
					{preview.volume7d != null ? (
						<MetricRow label="7d volume" value={fmtCompactUsd(preview.volume7d) ?? '—'} />
					) : null}
					{preview.destinationChain ? <MetricRow label="Destination" value={preview.destinationChain} /> : null}
					{preview.chains && preview.chains.length > 0 ? (
						<span className="flex flex-wrap gap-1">
							{preview.chains.slice(0, 6).map((c) => (
								<span
									key={c}
									className="rounded border border-(--cards-border) px-1.5 py-px text-[9px] text-(--text-tertiary)"
								>
									{c}
								</span>
							))}
						</span>
					) : null}
				</span>
			)
		}
		case 'hack': {
			const dateLabel = preview.date
				? new Date(preview.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
				: null
			const lossLabel = fmtCompactUsd(preview.amount)
			const returnedLabel = fmtCompactUsd(preview.returnedFunds)
			const recoveredPct =
				typeof preview.amount === 'number' &&
				preview.amount > 0 &&
				typeof preview.returnedFunds === 'number' &&
				preview.returnedFunds > 0
					? Math.min(1, preview.returnedFunds / preview.amount)
					: null
			return (
				<span className="flex flex-col gap-2 px-3 pb-3">
					<span className="flex flex-wrap gap-1">
						{preview.classification ? (
							<span className="rounded-full border border-(--cards-border) px-2 py-0.5 text-[10px] tracking-wider text-(--text-tertiary) uppercase">
								{preview.classification}
							</span>
						) : null}
						{preview.bridgeHack ? (
							<span className="rounded-full border border-(--cards-border) px-2 py-0.5 text-[10px] tracking-wider text-(--text-tertiary) uppercase">
								Bridge
							</span>
						) : null}
					</span>
					{lossLabel ? (
						<span className="flex items-baseline gap-2">
							<span className="text-2xl leading-none font-semibold text-[#dc2626] tabular-nums">{lossLabel}</span>
							<span className="text-[10px] tracking-wider text-(--text-tertiary) uppercase">Lost</span>
						</span>
					) : null}
					{dateLabel ? <MetricRow label="Date" value={dateLabel} /> : null}
					{preview.technique ? <MetricRow label="Vector" value={preview.technique} /> : null}
					{preview.targetType ? <MetricRow label="Target" value={preview.targetType} /> : null}
					{returnedLabel && recoveredPct !== null ? (
						<MetricRow
							label="Recovered"
							value={
								<span className="text-[#16a34a]">
									{returnedLabel}
									<span className="ml-1 text-(--text-tertiary)">({(recoveredPct * 100).toFixed(0)}%)</span>
								</span>
							}
						/>
					) : null}
					{preview.chains && preview.chains.length > 0 ? (
						<span className="flex flex-wrap gap-1">
							{preview.chains.slice(0, 6).map((c) => (
								<span
									key={c}
									className="rounded border border-(--cards-border) px-1.5 py-px text-[9px] text-(--text-tertiary)"
								>
									{c}
								</span>
							))}
						</span>
					) : null}
				</span>
			)
		}
		case 'metric': {
			return (
				<span className="block px-3 pb-3 text-xs leading-relaxed text-(--text-secondary)">
					{preview.description ?? TYPE_HINT[entity.entityType]}
				</span>
			)
		}
		default:
			return null
	}
}

export function EntityPreviewLink({
	entity,
	children,
	snapshot
}: {
	entity: ArticleEntityRef
	children: ReactNode
	snapshot?: EntityPreview | null
}) {
	const logo = entityLogoUrl(entity)
	const typeLabel = TYPE_LABEL[entity.entityType] ?? entity.entityType.toUpperCase()
	const previewable = isPreviewableEntityType(entity.entityType)
	const [hovered, setHovered] = useState(false)

	const { data: liveData, isFetching } = useQuery({
		queryKey: ['article-entity-preview', entity.entityType, entity.slug],
		queryFn: ({ signal }) => fetchEntityPreview(entity.entityType, entity.slug, signal),
		enabled: previewable && hovered,
		staleTime: 1000 * 60 * 5,
		gcTime: 1000 * 60 * 30,
		refetchOnWindowFocus: false
	})

	const preview = liveData ?? snapshot ?? null
	const loading = previewable && hovered && isFetching && !preview

	return (
		<span
			className="article-entity-link group relative inline-block align-baseline"
			onMouseEnter={() => setHovered(true)}
			onFocus={() => setHovered(true)}
		>
			<a
				href={entity.route}
				className="inline-flex items-baseline gap-1 font-medium text-(--link-text) no-underline decoration-(--link-text)/30 underline-offset-[3px] hover:underline"
			>
				{logo ? (
					<img
						src={logo}
						alt=""
						height={14}
						width={14}
						className="relative top-[2px] inline-block h-3.5 w-3.5 shrink-0 rounded-full"
					/>
				) : null}
				{children}
			</a>
			<span
				role="tooltip"
				className="article-entity-popover invisible absolute bottom-full left-1/2 z-30 mb-2 w-80 -translate-x-1/2 translate-y-1 rounded-md border border-(--cards-border) bg-(--cards-bg) opacity-0 shadow-xl transition-all duration-150 group-focus-within:visible group-focus-within:translate-y-0 group-focus-within:opacity-100 group-hover:visible group-hover:translate-y-0 group-hover:opacity-100"
			>
				<span className="flex items-center gap-3 px-3 pt-3 pb-2">
					<span className="relative flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full border border-(--cards-border) bg-(--app-bg)">
						{logo ? (
							<img src={logo} alt="" height={36} width={36} className="h-full w-full object-cover" />
						) : (
							<span className="text-[10px] text-(--text-tertiary)">{entity.label.slice(0, 2).toUpperCase()}</span>
						)}
					</span>
					<span className="flex min-w-0 flex-col">
						<span className="truncate text-sm font-semibold text-(--text-primary)">{entity.label}</span>
						<span className="truncate text-xs text-(--text-tertiary)">{typeLabel}</span>
					</span>
				</span>
				<PreviewBody entity={entity} preview={preview} loading={loading} />
				<span className="flex items-center justify-between gap-2 border-t border-(--cards-border) px-3 py-2 text-xs">
					<span className="text-(--text-tertiary)">Open page</span>
					<span className="truncate text-(--link-text)">{entity.route}</span>
				</span>
			</span>
		</span>
	)
}
