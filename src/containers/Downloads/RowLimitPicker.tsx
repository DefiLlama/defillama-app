import * as Ariakit from '@ariakit/react'
import { useEffect, useState } from 'react'
import { Icon } from '~/components/Icon'

const PRESETS = [50, 100, 500, 1000] as const

interface RowLimitPickerProps {
	value: number | null // null = no limit / show all rows
	totalRows: number // used to show "of N" in trigger + validate custom input
	onChange: (value: number | null) => void
	disabled?: boolean
}

export function RowLimitPicker({ value, totalRows, onChange, disabled }: RowLimitPickerProps) {
	const popover = Ariakit.usePopoverStore({ placement: 'bottom-start' })

	const [customInput, setCustomInput] = useState<string>(() =>
		value && !PRESETS.includes(value as (typeof PRESETS)[number]) ? String(value) : ''
	)
	const [error, setError] = useState<string | null>(null)

	useEffect(() => {
		if (value && !PRESETS.includes(value as (typeof PRESETS)[number])) {
			setCustomInput(String(value))
		} else {
			setCustomInput('')
		}
		setError(null)
	}, [value])

	const isActive = value !== null && value > 0

	const handlePresetClick = (n: number | null) => {
		onChange(n)
		popover.hide()
	}

	const handleClear = () => {
		onChange(null)
		popover.hide()
	}

	const triggerLabel = isActive && value ? `Top ${value.toLocaleString()}` : 'Row limit'

	const triggerClass = isActive
		? 'flex items-center gap-1.5 rounded-md rounded-r-none border border-(--primary)/40 bg-(--primary)/10 px-2.5 py-1.5 text-xs font-medium text-(--primary) transition-colors hover:bg-(--primary)/15 disabled:opacity-40'
		: 'flex items-center gap-1.5 rounded-md border border-(--divider) px-2.5 py-1.5 text-xs font-medium text-(--text-secondary) transition-colors hover:bg-(--link-hover-bg) hover:text-(--text-primary) disabled:opacity-40'

	return (
		<Ariakit.PopoverProvider store={popover}>
			<div className="inline-flex items-stretch">
				<Ariakit.PopoverDisclosure disabled={disabled} className={triggerClass}>
					<Icon name="layers" className="h-3.5 w-3.5" />
					<span className="truncate">{triggerLabel}</span>
					{isActive && totalRows > 0 ? (
						<span className="text-[10px] text-(--primary)/70">of {totalRows.toLocaleString()}</span>
					) : null}
					<Icon name="chevron-down" className="h-3 w-3" />
				</Ariakit.PopoverDisclosure>
				{isActive ? (
					<button
						type="button"
						onClick={handleClear}
						disabled={disabled}
						aria-label="Clear row limit"
						title="Clear row limit"
						className="-ml-px flex items-center justify-center rounded-md rounded-l-none border border-(--primary)/40 bg-(--primary)/10 px-1.5 text-(--primary) transition-colors hover:bg-(--primary)/20 disabled:opacity-40"
					>
						<Icon name="x" className="h-3 w-3" />
					</button>
				) : null}
			</div>

			<Ariakit.Popover
				gutter={6}
				portal
				unmountOnHide
				className="z-[60] flex w-[260px] max-w-[calc(100vw-2rem)] flex-col gap-3 rounded-lg border border-(--divider) bg-(--cards-bg) p-4 shadow-xl"
			>
				<section className="flex flex-col gap-2">
					<h3 className="text-[11px] font-semibold tracking-wide text-(--text-tertiary) uppercase">Top rows</h3>
					<div className="flex flex-wrap gap-1">
						{PRESETS.map((n) => {
							const isSelected = value === n
							return (
								<button
									key={n}
									type="button"
									onClick={() => handlePresetClick(n)}
									aria-pressed={isSelected}
									className={`rounded-md border px-2.5 py-1 text-xs font-medium transition-colors ${
										isSelected
											? 'border-(--primary) bg-(--primary) text-white'
											: 'border-(--divider) text-(--text-secondary) hover:bg-(--link-hover-bg) hover:text-(--text-primary)'
									}`}
								>
									{n.toLocaleString()}
								</button>
							)
						})}
						<button
							type="button"
							onClick={() => handlePresetClick(null)}
							aria-pressed={!isActive}
							className={`rounded-md border px-2.5 py-1 text-xs font-medium transition-colors ${
								!isActive
									? 'border-(--primary) bg-(--primary) text-white'
									: 'border-(--divider) text-(--text-secondary) hover:bg-(--link-hover-bg) hover:text-(--text-primary)'
							}`}
						>
							All
						</button>
					</div>
				</section>

				<div className="border-t border-(--divider)" />

				<form
					onSubmit={(e) => {
						e.preventDefault()
						const n = Number.parseInt(customInput, 10)
						if (!Number.isFinite(n) || n <= 0) {
							setError('Enter a positive number')
							return
						}
						setError(null)
						onChange(n)
						popover.hide()
					}}
					className="flex flex-col gap-2"
				>
					<h3 className="text-[11px] font-semibold tracking-wide text-(--text-tertiary) uppercase">Custom</h3>
					<div className="flex items-center gap-2">
						<input
							type="number"
							min={1}
							inputMode="numeric"
							value={customInput}
							onChange={(e) => {
								setCustomInput(e.currentTarget.value)
								setError(null)
							}}
							placeholder="e.g. 250"
							className="flex-1 rounded-md border border-(--divider) bg-transparent px-2 py-1 text-xs outline-none focus:border-(--primary) focus:ring-1 focus:ring-(--primary)/30"
						/>
						<button
							type="submit"
							disabled={!customInput}
							className="rounded-md bg-(--primary) px-2.5 py-1 text-xs font-medium text-white transition-colors hover:opacity-90 disabled:opacity-40"
						>
							Apply
						</button>
					</div>
					{error ? <p className="text-[11px] text-red-500">{error}</p> : null}
				</form>

				<p className="text-[11px] text-(--text-tertiary)">Applied after sort — top N by current sort order.</p>
			</Ariakit.Popover>
		</Ariakit.PopoverProvider>
	)
}
