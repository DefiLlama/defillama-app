import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'
import { ICONS_CDN, timeframeOptions } from '~/constants'
export * from './blockExplorers'
import { colord, extend } from 'colord'
import lchPlugin from 'colord/plugins/lch'
import relativeTime from 'dayjs/plugin/relativeTime'
import { fetchJson } from './async'

extend([lchPlugin])
dayjs.extend(utc)
dayjs.extend(relativeTime)

export function getTimeframe(timeWindow) {
	const utcEndTime = dayjs.utc()
	// based on window, get starttime
	let utcStartTime
	switch (timeWindow) {
		case timeframeOptions.WEEK:
			utcStartTime = utcEndTime.subtract(1, 'week').endOf('day').unix() - 1
			break
		case timeframeOptions.MONTH:
			utcStartTime = utcEndTime.subtract(1, 'month').endOf('day').unix() - 1
			break
		case timeframeOptions.ALL_TIME:
			utcStartTime = utcEndTime.subtract(1, 'year').endOf('day').unix() - 1
			break
		case timeframeOptions.YEAR:
			utcStartTime = utcEndTime.subtract(1, 'year').endOf('day').unix() - 1
			break
		default:
			utcStartTime = utcEndTime.subtract(1, 'year').startOf('year').unix() - 1
			break
	}
	return utcStartTime
}

/** gives output like `5 days ago` or `17 hours ago` from a timestamp, https://day.js.org/docs/en/plugin/relative-time */
export const toNiceDaysAgo = (date) => dayjs().to(dayjs.utc(dayjs.unix(date)))

export const toNiceDayAndHour = (date) => {
	return dayjs.utc(dayjs.unix(date)).format('D MMM, HH:mm')
}
export const toNiceHour = (date) => {
	return dayjs.utc(dayjs.unix(date)).format('HH:mm')
}
export const toNiceDayMonthAndYear = (date) => {
	return dayjs.utc(dayjs.unix(date)).format('D MMM, YYYY')
}

export const toNiceDayMonthAndYearAndTime = (date) => {
	return dayjs.utc(dayjs.unix(date)).format('D MMM, YYYY HH:mm')
}

export const toNiceMonthlyDate = (date) => {
	return dayjs.utc(dayjs.unix(date)).format('MMM YYYY')
}

export const toYearMonth = (date) => {
	return dayjs.utc(dayjs.unix(date)).format('YYYY-MM')
}

export const toNiceDate = (date) => {
	return dayjs.utc(dayjs.unix(date)).format('MMM DD')
}

export const toNiceCsvDate = (date) => {
	return dayjs.utc(dayjs.unix(date)).format('YYYY-MM-DD')
}

export const toNiceDateYear = (date) => dayjs.utc(dayjs.unix(date)).format('MMMM DD, YYYY')

export const toNiceDayMonthYear = (date) => dayjs.utc(dayjs.unix(date)).format('DD MMM YYYY')

export const timeFromNow = (date) => dayjs.utc(dayjs.unix(date)).fromNow()

export function formatUnlocksEvent({ description, noOfTokens, timestamp, price, symbol }) {
	noOfTokens.forEach((tokens, i) => {
		description = description.replace(
			`{tokens[${i}]}`,
			`${formattedNum(tokens || 0) + (symbol ? ` ${symbol}` : '')}${
				price ? ` ($${formattedNum((tokens || 0) * price)})` : ''
			}`
		)
	})
	description = description?.replace('{timestamp}', `${toNiceDateYear(timestamp)} (${timeFromNow(timestamp)})`)
	return description
}

