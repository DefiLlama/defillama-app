const getStartOfTimeFrame = (date, frame) => {
	if (frame === 'daily') {
		return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime()
	} else if (frame === 'weekly') {
		const day = date.getDate() - date.getDay() + (date.getDay() === 0 ? -6 : 1)
		return new Date(date.getFullYear(), date.getMonth(), day).getTime()
	} else if (frame === 'monthly') {
		return new Date(date.getFullYear(), date.getMonth(), 1).getTime()
	}
}

function groupByTimeFrame(data, timeFrame) {
	const groupedData = data.reduce((acc, [timestamp, ...values]) => {
		const date = new Date(parseInt(timestamp) * 1000)
		const timeFrameStart = getStartOfTimeFrame(date, timeFrame)

		if (!acc[timeFrameStart]) {
			acc[timeFrameStart] = values.map(() => 0)
		}

		values.forEach((value, index) => {
			acc[timeFrameStart][index] += Number(value)
		})

		return acc
	}, {})

	return Object.entries(groupedData).map(([timeFrameStart, sums]: [string, number[]]) => {
		return [(+timeFrameStart / 1000).toFixed(0), ...sums]
	})
}

function cumulativeSum(data) {
	let cumulativeData = []

	let runningTotal1 = 0
	let runningTotal2 = 0

	for (let i = 0; i < data.length; i++) {
		runningTotal1 += parseInt(data[i][1])
		runningTotal2 += parseInt(data[i][2])

		cumulativeData.push([data[i][0], runningTotal1, runningTotal2])
	}

	return cumulativeData
}

export { groupByTimeFrame, cumulativeSum }
