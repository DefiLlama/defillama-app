import { useState } from 'react'
import { useQuery } from 'react-query'

import { cexColumn } from '~/components/Table/Defi/columns'
import { cexData } from '~/pages/cexs'
import { DateFilter } from './DateFilter'
import { TableWithSearch } from '../Table/TableWithSearch'

const getOutflowsByTimerange = async (startTime, endTime) => {
	if (startTime && endTime) {
		const cexs = await Promise.all(
			cexData.map(async (c) => {
				if (c.slug === undefined) {
					return [null, null]
				} else {
					const res = await fetch(`https://api.llama.fi/inflows/${c.slug}/${startTime}?end=${endTime}`).then((r) =>
						r.json()
					)

					return [c.slug, res]
				}
			})
		)

		return Object.fromEntries(cexs)
	}
}

const SECONDS_IN_HOUR = 3600

const Cexs = ({ cexs }) => {
	const [startDate, setStartDate] = useState(() => {
		const date = new Date()
		date.setMonth(date.getMonth() - 1)
		return date
	})
	const [endDate, setEndDate] = useState(() => {
		const date = new Date()
		date.setMonth(date.getDay() - 1)
		return date
	})
	const [hours, setHours] = useState([12, 12])
	const startTs = (startDate?.getTime() / 1000 + Number(hours[0] || 0) * SECONDS_IN_HOUR).toFixed(0)
	const endTs = (endDate?.getTime() / 1000 + Number(hours[1] || 0) * SECONDS_IN_HOUR).toFixed(0)

	const onStartChange = (date) => {
		if (date?.getTime() > endDate?.getTime() && date !== null) return
		setStartDate(date)
	}

	const onEndChange = (date) => {
		if (date?.getTime() < startDate?.getTime() && date !== null) return
		setEndDate(date)
	}

	const { data: customRangeInflows = {} } = useQuery(['cexs', startTs, endTs], () =>
		getOutflowsByTimerange(startTs, endTs)
	)
	console.log(startTs, endTs, customRangeInflows)
	const cexsWithCustomRange = cexs.map((cex) => ({
		...cex,
		customRange: customRangeInflows[cex.slug]?.outflows
	}))

	const onHourChange = (hours) => {
		const isValid = hours
			.map((hour) => (hour === '' ? 0 : hour))
			.every((hour) => /^([01]?[0-9]|2[0-3])$/.test(hour) || hour === '')
		console.log(startTs, endTs, startTs > endTs, hours)
		if (hours[0] > hours[1] && startTs > endTs) return
		if (hours[1] < hours[0] && startTs > endTs) return

		if (isValid) setHours(hours)
	}

	return (
		<TableWithSearch
			data={cexsWithCustomRange}
			columns={cexColumn}
			columnToSearch={'name'}
			placeholder={'Search exchange...'}
			customFilters={
				<DateFilter
					startDate={startDate}
					endDate={endDate}
					onStartChange={onStartChange}
					onEndChange={onEndChange}
					hours={hours}
					setHours={onHourChange}
				/>
			}
		/>
	)
}

export default Cexs