const toK = (num) => {
	if ((!num && num !== 0) || Number.isNaN(Number(num))) {
		return null
	}

	const stringifiedNum = Number(num).toFixed(0)

	// 100 - 999_999
	if ([4, 5, 6].includes(stringifiedNum.length)) {
		return (+stringifiedNum / 1_000).toLocaleString(undefined, { maximumFractionDigits: 2 }) + 'k'
	}

	// 1_000_000 - 999_999_999
	if ([7, 8, 9].includes(stringifiedNum.length)) {
		return (+stringifiedNum / 1_000_000).toLocaleString(undefined, { maximumFractionDigits: 2 }) + 'm'
	}

	// 1_000_000_000 - 999_999_999_999
	if ([10, 11, 12].includes(stringifiedNum.length)) {
		return (+stringifiedNum / 1_000_000_000).toLocaleString(undefined, { maximumFractionDigits: 3 }) + 'b'
	}

	if (stringifiedNum.length > 12) {
		return (+stringifiedNum / 1_000_000_000_000).toLocaleString(undefined, { maximumFractionDigits: 3 }) + 't'
	}

	return num.toLocaleString(undefined, {
		maximumFractionDigits: num > 0.1 ? 1 : num > 0.01 ? 2 : num > 0.0001 ? 3 : 5
	})
}

export const formattedNum = (number, symbol = false) => {
	let currencySymbol
	if (symbol === true) {
		currencySymbol = '$'
	} else if (symbol === false) {
		currencySymbol = ''
	} else {
		currencySymbol = symbol
	}

	if (number === '' || number === undefined || number === null || Number.isNaN(+number)) {
		return symbol ? `${currencySymbol}0` : `0`
	}
	let num = Number(number)
	const isNegative = num < 0
	num = Math.abs(num)

	const currencyMark = isNegative ? `-${currencySymbol}` : currencySymbol
	const normalMark = isNegative ? '-' : ''

	if (num >= 1_000_000) {
		return `${symbol ? currencyMark : normalMark}${toK(num)}`
	}

	if (num === 0) {
		return symbol ? `${currencySymbol}0` : `0`
	}

	if (num < 0.0001 && num > 0) {
		return symbol ? `< ${currencySymbol}0.0001` : '< 0.0001'
	}

	if (num > 1_000) {
		return symbol
			? `${currencyMark}${Number(num.toFixed(0)).toLocaleString()}`
			: `${normalMark}${Number(num.toFixed(0)).toLocaleString()}`
	}

	if (symbol) {
		return `${currencyMark}${num.toLocaleString(undefined, {
			maximumFractionDigits: num > 0.1 ? 2 : num > 0.01 ? 3 : num > 0.0001 ? 4 : 5
		})}`
	}

	return `${num.toLocaleString(undefined, {
		maximumFractionDigits: num > 0.1 ? 2 : num > 0.01 ? 3 : num > 0.0001 ? 4 : 5
	})}`
}

export const filterCollectionsByCurrency = (collections, displayUsd) =>
	(collections &&
		collections.length &&
		collections.map((collection) => ({
			...collection,
			floor: displayUsd ? collection?.floorUSD : collection?.floor,
			dailyVolume: displayUsd ? collection?.dailyVolumeUSD : collection?.dailyVolume,
			totalVolume: displayUsd ? collection?.totalVolumeUSD : collection?.totalVolume
		}))) ||
	[]

export function chainIconUrl(chain) {
	return `${ICONS_CDN}/chains/rsz_${chain.toLowerCase()}?w=48&h=48`
}

export function tokenIconUrl(name) {
	const x = name ?? ''
	return `${ICONS_CDN}/protocols/${
		x
			.trim()
			.toLowerCase()
			.replace(/[()'"]/g, '') // Remove parentheses and quotes
			.replace(/\s+/g, '-') // Replace spaces with hyphens
			.replace(/[^\w.!&-]/g, '') // Remove any other non-word chars except hyphens, !, & and .
	}?w=48&h=48`
}

/**
 * @param {string} symbol Asset symbol
 * @param {boolean} hd Return HD icon if true
 * @returns {string} URL to the asset icon
 */
