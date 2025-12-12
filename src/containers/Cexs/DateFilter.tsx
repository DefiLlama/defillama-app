import { useState } from 'react'
import { useRouter } from 'next/router'
import * as Ariakit from '@ariakit/react'
import { Icon } from '~/components/Icon'
import { toNiceDayMonthAndYear, toNiceDayMonthAndYearAndTime } from '~/utils'

const formatDateForInput = (timestamp: number | null) => {
	if (!timestamp) return ''
	const date = new Date(timestamp)
	return date.toISOString().split('T')[0]
}

const getHourFromTimestamp = (timestamp: number | null) => {
	if (!timestamp) return '0'
	const date = new Date(timestamp)
	return date.getUTCHours().toString()
}

const getTodayString = () => {
	const today = new Date()
	return today.toISOString().split('T')[0]
}

const isAtMidnight = (timestamp: number | null) => {
	if (!timestamp) return true
	const date = new Date(timestamp)
	return date.getUTCHours() === 0 && date.getUTCMinutes() === 0 && date.getUTCSeconds() === 0
}

export const DateFilter = ({ startDate, endDate }) => {
	const router = useRouter()
	const [localStartDate, setLocalStartDate] = useState(formatDateForInput(startDate))
	const [localEndDate, setLocalEndDate] = useState(formatDateForInput(endDate))
	const [localStartHour, setLocalStartHour] = useState(getHourFromTimestamp(startDate))
	const [localEndHour, setLocalEndHour] = useState(getHourFromTimestamp(endDate))
	const maxDate = getTodayString()

	const handleStartDateChange = (e) => {
		const newStartDate = e.target.value
		setLocalStartDate(newStartDate)

		// If new start date is after current end date, reset end date
		if (newStartDate && localEndDate && newStartDate > localEndDate) {
			setLocalEndDate('')
			setLocalEndHour('0')
		}
	}

	const handleEndDateChange = (e) => {
		const newEndDate = e.target.value
		setLocalEndDate(newEndDate)

		// If new end date is before current start date, reset start date
		if (newEndDate && localStartDate && newEndDate < localStartDate) {
			setLocalStartDate('')
			setLocalStartHour('0')
		}
	}

	const handleStartHourChange = (e) => {
		setLocalStartHour(e.target.value)
	}

	const handleEndHourChange = (e) => {
		setLocalEndHour(e.target.value)
	}

	const handleReset = () => {
		setLocalStartDate('')
		setLocalEndDate('')
		setLocalStartHour('0')
		setLocalEndHour('0')
		router.push(
			{
				pathname: '/cexs'
			},
			undefined,
			{
				shallow: true
			}
		)
	}

	return (
		<Ariakit.PopoverProvider>
			<Ariakit.PopoverDisclosure className="relative flex cursor-pointer flex-nowrap items-center justify-between gap-2 rounded-md border border-(--form-control-border) px-2 py-1.5 text-xs font-medium text-(--text-form) hover:bg-(--link-hover-bg) focus-visible:bg-(--link-hover-bg)">
				<span>Custom Range Inflows</span>
				{startDate || endDate ? (
					<span className="text-(--link-text)">
						{' '}
						{isAtMidnight(startDate)
							? toNiceDayMonthAndYear(startDate / 1000)
							: toNiceDayMonthAndYearAndTime(startDate / 1000)}{' '}
						-{' '}
						{isAtMidnight(endDate)
							? toNiceDayMonthAndYear(endDate / 1000)
							: toNiceDayMonthAndYearAndTime(endDate / 1000)}
					</span>
				) : null}
				<Ariakit.PopoverDisclosureArrow className="h-3 w-3 shrink-0" />
			</Ariakit.PopoverDisclosure>
			<Ariakit.Popover
				unmountOnHide
				hideOnInteractOutside
				gutter={6}
				overflowPadding={16} // distance from the boundary edges
				wrapperProps={{
					className: 'max-sm:fixed! max-sm:bottom-0! max-sm:top-[unset]! max-sm:transform-none! max-sm:w-full!'
				}}
				className="max-sm:drawer z-10 flex min-w-[180px] flex-col overflow-auto overscroll-contain rounded-md border border-[hsl(204,20%,88%)] bg-(--bg-main) max-sm:h-[calc(100dvh-80px)] max-sm:rounded-b-none sm:max-h-[min(400px,60dvh)] lg:max-h-(--popover-available-height) dark:border-[hsl(204,3%,32%)]"
			>
				<Ariakit.PopoverDismiss className="ml-auto p-2 opacity-50 sm:hidden">
					<Icon name="x" className="h-5 w-5" />
				</Ariakit.PopoverDismiss>

				<div className="mx-auto w-full sm:w-[260px]">
					<form
						onSubmit={(e) => {
							e.preventDefault()
							const form = e.target as HTMLFormElement
							const startDate = form.startDate?.value
							const endDate = form.endDate?.value
							const startHour = parseInt(form.startHour?.value || '0')
							const endHour = parseInt(form.endHour?.value || '0')

							// Create timestamps in milliseconds
							const startTimestamp = new Date(`${startDate}T${startHour.toString().padStart(2, '0')}:00:00Z`).getTime()
							const endTimestamp = new Date(`${endDate}T${endHour.toString().padStart(2, '0')}:00:00Z`).getTime()

							router.push(
								{
									pathname: '/cexs',
									query: { startDate: startTimestamp, endDate: endTimestamp }
								},
								undefined,
								{
									shallow: true
								}
							)
						}}
						onReset={handleReset}
						className="flex flex-col gap-3 p-3"
					>
						<label className="flex flex-col gap-1">
							<span>Start Date</span>
							<input
								type="date"
								name="startDate"
								className="h-9 w-full rounded-md border border-(--form-control-border) bg-white px-3 py-1 text-black disabled:opacity-50 dark:bg-black dark:text-white dark:[color-scheme:dark]"
								value={localStartDate}
								max={maxDate}
								onChange={handleStartDateChange}
								required
							/>
						</label>
						<label className="flex flex-col gap-1">
							<span>Start Hour (optional)</span>
							<select
								name="startHour"
								className="h-9 w-full rounded-md border border-(--form-control-border) bg-white px-3 py-1 text-black disabled:opacity-50 dark:bg-black dark:text-white"
								value={localStartHour}
								onChange={handleStartHourChange}
							>
								{Array.from({ length: 24 }, (_, i) => (
									<option key={i} value={i}>
										{i.toString().padStart(2, '0')}:00
									</option>
								))}
							</select>
						</label>
						<label className="flex flex-col gap-1">
							<span>End Date</span>
							<input
								type="date"
								name="endDate"
								className="h-9 w-full rounded-md border border-(--form-control-border) bg-white px-3 py-1 text-black disabled:opacity-50 dark:bg-black dark:text-white dark:[color-scheme:dark]"
								value={localEndDate}
								max={maxDate}
								onChange={handleEndDateChange}
								required
							/>
						</label>
						<label className="flex flex-col gap-1">
							<span>End Hour (optional)</span>
							<select
								name="endHour"
								className="h-9 w-full rounded-md border border-(--form-control-border) bg-white px-3 py-1 text-black disabled:opacity-50 dark:bg-black dark:text-white"
								value={localEndHour}
								onChange={handleEndHourChange}
							>
								{Array.from({ length: 24 }, (_, i) => (
									<option key={i} value={i}>
										{i.toString().padStart(2, '0')}:00
									</option>
								))}
							</select>
						</label>
						<div className="mt-3 flex flex-col-reverse gap-2 sm:flex-row">
							<button
								type="reset"
								className="inline-flex h-9 w-full items-center justify-center rounded-md bg-black/5 px-4 text-sm font-medium whitespace-nowrap transition-colors hover:bg-black/10 disabled:opacity-50 dark:bg-white/10 dark:text-white dark:hover:bg-white/20 dark:focus-visible:bg-white/20"
							>
								Clear
							</button>
							<button
								type="submit"
								disabled={!localStartDate || !localEndDate}
								className="inline-flex h-9 w-full items-center justify-center rounded-md bg-(--link-active-bg) px-4 text-sm font-medium whitespace-nowrap text-white disabled:opacity-50"
							>
								Apply Filter
							</button>
						</div>
					</form>
				</div>
			</Ariakit.Popover>
		</Ariakit.PopoverProvider>
	)
}
