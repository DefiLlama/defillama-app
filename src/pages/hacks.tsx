import * as React from 'react'
import { maxAgeForNext } from '~/api'
import HacksContainer from '~/containers/Hacks'
import { formattedNum, toYearMonth } from '~/utils'
import { withPerformanceLogging } from '~/utils/perf'

import { fetchWithErrorLogging } from '~/utils/async'
import { HACKS_API } from '~/constants'

const fetch = fetchWithErrorLogging

export const getStaticProps = withPerformanceLogging('hacks', async () => {
	const data = (await fetch(HACKS_API).then((r) => r.json())).map((h) => ({
		chains: h.chain ?? [],
		classification: h.classification,
		date: h.date,
		target: h.targetType,
		amount: h.amount / 1e6,
		name: h.name,
		technique: h.technique,
		bridge: h.bridgeHack,
		link: h.source ?? '',
		language: h.language ?? ''
	}))

	const monthlyHacks = {}

	data.forEach((r) => {
		const monthlyDate = toYearMonth(r.date)
		monthlyHacks[monthlyDate] = (monthlyHacks[monthlyDate] ?? 0) + r.amount
	})

	const totalHacked = formattedNum(
		data.map((hack) => hack.amount).reduce((acc, amount) => acc + amount, 0) / 1000,
		true
	)

	const totalHackedDefi = formattedNum(
		data
			.filter((hack) => hack.target == 'DeFi Protocol')
			.map((hack) => hack.amount)
			.reduce((acc, amount) => acc + amount, 0) / 1000,
		true
	)

	const totalRugs = formattedNum(
		data
			.filter((hack) => hack.bridge === true)
			.map((hack) => hack.amount)
			.reduce((acc, amount) => acc + amount, 0) / 1000,
		true
	)

	const onlyHacksTechnique = data.map((hack) => ({
		name: hack.technique,
		value: hack.amount
	}))

	const sumDuplicates = (acc, obj) => {
		const found = acc.find((o) => o.name === obj.name)
		if (found) {
			found.value += obj.value
		} else {
			acc.push(obj)
		}
		return acc
	}

	const reducedData = onlyHacksTechnique.reduce(sumDuplicates, [])
	const othersValue = reducedData.slice(15).reduce((total, entry) => total + entry.value, 0)

	const pieChartData = [
		...reducedData.sort((a, b) => b.value - a.value).slice(0, 15),
		{ name: 'Others', value: othersValue }
	]

	return {
		props: {
			data,
			monthlyHacks: Object.entries(monthlyHacks).map((t) => [getLastDateOfMonth(t[0]) / 1e3, Number(t[1]) * 1e6]),
			totalHacked,
			totalHackedDefi,
			totalRugs,
			pieChartData
		},
		revalidate: maxAgeForNext([22])
	}
})

const Raises = ({ data, monthlyHacks, monthlyHacks2, ...props }) => {
	return <HacksContainer data={data} monthlyHacks={monthlyHacks} {...(props as any)} />
}

export default Raises

function getLastDateOfMonth(yearMonth) {
	// Split the input string into year and month
	let [year, month] = yearMonth.split('-').map(Number)

	// Create a date for the first day of the next month
	let d = new Date(year, month, 1) // Month is zero-indexed in JavaScript

	// Subtract one day to move to the last day of the current month
	d.setDate(d.getDate() - 1)

	// Format the date back to 'YYYY-MM-DD'
	let lastDay = d.getDate().toString().padStart(2, '0') // Ensure two digits for day
	return new Date(`${year}-${month.toString().padStart(2, '0')}-${lastDay}`).getTime()
}