export function liquidationsIconUrl(symbol, hd = false) {
	if (hd) {
		return `${ICONS_CDN}/liquidations/${symbol.toLowerCase()}?w=64&h=64`
	} else {
		return `${ICONS_CDN}/liquidations/${symbol.toLowerCase()}?w=48&h=48`
	}
}

export function peggedAssetIconUrl(name) {
	return `${ICONS_CDN}/pegged/${encodeURIComponent(name.toLowerCase().split(' ').join('-'))}?w=48&h=48`
}

export function formattedPercent(percent, noSign = false, fontWeight = 400, returnTextOnly) {
	if (!percent && percent !== 0) {
		return null
	}

	let up = 'green'
	let down = 'red'

	if (noSign) {
		up = down = ''
	}

	let color = ''
	let finalValue = ''

	percent = parseFloat(percent)

	if (!percent || percent === 0) {
		finalValue = '0%'
	} else if (percent < 0.0001 && percent > 0) {
		color = up
		finalValue = '< 0.0001%'
	} else if (percent < 0 && percent > -0.0001) {
		color = down
		finalValue = '< 0.0001%'
	} else {
		let fixedPercent = percent.toFixed(2)

		if (fixedPercent === '0.00') {
			finalValue = '0%'
		} else if (fixedPercent > 0) {
			const prefix = noSign ? '' : '+'

			if (fixedPercent > 100) {
				color = up
				finalValue = `${prefix}${percent.toFixed(0).toLocaleString()}%`
			} else {
				color = up
				finalValue = `${prefix}${fixedPercent}%`
			}
		} else {
			color = down
			finalValue = `${fixedPercent}%`
		}
	}

	if (returnTextOnly) {
		return finalValue
	}

	if (fontWeight > 400) {
		return (
			<span
				className={`${noSign ? '' : color === 'green' ? 'text-(--success)' : 'text-(--error)'}`}
				style={{ fontWeight }}
			>
				{finalValue}
			</span>
		)
	}

	return (
		<span className={`${noSign ? '' : color === 'green' ? 'text-(--success)' : 'text-(--error)'}`}>{finalValue}</span>
	)
}

/**
 * get standard percent change between two values
 * @param {*} valueNow
 * @param {*} value24HoursAgo
 */
export const getPercentChange = (valueNow, value24HoursAgo) => {
	const adjustedPercentChange =
		((parseFloat(valueNow) - parseFloat(value24HoursAgo)) / parseFloat(value24HoursAgo)) * 100
	if (isNaN(adjustedPercentChange) || !isFinite(adjustedPercentChange)) {
		return null
	}
	return adjustedPercentChange
}

export const capitalizeFirstLetter = (word) => word.charAt(0).toUpperCase() + word.slice(1)

export const slug = (name = '') => name?.toLowerCase().split(' ').join('-').split("'").join('')

export function getRandomColor() {
	let letters = '0123456789ABCDEF'
	let color = '#'
	for (let i = 0; i < 6; i++) {
		color += letters[Math.floor(Math.random() * 16)]
	}
	return color
}

