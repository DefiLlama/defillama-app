import * as Ariakit from '@ariakit/react'
import { Icon } from '~/components/Icon'
import { CHART_COLORS } from '~/constants/colors'
import { canUseChartType, type ChartConfig, type ChartType, type NumberFormat, type StackMode } from '../chartConfig'
import type { ClassifiedColumn } from '../columnKind'
import { ChartTypePicker } from './ChartTypePicker'
import { SeriesChip } from './SeriesChip'

interface ChartToolbarProps {
	config: ChartConfig
	classified: ClassifiedColumn[]
	onChange: (patch: Partial<ChartConfig>) => void
}

const FORMAT_OPTIONS: Array<{ value: NumberFormat; label: string }> = [
	{ value: 'auto', label: 'auto' },
	{ value: 'humanized', label: '3.4M' },
	{ value: 'currency', label: '$' },
	{ value: 'percent', label: '%' }
]

const STACK_OPTIONS: Array<{ value: StackMode; label: string }> = [
	{ value: 'off', label: 'off' },
	{ value: 'stacked', label: 'stack' },
	{ value: 'expand', label: '100%' }
]

const TYPES_SUPPORTING_STACK: ChartType[] = ['bar', 'hbar', 'area', 'areaStacked', 'areaPct']
const TYPES_SUPPORTING_SPLIT: ChartType[] = ['line', 'area', 'areaStacked', 'areaPct', 'bar', 'hbar']

export function ChartToolbar({ config, classified, onChange }: ChartToolbarProps) {
	const xOptions = classified.filter(
		(c) => c.coarse !== 'number' || classified.every((o) => o.coarse !== 'date' && o.coarse !== 'category')
	)
	const yOptions = classified.filter((c) => c.coarse === 'number')
	const categoryOptions = classified.filter((c) => c.coarse === 'category' && c.name !== config.xCol)

	const canStack = TYPES_SUPPORTING_STACK.includes(config.chartType) && config.yCols.length >= 2
	const canSplit =
		TYPES_SUPPORTING_SPLIT.includes(config.chartType) && categoryOptions.length > 0 && config.yCols.length <= 1

	const handleChartType = (next: ChartType) => {
		if (!canUseChartType(next, classified)) return
		onChange({ chartType: next })
	}

	const handleXCol = (next: string) => {
		if (next === config.xCol) return
		onChange({ xCol: next, yCols: config.yCols.filter((y) => y !== next) })
	}

	const handleYToggle = (name: string) => {
		const isSelected = config.yCols.includes(name)
		const nextYCols = isSelected ? config.yCols.filter((y) => y !== name) : [...config.yCols, name]
		onChange({ yCols: nextYCols.slice(0, 8) })
	}

	const handleSplitBy = (next: string | null) => {
		onChange({ splitByCol: next })
	}

	return (
		<div className="flex flex-col gap-2">
			<div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
				<ChartTypePicker value={config.chartType} onChange={handleChartType} classified={classified} />
				<div className="ml-auto flex items-center gap-2">
					<SegmentedControl
						aria-label="Number format"
						options={FORMAT_OPTIONS}
						value={config.numberFormat}
						onChange={(v) => onChange({ numberFormat: v })}
					/>
				</div>
			</div>

			<div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-(--text-secondary)">
				<PickerChip
					label="x"
					value={config.xCol}
					hint={
						config.xCol
							? classified.find((c) => c.name === config.xCol)?.coarse === 'date'
								? 'time'
								: classified.find((c) => c.name === config.xCol)?.coarse === 'number'
									? 'numeric'
									: 'category'
							: undefined
					}
					onChange={handleXCol}
					options={xOptions.map((c) => c.name)}
				/>

				<YSeriesPicker
					yCols={config.yCols}
					available={yOptions.map((c) => c.name).filter((n) => n !== config.xCol)}
					onToggle={handleYToggle}
					splitByActive={!!config.splitByCol}
					config={config}
					onChange={onChange}
				/>

				{canSplit ? (
					<PickerChip
						label="split by"
						value={config.splitByCol}
						onChange={(next) => handleSplitBy(next === '∅' ? null : next)}
						options={['∅', ...categoryOptions.map((c) => c.name)]}
						optionLabel={(v) => (v === '∅' ? 'none' : v)}
					/>
				) : null}

				{canStack ? (
					<SegmentedControl
						aria-label="Stack mode"
						options={STACK_OPTIONS}
						value={config.stackMode}
						onChange={(v) => onChange({ stackMode: v })}
					/>
				) : null}

				<span className="ml-auto text-[11px] text-(--text-tertiary)">{seriesSummary(config)}</span>
			</div>
		</div>
	)
}

function seriesSummary(config: ChartConfig): string {
	if (config.splitByCol) return `${config.yCols[0] ?? ''} by ${config.splitByCol}`
	if (config.yCols.length === 0) return 'pick a series'
	if (config.yCols.length === 1) return config.yCols[0]
	return `${config.yCols.length} series`
}

function SegmentedControl<T extends string>({
	options,
	value,
	onChange,
	'aria-label': ariaLabel
}: {
	options: Array<{ value: T; label: string }>
	value: T
	onChange: (next: T) => void
	'aria-label': string
}) {
	return (
		<div
			role="radiogroup"
			aria-label={ariaLabel}
			className="inline-flex items-center gap-0.5 rounded-md border border-(--divider) bg-(--app-bg)/50 p-0.5"
		>
			{options.map((opt) => {
				const active = value === opt.value
				return (
					<button
						key={opt.value}
						type="button"
						role="radio"
						aria-checked={active}
						onClick={() => onChange(opt.value)}
						className={`rounded-[3px] px-2 py-1 font-mono text-[10.5px] transition-colors ${
							active
								? 'bg-(--primary) text-white'
								: 'text-(--text-secondary) hover:bg-(--link-hover-bg) hover:text-(--text-primary)'
						}`}
					>
						{opt.label}
					</button>
				)
			})}
		</div>
	)
}

