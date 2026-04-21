import type { ReactNode } from 'react'
import type { ClassifiedColumn } from '../columnKind'
import { canUseChartType, type ChartType } from '../chartConfig'

interface ChartTypeOption {
	type: ChartType
	label: string
	icon: ReactNode
}

const STROKE = 'currentColor'
const iconProps = {
	width: 14,
	height: 14,
	viewBox: '0 0 16 16',
	fill: 'none',
	stroke: STROKE,
	strokeWidth: 1.4,
	strokeLinecap: 'round' as const,
	strokeLinejoin: 'round' as const
}

const ICONS = {
	line: (
		<svg {...iconProps}>
			<polyline points="1.5,11 5,6 8.5,8.5 14.5,3" />
		</svg>
	),
	area: (
		<svg {...iconProps}>
			<polyline points="1.5,11 5,6 8.5,8.5 14.5,3" />
			<path d="M1.5 11 L1.5 14 L14.5 14 L14.5 3" opacity="0.35" fill={STROKE} stroke="none" />
		</svg>
	),
	areaStacked: (
		<svg {...iconProps}>
			<path d="M1.5 13 L5 9 L8.5 11 L14.5 6 L14.5 14 L1.5 14 Z" opacity="0.45" fill={STROKE} stroke="none" />
			<path d="M1.5 9 L5 5 L8.5 7 L14.5 3 L14.5 6 L8.5 11 L5 9 L1.5 13 Z" opacity="0.2" fill={STROKE} stroke="none" />
		</svg>
	),
	areaPct: (
		<svg {...iconProps}>
			<rect x="1.5" y="3" width="13" height="11" rx="0.5" />
			<line x1="1.5" y1="8" x2="14.5" y2="7" />
			<line x1="1.5" y1="11" x2="14.5" y2="11" />
		</svg>
	),
	bar: (
		<svg {...iconProps}>
			<line x1="3" y1="14" x2="3" y2="10" />
			<line x1="6.5" y1="14" x2="6.5" y2="5" />
			<line x1="10" y1="14" x2="10" y2="8" />
			<line x1="13.5" y1="14" x2="13.5" y2="3" />
		</svg>
	),
	hbar: (
		<svg {...iconProps}>
			<line x1="2" y1="3" x2="14" y2="3" />
			<line x1="2" y1="6.5" x2="10" y2="6.5" />
			<line x1="2" y1="10" x2="12" y2="10" />
			<line x1="2" y1="13.5" x2="8" y2="13.5" />
		</svg>
	),
	pie: (
		<svg {...iconProps}>
			<circle cx="8" cy="8" r="5.8" />
			<path d="M8 2.2 L8 8 L13.8 8" />
		</svg>
	),
	donut: (
		<svg {...iconProps}>
			<circle cx="8" cy="8" r="5.8" />
			<circle cx="8" cy="8" r="2.4" />
		</svg>
	),
	scatter: (
		<svg {...iconProps}>
			<circle cx="3.5" cy="11.5" r="1.1" fill={STROKE} />
			<circle cx="6.5" cy="8" r="1.1" fill={STROKE} />
			<circle cx="9.5" cy="10" r="1.1" fill={STROKE} />
			<circle cx="12" cy="5" r="1.1" fill={STROKE} />
			<circle cx="4.5" cy="4.5" r="1.1" fill={STROKE} />
		</svg>
	),
	bubble: (
		<svg {...iconProps}>
			<circle cx="4.5" cy="10.5" r="1.6" fill={STROKE} opacity="0.85" />
			<circle cx="9" cy="6.5" r="2.6" fill={STROKE} opacity="0.55" />
			<circle cx="12.2" cy="11.2" r="1.1" fill={STROKE} opacity="0.9" />
		</svg>
	),
	histogram: (
		<svg {...iconProps}>
			<line x1="2.5" y1="14" x2="2.5" y2="11" />
			<line x1="4.7" y1="14" x2="4.7" y2="9" />
			<line x1="6.9" y1="14" x2="6.9" y2="5" />
			<line x1="9.1" y1="14" x2="9.1" y2="3" />
			<line x1="11.3" y1="14" x2="11.3" y2="7" />
			<line x1="13.5" y1="14" x2="13.5" y2="11" />
		</svg>
	),
	treemap: (
		<svg {...iconProps}>
			<rect x="1.5" y="1.5" width="7.5" height="9.5" />
			<rect x="9" y="1.5" width="5.5" height="5.5" />
			<rect x="9" y="7" width="5.5" height="4" />
			<rect x="1.5" y="11" width="5" height="3.5" />
			<rect x="6.5" y="11" width="8" height="3.5" />
		</svg>
	),
	candlestick: (
		<svg {...iconProps}>
			<line x1="3" y1="3" x2="3" y2="13" />
			<rect x="2" y="5" width="2" height="5" fill={STROKE} stroke="none" />
			<line x1="7" y1="5" x2="7" y2="14" />
			<rect x="6" y="7" width="2" height="4" />
			<line x1="11" y1="2" x2="11" y2="12" />
			<rect x="10" y="4" width="2" height="5" fill={STROKE} stroke="none" />
			<line x1="14" y1="6" x2="14" y2="14" />
			<rect x="13" y="9" width="2" height="3" />
		</svg>
	)
} as const

