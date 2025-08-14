import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'

import { cexColumn } from '~/components/Table/Defi/columns'
import { DateFilter } from './DateFilter'
import { TableWithSearch } from '~/components/Table/TableWithSearch'
import Layout from '~/layout'
import { Metrics } from '~/components/Metrics'
import { INFLOWS_API } from '~/constants'
import { fetchJson } from '~/utils/async'
import { useDateRangeValidation } from '~/hooks/useDateRangeValidation'

const getOutflowsByTimerange = async (startTime, endTime, cexData) => {
	if (startTime && endTime) {
		const cexsApiResults = await Promise.allSettled(
			cexData.map(async (c) => {
				if (c.slug === undefined) {
					return [null, null]
				} else {
					const res = await fetchJson(
						`${INFLOWS_API}/${c.slug}/${startTime}?end=${endTime}&tokensToExclude=${c.coin ?? ''}`
					)

					return [c.slug, res]
				}
			})
		)

		const cexs = cexsApiResults
			.map((result) => {
				if (result.status === 'fulfilled') {
					return result.value
				}
			})
			.filter(Boolean)

		return Object.fromEntries(cexs)
	}
}

const SECONDS_IN_HOUR = 3600

const dateStringToUnix = (dateString) => {
	if (!dateString) return 0
	return Math.floor(new Date(dateString).getTime() / 1000)
}

const unixToDateString = (unixTimestamp) => {
	if (!unixTimestamp) return ''
	const date = new Date(unixTimestamp * 1000)
	return date.toISOString().split('T')[0]
}

export const Cexs = ({ cexs }) => {
	// Initialize with date strings instead of Date objects
	const initialStartDate = (() => {
		const date = new Date()
		date.setMonth(date.getMonth() - 1)
		return unixToDateString(Math.floor(date.getTime() / 1000))
	})()

	const initialEndDate = (() => {
		const date = new Date()
		date.setDate(date.getDate() - 1)
		return unixToDateString(Math.floor(date.getTime() / 1000))
	})()

	const [hours, setHours] = useState([12, 12])

	const { startDate, endDate, dateError, handleStartDateChange, handleEndDateChange, validateDateRange } =
		useDateRangeValidation({
			initialStartDate,
			initialEndDate
		})

	const handleStartChange = (value: string) => {
		handleStartDateChange(value)
		if (endDate && value && new Date(value) > new Date(endDate)) {
			handleEndDateChange(value)
		}
	}

	const handleEndChange = (value: string) => {
		handleEndDateChange(value)
		if (startDate && value && new Date(startDate) > new Date(value)) {
			handleStartDateChange(value)
		}
	}

	const startTs = (dateStringToUnix(startDate) + Number(hours[0] || 0) * SECONDS_IN_HOUR).toFixed(0)
	const endTs = (dateStringToUnix(endDate) + Number(hours[1] || 0) * SECONDS_IN_HOUR).toFixed(0)

	const { data: customRangeInflows = {} } = useQuery({
		queryKey: ['cexs', startTs, endTs],
		queryFn: () => getOutflowsByTimerange(startTs, endTs, cexs),
		staleTime: 60 * 60 * 1000
	})

	const cexsWithCustomRange = cexs.map((cex) => ({
		...cex,
		customRange: customRangeInflows[cex.slug]?.outflows
	}))

	const onHourChange = (hours) => {
		const isValid = hours
			.map((hour) => (hour === '' ? 0 : hour))
			.every((hour) => /^([01]?[0-9]|2[0-3])$/.test(hour) || hour === '')

		if (isValid) {
			const newStartTs = (dateStringToUnix(startDate) + Number(hours[0] || 0) * SECONDS_IN_HOUR).toFixed(0)
			const newEndTs = (dateStringToUnix(endDate) + Number(hours[1] || 0) * SECONDS_IN_HOUR).toFixed(0)

			if (Number(newStartTs) <= Number(newEndTs)) {
				setHours(hours)
			}
		}
	}

	return (
		<Layout title={`CEX Transparency - DefiLlama`} defaultSEO>
			<Metrics currentMetric="CEX Assets" />
			<TableWithSearch
				data={cexsWithCustomRange}
				columns={cexColumn}
				columnToSearch={'name'}
				placeholder={'Search exchange...'}
				header={'CEX Transparency'}
				customFilters={
					<DateFilter
						startDate={startDate}
						endDate={endDate}
						onStartChange={handleStartChange}
						onEndChange={handleEndChange}
						hours={hours}
						setHours={onHourChange}
						dateError={dateError}
					/>
				}
			/>
		</Layout>
	)
}
