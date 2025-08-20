export const DateFilter = ({ startDate, endDate, onStartChange, onEndChange, hours, setHours, dateError }) => {
	const [startHour, endHour] = hours

	const isSameDate = startDate === endDate
	const startHourNum = Number(startHour || 0)
	const endHourNum = Number(endHour || 0)

	return (
		<div className="flex flex-wrap items-center gap-y-2">
			<div className="flex items-center gap-2 text-sm">
				<span className="w-12 text-right">From</span>
				<input
					type="date"
					value={startDate}
					onChange={(e) => onStartChange(e.target.value)}
					className="rounded border border-(--form-control-border) bg-white px-2 py-1 text-sm text-black dark:bg-black dark:text-white"
				/>
				<input
					type="number"
					min="0"
					max={isSameDate ? endHourNum : 23}
					value={startHour}
					onChange={(e) => setHours([e.target.value, endHour])}
					className="w-16 rounded border border-(--form-control-border) bg-white px-2 py-1 text-sm text-black dark:bg-black dark:text-white"
				/>
				<span>h</span>
			</div>

			<div className="flex items-center gap-2 text-sm">
				<span className="w-12 text-right">to</span>
				<input
					type="date"
					value={endDate}
					onChange={(e) => onEndChange(e.target.value)}
					min={startDate}
					className={`rounded bg-white px-2 py-1 text-sm text-black dark:bg-black dark:text-white ${
						dateError ? 'border-2 border-red-500' : 'border border-(--form-control-border)'
					}`}
				/>
				<input
					type="number"
					min={isSameDate ? startHourNum : 0}
					max="23"
					value={endHour}
					onChange={(e) => setHours([startHour, e.target.value])}
					className="w-16 rounded border border-(--form-control-border) bg-white px-2 py-1 text-sm text-black dark:bg-black dark:text-white"
				/>
				<span>h</span>
			</div>

			{dateError && <p className="text-sm text-red-500">{dateError}</p>}
		</div>
	)
}