const GROUPS: Array<{ key: string; options: ChartTypeOption[] }> = [
	{
		key: 'time',
		options: [
			{ type: 'line', label: 'Line', icon: ICONS.line },
			{ type: 'area', label: 'Area', icon: ICONS.area },
			{ type: 'areaStacked', label: 'Stacked area', icon: ICONS.areaStacked },
			{ type: 'areaPct', label: '100% area', icon: ICONS.areaPct },
			{ type: 'bar', label: 'Bar', icon: ICONS.bar }
		]
	},
	{
		key: 'categorical',
		options: [
			{ type: 'hbar', label: 'Horizontal bar', icon: ICONS.hbar },
			{ type: 'pie', label: 'Pie', icon: ICONS.pie },
			{ type: 'donut', label: 'Donut', icon: ICONS.donut }
		]
	},
	{
		key: 'distribution',
		options: [
			{ type: 'scatter', label: 'Scatter', icon: ICONS.scatter },
			{ type: 'bubble', label: 'Bubble', icon: ICONS.bubble },
			{ type: 'histogram', label: 'Histogram', icon: ICONS.histogram }
		]
	},
	{
		key: 'hierarchy',
		options: [{ type: 'treemap', label: 'Treemap', icon: ICONS.treemap }]
	},
	{
		key: 'finance',
		options: [{ type: 'candlestick', label: 'Candlestick', icon: ICONS.candlestick }]
	}
]

interface ChartTypePickerProps {
	value: ChartType
	onChange: (next: ChartType) => void
	classified: ClassifiedColumn[]
}

export function ChartTypePicker({ value, onChange, classified }: ChartTypePickerProps) {
	return (
		<div
			role="radiogroup"
			aria-label="Chart type"
			className="inline-flex flex-wrap items-center gap-x-3 gap-y-1 rounded-md border border-(--divider) bg-(--app-bg)/50 p-0.5"
		>
			{GROUPS.map((group, groupIndex) => (
				<div key={group.key} className="flex items-center gap-0.5">
					{group.options.map((opt) => {
						const active = value === opt.type
						const available = canUseChartType(opt.type, classified)
						return (
							<button
								key={opt.type}
								type="button"
								role="radio"
								aria-checked={active}
								aria-label={opt.label}
								title={available ? opt.label : `${opt.label} (not compatible with current columns)`}
								disabled={!available}
								onClick={() => onChange(opt.type)}
								className={`relative flex h-6 w-7 items-center justify-center rounded-[4px] transition-colors ${
									active
										? 'bg-(--primary) text-white shadow-sm'
										: available
											? 'text-(--text-secondary) hover:bg-(--link-hover-bg) hover:text-(--text-primary)'
											: 'text-(--text-tertiary)/50 cursor-not-allowed'
								}`}
							>
								{opt.icon}
							</button>
						)
					})}
					{groupIndex < GROUPS.length - 1 ? <span aria-hidden className="mx-0.5 h-4 w-px bg-(--divider)" /> : null}
				</div>
			))}
		</div>
	)
}
