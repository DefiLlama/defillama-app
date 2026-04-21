import { Icon } from '~/components/Icon'
import type { ChartConfig, ChartType } from '../chartConfig'
import { ColorPicker } from './ColorPicker'

interface SeriesChipProps {
	name: string
	paletteColor: string
	chartType: ChartType
	config: ChartConfig
	onChange: (patch: Partial<ChartConfig>) => void
	onRemove: () => void
	dualAxisEligible: boolean
	seriesKindEligible: boolean
}

export function SeriesChip({
	name,
	paletteColor,
	chartType,
	config,
	onChange,
	onRemove,
	dualAxisEligible,
	seriesKindEligible
}: SeriesChipProps) {
	const color = config.seriesColors[name]
	const isRight = config.rightAxisCols.includes(name)
	const kind = config.seriesKinds[name] ?? (chartType === 'bar' ? 'bar' : 'line')

	const setColor = (next: string | null) => {
		const { [name]: _omit, ...rest } = config.seriesColors
		onChange({ seriesColors: next == null ? rest : { ...rest, [name]: next } })
	}

	const toggleAxis = () => {
		onChange({
			rightAxisCols: isRight ? config.rightAxisCols.filter((n) => n !== name) : [...config.rightAxisCols, name]
		})
	}

	const toggleKind = () => {
		const { [name]: _omit, ...rest } = config.seriesKinds
		const next = kind === 'line' ? 'bar' : 'line'
		onChange({ seriesKinds: { ...rest, [name]: next } })
	}

	return (
		<div className="group flex items-center gap-1.5 rounded-md bg-(--link-hover-bg)/60 px-1.5 py-0.5">
			<ColorPicker value={color} fallback={paletteColor} onChange={setColor} />
			<span className="truncate font-mono text-[10.5px] text-(--text-primary)" style={{ maxWidth: '14ch' }}>
				{name}
			</span>
			{seriesKindEligible ? (
				<button
					type="button"
					onClick={toggleKind}
					aria-label={`Series ${name} type: ${kind}`}
					title={`Series type: ${kind}`}
					className="flex h-4 w-5 items-center justify-center rounded-sm border border-(--divider) bg-(--app-bg) text-[9px] font-mono text-(--text-secondary) hover:bg-(--link-hover-bg) hover:text-(--text-primary)"
				>
					{kind === 'line' ? '—' : '▮'}
				</button>
			) : null}
			{dualAxisEligible ? (
				<button
					type="button"
					onClick={toggleAxis}
					aria-label={`Axis: ${isRight ? 'right' : 'left'}`}
					title={`Axis: ${isRight ? 'right' : 'left'}`}
					className={`flex h-4 w-5 items-center justify-center rounded-sm border text-[9px] font-mono transition-colors ${
						isRight
							? 'border-(--primary) bg-(--primary) text-white'
							: 'border-(--divider) bg-(--app-bg) text-(--text-secondary) hover:bg-(--link-hover-bg) hover:text-(--text-primary)'
					}`}
				>
					{isRight ? 'R' : 'L'}
				</button>
			) : null}
			<button
				type="button"
				onClick={onRemove}
				aria-label={`Remove ${name}`}
				className="flex h-4 w-4 items-center justify-center rounded-sm text-(--text-tertiary) opacity-0 transition-opacity hover:bg-red-500/10 hover:text-red-500 group-hover:opacity-100 focus:opacity-100"
			>
				<Icon name="x" className="h-2.5 w-2.5" />
			</button>
		</div>
	)
}