export function getNDistinctColors(n, colorToAvoid) {
	const colors = []
	const colorToAvoidHsl = colorToAvoid ? hexToHSL(colorToAvoid) : null

	// Start from red (0) for maximum distinction
	let hue = colorToAvoidHsl ? (colorToAvoidHsl.h / 360 + 0.5) % 1 : 0 // Start from opposite hue if colorToAvoid exists
	// Use prime number for better distribution
	const step = 0.618033988749895 // golden ratio

	// Function to calculate color distance in HSL space
	const getColorDistance = (hsl1, hsl2) => {
		// Calculate hue difference (accounting for circular nature)
		let hueDiff = Math.abs(hsl1.h - hsl2.h)
		if (hueDiff > 180) hueDiff = 360 - hueDiff

		// Normalize differences
		const hueDistance = hueDiff / 180 // 0-1
		const satDistance = Math.abs(hsl1.s - hsl2.s) / 100 // 0-1
		const lightDistance = Math.abs(hsl1.l - hsl2.l) / 100 // 0-1

		// Weighted distance (hue is most important for distinction)
		return hueDistance * 0.7 + satDistance * 0.2 + lightDistance * 0.1
	}

	// Function to check if a color is too similar to any existing colors
	const isTooSimilarToAny = (colorHsl, existingColors) => {
		// Check against colorToAvoid
		if (colorToAvoidHsl && getColorDistance(colorHsl, colorToAvoidHsl) < 0.3) {
			return true
		}

		// Check against all existing colors
		for (const existingColor of existingColors) {
			const existingHsl = hexToHSL(existingColor)
			if (getColorDistance(colorHsl, existingHsl) < 0.3) {
				return true
			}
		}

		return false
	}

	// First pass: Generate n distinct colors
	for (let i = 0; i < n; i++) {
		let attempts = 0
		let color
		let colorHsl

		do {
			// Use larger modulo values to prevent repetition patterns
			// Vary saturation for better distinction while keeping colors rich
			const saturation = 65 + (i % 7) * 5 // 7 different saturation values: 65, 70, 75, 80, 85, 90, 95
			// Keep colors dark (lightness 20-45)
			const lightness = 20 + (i % 6) * 5 // 6 different lightness values: 20, 25, 30, 35, 40, 45

			color = hslToHex(hue * 360, saturation, lightness)
			colorHsl = hexToHSL(color)

			// Check if color is too similar to colorToAvoid or existing colors
			const isTooSimilar = isTooSimilarToAny(colorHsl, colors)

			if (!isTooSimilar) break

			// If too similar, try different hue
			hue = (hue + 0.2) % 1
			attempts++
		} while (attempts < 10) // Prevent infinite loop

		// If we still can't find a distinct color, force a very different hue
		if (attempts >= 10) {
			hue = (hue + 0.5) % 1 // Jump to opposite side of color wheel
			const saturation = 65 + (i % 7) * 5
			const lightness = 20 + (i % 6) * 5
			color = hslToHex(hue * 360, saturation, lightness)
		}

		colors.push(color)
		hue += step
		hue %= 1 // Keep in [0,1] range
	}

	// Second pass: Replace any colors that are still too similar to colorToAvoid
	if (colorToAvoidHsl) {
		for (let i = 0; i < colors.length; i++) {
			const currentColorHsl = hexToHSL(colors[i])

			// Check if current color is too similar to colorToAvoid
			if (getColorDistance(currentColorHsl, colorToAvoidHsl) < 0.3) {
				let replacementFound = false
				let attempts = 0

				// Try to find a replacement color
				while (!replacementFound && attempts < 20) {
					// Use a different hue strategy for replacement
					const replacementHue = Math.random() * 360 // Random hue
					const saturation = 65 + (attempts % 7) * 5
					const lightness = 20 + (attempts % 6) * 5

					const replacementColor = hslToHex(replacementHue, saturation, lightness)
					const replacementHsl = hexToHSL(replacementColor)

					// Check if replacement is distinct from colorToAvoid and all other colors
					if (!isTooSimilarToAny(replacementHsl, colors)) {
						colors[i] = replacementColor
						replacementFound = true
					}

					attempts++
				}

				// If no replacement found, force a very different color
				if (!replacementFound) {
					const forcedHue = (colorToAvoidHsl.h + 180) % 360 // Opposite hue
					const saturation = 80
					const lightness = 30
					colors[i] = hslToHex(forcedHue, saturation, lightness)
				}
			}
		}
	}

	return colors
}

export function getColorFromNumber(index, length) {
	//use defillama blue as starting
	return colord({
		l: 48.792 + (index / (length + 1)) * 30,
		c: 67 + (index / (length + 1)) * 20,
		h: 278.2 + (index / (length + 1)) * 360
	}).toHex()
}

export const getDominancePercent = (value, total) => {
	if (!value || !total) {
		return 0
	}

	const ratio = total > 0 ? value / total : 0

	return Number((ratio * 100).toFixed(2))
}