function PickerChip({
	label,
	value,
	hint,
	onChange,
	options,
	optionLabel
}: {
	label: string
	value: string | null
	hint?: string
	onChange: (next: string) => void
	options: string[]
	optionLabel?: (v: string) => string
}) {
	return (
		<div className="flex items-center gap-1.5">
			<span className="text-(--text-tertiary)">{label}</span>
			<Ariakit.MenuProvider>
				<Ariakit.MenuButton
					aria-label={label}
					className="inline-flex max-w-[200px] items-center gap-1 rounded-md border border-(--divider) bg-(--bg-primary) px-2 py-1 font-mono text-[11px] text-(--text-primary) hover:bg-(--link-hover-bg)"
				>
					<span className="truncate">{value == null ? '—' : optionLabel ? optionLabel(value) : value}</span>
					<Icon name="chevron-down" className="h-3 w-3 shrink-0" />
				</Ariakit.MenuButton>
				<Ariakit.Menu
					gutter={4}
					className="z-50 max-h-64 overflow-auto rounded-md border border-(--divider) bg-(--cards-bg) p-1 shadow-lg"
				>
					{options.length === 0 ? (
						<div className="px-2 py-1 text-[11px] text-(--text-tertiary)">No options</div>
					) : (
						options.map((opt) => (
							<Ariakit.MenuItem
								key={opt}
								onClick={() => onChange(opt)}
								className={`flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1 font-mono text-[11px] text-(--text-primary) hover:bg-(--link-hover-bg) ${
									opt === value ? 'bg-(--link-hover-bg)' : ''
								}`}
							>
								<span className="truncate">{optionLabel ? optionLabel(opt) : opt}</span>
							</Ariakit.MenuItem>
						))
					)}
				</Ariakit.Menu>
			</Ariakit.MenuProvider>
			{hint ? <span className="text-[10px] text-(--text-tertiary)">{hint}</span> : null}
		</div>
	)
}

const DUAL_AXIS_TYPES: ChartType[] = ['line', 'bar', 'area', 'areaStacked']
const KIND_EDIT_TYPES: ChartType[] = ['line', 'bar']

function YSeriesPicker({
	yCols,
	available,
	onToggle,
	splitByActive,
	config,
	onChange
}: {
	yCols: string[]
	available: string[]
	onToggle: (name: string) => void
	splitByActive: boolean
	config: ChartConfig
	onChange: (patch: Partial<ChartConfig>) => void
}) {
	const label = splitByActive
		? 'split series'
		: yCols.length === 0
			? 'none'
			: yCols.length === 1
				? yCols[0]
				: `${yCols.length} series`

	const dualAxisEligible = DUAL_AXIS_TYPES.includes(config.chartType) && yCols.length >= 2
	const seriesKindEligible = KIND_EDIT_TYPES.includes(config.chartType)

	return (
		<div className="flex items-center gap-1.5">
			<span className="text-(--text-tertiary)">y</span>
			<Ariakit.MenuProvider>
				<Ariakit.MenuButton
					aria-label="Y series"
					disabled={splitByActive}
					className="inline-flex max-w-[240px] items-center gap-1 rounded-md border border-(--divider) bg-(--bg-primary) px-2 py-1 font-mono text-[11px] text-(--text-primary) hover:bg-(--link-hover-bg) disabled:cursor-not-allowed disabled:opacity-60"
				>
					<span className="truncate">{label}</span>
					<Icon name="chevron-down" className="h-3 w-3 shrink-0" />
				</Ariakit.MenuButton>
				<Ariakit.Menu
					gutter={4}
					className="z-50 flex max-h-[60vh] w-[280px] flex-col gap-1 overflow-auto rounded-md border border-(--divider) bg-(--cards-bg) p-2 shadow-lg"
				>
					{yCols.length > 0 ? (
						<div className="flex flex-col gap-1">
							<span className="px-1 text-[10px] font-semibold tracking-wide text-(--text-tertiary) uppercase">
								selected
							</span>
							{yCols.map((name, i) => (
								<SeriesChip
									key={name}
									name={name}
									paletteColor={config.seriesColors[name] ?? CHART_COLORS[i % CHART_COLORS.length]}
									chartType={config.chartType}
									config={config}
									onChange={onChange}
									onRemove={() => onToggle(name)}
									dualAxisEligible={dualAxisEligible}
									seriesKindEligible={seriesKindEligible}
								/>
							))}
							<span className="my-1 h-px bg-(--divider)" aria-hidden />
						</div>
					) : null}

					<span className="px-1 text-[10px] font-semibold tracking-wide text-(--text-tertiary) uppercase">add</span>
					{available.filter((n) => !yCols.includes(n)).length === 0 ? (
						<div className="px-2 py-1 text-[11px] text-(--text-tertiary)">No more numeric columns</div>
					) : (
						available
							.filter((n) => !yCols.includes(n))
							.map((name) => (
								<Ariakit.MenuItem
									key={name}
									hideOnClick={false}
									onClick={() => onToggle(name)}
									className="flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1 font-mono text-[11px] text-(--text-primary) hover:bg-(--link-hover-bg)"
								>
									<Icon name="plus" className="h-3 w-3 text-(--text-tertiary)" />
									<span className="truncate">{name}</span>
								</Ariakit.MenuItem>
							))
					)}
				</Ariakit.Menu>
			</Ariakit.MenuProvider>
		</div>
	)
}
