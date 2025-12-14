import { useState } from 'react'
import * as Ariakit from '@ariakit/react'
import dayjs from 'dayjs'
import { Icon } from '~/components/Icon'
import { CustomTimePeriod } from '../ProDashboardAPIContext'

interface CustomTimePeriodPickerProps {
	isActive: boolean
	customPeriod: CustomTimePeriod | null
	onApply: (period: CustomTimePeriod) => void
	onClear: () => void
	disabled?: boolean
}

function formatCompactLabel(customPeriod: CustomTimePeriod | null): string {
	if (!customPeriod) return 'Custom'

	if (customPeriod.type === 'relative' && customPeriod.relativeDays) {
		return `${customPeriod.relativeDays}d`
	}

	if (customPeriod.type === 'absolute' && customPeriod.startDate && customPeriod.endDate) {
		const start = dayjs.unix(customPeriod.startDate)
		const end = dayjs.unix(customPeriod.endDate)
		const startYear = start.year()
		const endYear = end.year()
		const currentYear = dayjs().year()

		if (startYear === endYear) {
			if (startYear === currentYear) {
				return `${start.format('MMM')}-${end.format('MMM')}`
			}
			return `${start.format('MMM')}-${end.format('MMM')}'${String(startYear).slice(-2)}`
		}
		return `${start.format('MMM')}'${String(startYear).slice(-2)}-${end.format('MMM')}'${String(endYear).slice(-2)}`
	}

	return 'Custom'
}

