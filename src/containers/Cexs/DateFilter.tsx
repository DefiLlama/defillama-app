import DatePicker from 'react-datepicker'
import { Icon } from '~/components/Icon'

export const formatDate = (date) =>
	new Intl.DateTimeFormat('en-US', {
		year: '2-digit',
		month: '2-digit',
		day: '2-digit'
	}).format(date)

export const DateFilter = ({ startDate, endDate, onStartChange, onEndChange, hours, setHours }) => {
	const [startHour, endHour] = hours

	return (
		<div className="flex items-center gap-2 relative">
			<label>From</label>
			<div className="flex items-center gap-1">
				<div className="relative">
					<Icon
						name="calendar"
						width={16}
						height={16}
						className="absolute text-[var(--text3)] top-0 bottom-0 my-auto left-2"
					/>
					<input
						value={startDate && `${formatDate(startDate)}`}
						onClick={() => onStartChange(null)}
						className="border border-black/10 dark:border-white/10 w-full p-2 pl-7 bg-white dark:bg-black text-black dark:text-white rounded-md text-sm max-w-[120px]"
					/>
				</div>
				<div style={{ position: 'absolute', zIndex: 100, top: 0, display: startDate ? 'none' : 'block' }}>
					{/* @ts-ignore */}
					<DatePicker
						showIcon
						onChange={onStartChange}
						onCalendarOpen={() => onStartChange(null)}
						selected={startDate}
						inline
						shouldCloseOnSelect={true}
					/>
				</div>
				<label className="flex items-center gap-1">
					<input
						value={startHour}
						onChange={(e) => setHours([e.target?.value, endHour])}
						className="p-2 rounded-md bg-white dark:bg-black text-black dark:text-white border border-black/10 dark:border-white/10 w-10"
					/>
					<span>h</span>
				</label>
			</div>
			<label>to</label>
			<div className="flex items-center gap-1">
				<div className="relative">
					<Icon
						name="calendar"
						width={16}
						height={16}
						className="absolute text-[var(--text3)] top-0 bottom-0 my-auto left-2"
					/>
					<input
						value={endDate && `${formatDate(endDate)}`}
						onClick={() => onEndChange(null)}
						className="border border-black/10 dark:border-white/10 w-full p-2 pl-7 bg-white dark:bg-black text-black dark:text-white rounded-md text-sm max-w-[120px]"
					/>
				</div>
				<div style={{ position: 'absolute', top: 0, zIndex: 100, display: endDate ? 'none' : 'block' }}>
					{/* @ts-ignore */}
					<DatePicker
						showIcon
						onChange={onEndChange}
						onCalendarOpen={() => onEndChange(null)}
						selected={endDate}
						inline
						shouldCloseOnSelect={true}
					/>
				</div>
				<label className="flex items-center gap-1">
					<input
						value={endHour}
						onChange={(e) => setHours([startHour, e.target?.value])}
						className="p-2 rounded-md bg-white dark:bg-black text-black dark:text-white border border-black/10 dark:border-white/10 w-10"
					/>
					<span>h</span>
				</label>
			</div>
		</div>
	)
}