export const getTokenDominance = (topToken, totalVolume) => {
	const dominance = topToken.tvl && totalVolume && (topToken.tvl / totalVolume) * 100.0
	if (!dominance) return null
	if (dominance < 100) {
		return dominance.toFixed(2)
	} else return 100
}

/**
 * get tvl of specified day before last day using chart data
 * @param {*} chartData
 * @param {*} daysBefore
 */
export const getPrevTvlFromChart = (chart, daysBefore) => {
	return chart[chart.length - 1 - daysBefore]?.[1] ?? null
}

export const getPrevVolumeFromChart = (chart, daysBefore, txs = false, inflows = false) => {
	if (!chart) return null
	const prevChart = chart[chart.length - 1 - daysBefore]
	if (!prevChart) return null
	if (inflows) {
		return prevChart.Deposits - prevChart.Withdrawals
	}
	return txs ? prevChart.txs : prevChart.volume
}

export function download(filename, text) {
	let element = document.createElement('a')
	element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(text))
	element.setAttribute('download', filename)

	element.style.display = 'none'
	document.body.appendChild(element)

	element.click()

	document.body.removeChild(element)
}

export const formatPercentage = (value) => {
	let zeroes = 0
	let stop = false

	value
		.toString()
		.split('.')?.[1]
		?.slice(0, 5)
		?.split('')
		?.forEach((x) => {
			if (!stop && x == '0') {
				zeroes += 1
			} else {
				stop = true
			}
		})

	return value.toLocaleString(undefined, { maximumFractionDigits: zeroes + 1 })
}

export function iterateAndRemoveUndefined(obj) {
	if (typeof obj !== 'object') return obj
	if (Array.isArray(obj)) return obj
	Object.entries(obj).forEach((key, value) => {
		if (value === undefined) delete obj[key]
		else iterateAndRemoveUndefined(value)
	})
	return obj
}

export function nearestUtcZeroHour(dateString) {
	const date = new Date(dateString)

	if (date.getHours() >= 12) {
		date.setDate(date.getDate() + 1)
	}

	const now = new Date()
	return Date.now() < date.getTime()
		? Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
		: Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())
}

// TODO params & return value should be in seconds
export function firstDayOfMonth(dateString) {
	const date = new Date(dateString)
	return Math.trunc(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1) / 1000)
}

export function firstDayOfQuarter(dateString) {
	const date = new Date(dateString)
	const month = date.getUTCMonth()
	const quarterStartMonth = Math.floor(month / 3) * 3
	return Math.trunc(Date.UTC(date.getUTCFullYear(), quarterStartMonth, 1) / 1000)
}
// TODO params & return value should be in seconds
export function lastDayOfWeek(dateString) {
	const date = new Date(dateString)
	const weekDay = date.getUTCDay()
	// Calculate days to add to get to the end of the week (Sunday)
	const daysToAdd = weekDay === 0 ? 0 : 7 - weekDay
	// Create a new date by adding days (this handles month boundaries automatically)
	const lastDayDate = new Date(date.getTime() + daysToAdd * 24 * 60 * 60 * 1000)
	return Math.trunc(lastDayDate.getTime() / 1000)
}

function hexToHSL(hex) {
	let r = parseInt(hex.slice(1, 3), 16) / 255
	let g = parseInt(hex.slice(3, 5), 16) / 255
	let b = parseInt(hex.slice(5, 7), 16) / 255

	const max = Math.max(r, g, b)
	const min = Math.min(r, g, b)
	let h,
		s,
		l = (max + min) / 2

	if (max === min) {
		h = s = 0
	} else {
		const d = max - min
		s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
		switch (max) {
			case r:
				h = (g - b) / d + (g < b ? 6 : 0)
				break
			case g:
				h = (b - r) / d + 2
				break
			case b:
				h = (r - g) / d + 4
				break
		}
		h /= 6
	}

	return { h: h * 360, s: s * 100, l: l * 100 }
}