export function CustomTimePeriodPicker({
	isActive,
	customPeriod,
	onApply,
	onClear,
	disabled
}: CustomTimePeriodPickerProps) {
	const popover = Ariakit.usePopoverStore({ placement: 'bottom-end' })
	const [mode, setMode] = useState<'relative' | 'absolute'>(customPeriod?.type || 'relative')
	const [relativeDays, setRelativeDays] = useState<string>(
		customPeriod?.type === 'relative' && customPeriod.relativeDays ? String(customPeriod.relativeDays) : '45'
	)
	const [startDate, setStartDate] = useState<string>(
		customPeriod?.type === 'absolute' && customPeriod.startDate
			? dayjs.unix(customPeriod.startDate).format('YYYY-MM-DD')
			: dayjs().subtract(90, 'day').format('YYYY-MM-DD')
	)
	const [endDate, setEndDate] = useState<string>(
		customPeriod?.type === 'absolute' && customPeriod.endDate
			? dayjs.unix(customPeriod.endDate).format('YYYY-MM-DD')
			: dayjs().format('YYYY-MM-DD')
	)

	const today = dayjs().format('YYYY-MM-DD')

	const handleApply = () => {
		if (mode === 'relative') {
			const days = parseInt(relativeDays, 10)
			if (days && days > 0) {
				onApply({ type: 'relative', relativeDays: days })
				popover.hide()
			}
		} else {
			const start = dayjs(startDate)
			const end = dayjs(endDate)
			if (start.isValid() && end.isValid() && start.isBefore(end)) {
				onApply({
					type: 'absolute',
					startDate: start.unix(),
					endDate: end.endOf('day').unix()
				})
				popover.hide()
			}
		}
	}

	const handleClear = () => {
		onClear()
		popover.hide()
	}

	const isValidRelative = parseInt(relativeDays, 10) > 0
	const isValidAbsolute =
		dayjs(startDate).isValid() && dayjs(endDate).isValid() && dayjs(startDate).isBefore(dayjs(endDate))
	const canApply = mode === 'relative' ? isValidRelative : isValidAbsolute

	return (
		<Ariakit.PopoverProvider store={popover}>
			<Ariakit.PopoverDisclosure
				className={`-ml-px flex-1 rounded-none rounded-r-md border px-3 py-1.5 text-sm font-medium transition-colors duration-200 md:flex-initial md:px-4 md:py-2 ${
					isActive ? 'pro-border pro-btn-blue' : 'pro-border pro-text2 hover:pro-text1 pro-hover-bg'
				} ${disabled ? 'cursor-not-allowed opacity-50' : ''}`}
				disabled={disabled}
			>
				<span className="flex items-center gap-1">
					{isActive ? formatCompactLabel(customPeriod) : 'Custom'}
					<Icon name="chevron-down" height={14} width={14} />
				</span>
			</Ariakit.PopoverDisclosure>

			<Ariakit.Popover
				gutter={8}
				className="z-50 rounded-lg border border-(--cards-border) bg-(--cards-bg) p-4 shadow-lg"
				style={{ minWidth: '300px' }}
			>
				<div className="flex flex-col gap-4">
					<div className="flex gap-2">
						<button
							onClick={() => setMode('relative')}
							className={`flex-1 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
								mode === 'relative'
									? 'bg-(--primary) text-white'
									: 'pro-border border bg-(--bg-input) text-(--text-secondary) hover:bg-(--cards-hover)'
							}`}
						>
							Relative
						</button>
						<button
							onClick={() => setMode('absolute')}
							className={`flex-1 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
								mode === 'absolute'
									? 'bg-(--primary) text-white'
									: 'pro-border border bg-(--bg-input) text-(--text-secondary) hover:bg-(--cards-hover)'
							}`}
						>
							Absolute
						</button>
					</div>

					{mode === 'relative' ? (
						<div className="flex flex-col gap-2">
							<label className="text-sm font-medium text-(--text-label)">Days ago</label>
							<div className="flex items-center gap-2">
								<input
									type="text"
									inputMode="numeric"
									value={relativeDays}
									onChange={(e) => {
										const value = e.target.value
										if (value === '' || /^\d+$/.test(value)) {
											setRelativeDays(value)
										}
									}}
									className={`pro-border flex-1 rounded-md border bg-(--bg-input) px-3 py-2 text-sm focus:outline-hidden focus:ring-1 focus:ring-(--primary) ${
										relativeDays && !isValidRelative ? 'border-red-500' : ''
									}`}
									placeholder="Enter days"
								/>
								<span className="text-sm text-(--text-secondary)">days ago → Now</span>
							</div>
							{relativeDays && !isValidRelative && (
								<span className="text-xs text-red-500">Please enter a valid number greater than 0</span>
							)}
						</div>
					) : (
						<div className="flex flex-col gap-3">
							<div className="flex flex-col gap-2">
								<label className="text-sm font-medium text-(--text-label)">From</label>
								<input
									type="date"
									value={startDate}
									max={today}
									onChange={(e) => setStartDate(e.target.value)}
									className="pro-border rounded-md border bg-(--bg-input) px-3 py-2 text-sm focus:outline-hidden focus:ring-1 focus:ring-(--primary)"
								/>
							</div>
							<div className="flex flex-col gap-2">
								<label className="text-sm font-medium text-(--text-label)">To</label>
								<input
									type="date"
									value={endDate}
									max={today}
									onChange={(e) => setEndDate(e.target.value)}
									className="pro-border rounded-md border bg-(--bg-input) px-3 py-2 text-sm focus:outline-hidden focus:ring-1 focus:ring-(--primary)"
								/>
							</div>
						</div>
					)}

					<div className="flex gap-2 pt-2 border-t border-(--cards-border)">
						<button
							onClick={handleClear}
							className="pro-border pro-text2 hover:pro-text1 pro-hover-bg flex-1 rounded-md border px-3 py-2 text-sm font-medium transition-colors"
						>
							Clear
						</button>
						<button
							onClick={handleApply}
							disabled={!canApply}
							className="pro-btn-blue flex-1 rounded-md px-3 py-2 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50"
						>
							Apply
						</button>
					</div>
				</div>
			</Ariakit.Popover>
		</Ariakit.PopoverProvider>
	)
}