function hslToHex(h, s, l) {
	l /= 100
	const a = (s * Math.min(l, 1 - l)) / 100

	const f = (n) => {
		const k = (n + h / 30) % 12
		const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1)
		return Math.round(255 * color)
			.toString(16)
			.padStart(2, '0')
	}

	return `#${f(0)}${f(8)}${f(4)}`
}

export const chunks = (array, size) => {
	const result = []
	for (let i = 0; i < array.length; i += size) {
		result.push(array.slice(i, i + size))
	}
	return result
}

export async function batchFetchHistoricalPrices(priceReqs, batchSize = 15) {
	const entries = Object.entries(priceReqs)
	const batches = chunks(entries, batchSize)

	const results = {}

	for (const batch of batches) {
		const batchReqs = Object.fromEntries(batch)
		const response = await fetchJson(
			`https://coins.llama.fi/batchHistorical?coins=${JSON.stringify(batchReqs)}&searchWidth=6h`
		)

		for (const coinId of batch) {
			if (response.coins[coinId]?.prices) {
				response.coins[coinId].prices = response.coins[coinId].prices.map((price) => ({
					...price
				}))
			}
		}

		Object.assign(results, response.coins)
	}

	return { results }
}

export function roundToNearestHalfHour(timestamp) {
	const date = new Date(timestamp * 1000)
	const minutes = date.getMinutes()
	const roundedMinutes = minutes >= 30 ? 30 : 0
	date.setMinutes(roundedMinutes)
	date.setSeconds(0)
	date.setMilliseconds(0)
	return Math.floor(date.getTime() / 1000)
}

export function formatValue(value, formatType = 'auto') {
	if (formatType === 'auto') {
		if (typeof value === 'number') {
			if (value !== 0 && Math.abs(value) < 1) return formattedPercent(value * 100, true, 400, true)
			if (Math.abs(value) > 1000) return formattedNum(value, true)
			return formattedNum(value)
		}
		if (typeof value === 'string') {
			const num = Number(value)
			if (!isNaN(num)) {
				if (num !== 0 && Math.abs(num) < 1) return formattedPercent(num * 100, true, 400, true)
				if (Math.abs(num) > 1000) return formattedNum(num, true)
				return formattedNum(num)
			}
			return value
		}
		return String(value)
	}
	if (formatType === 'usd') return formattedNum(value, true)
	if (formatType === 'percent') {
		if (typeof value === 'number' && value !== 0 && Math.abs(value) < 1) {
			return formattedPercent(value * 100, true, 400, true)
		}
		if (typeof value === 'string') {
			const num = Number(value)
			if (!isNaN(num) && num !== 0 && Math.abs(num) < 1) {
				return formattedPercent(num * 100, true, 400, true)
			}
		}
		return formattedPercent(value, true, 400, true)
	}
	if (formatType === 'number') return formattedNum(value)
	return String(value)
}

export const preparePieChartData = ({ data, sliceIdentifier = 'name', sliceValue = 'value', limit }) => {
	let pieData = []

	if (Array.isArray(data)) {
		pieData = data.map((entry) => {
			return {
				name: entry[sliceIdentifier],
				value: Number(entry[sliceValue])
			}
		})
	} else {
		pieData = Object.entries(data).map(([name, value]) => {
			return {
				name: name,
				value: Number(value)
			}
		})
	}

	pieData = pieData.toSorted((a, b) => b.value - a.value)

	if (!limit) {
		return pieData
	}

	const mainSlices = pieData.slice(0, limit)
	const otherSlices = pieData.slice(limit)

	const otherSlicesValue = otherSlices.reduce((acc, curr) => {
		return acc + curr.value
	}, 0)

	if (otherSlicesValue > 0) {
		return [...mainSlices, { name: 'Others', value: otherSlicesValue }]
	}

	return mainSlices
}
