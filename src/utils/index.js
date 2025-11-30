import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import utc from 'dayjs/plugin/utc'
import { ICONS_CDN, timeframeOptions } from '~/constants'
import { CHART_COLORS } from '~/constants/colors'
import { fetchJson } from './async'

export * from './blockExplorers'

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

/**
 * @param {string | number | undefined | null} value
 * @param {string | undefined | null} symbol
 * @returns {string | null}
 */
function appendSymbol(value, symbol) {
	if (!value || !symbol) return value

	if (symbol === '$') {
		return value.startsWith('-') ? `-$${value.substring(1)}` : `$${value}`
	}

	if (symbol === '%') {
		return `${value}%`
	}

	return `${value} ${symbol}`
}

/**
 * @param {string | number | undefined | null} value
 * @param {number} [maxDecimals]
 * @returns {string | null}
 */
const formatNum_internal = (value, maxDecimals) => {
	if (!value && value !== 0) return '0'

	// Convert to number for validation
	const numValue = Number(value)
	if (Number.isNaN(numValue) || !Number.isFinite(numValue)) {
		return Number.isNaN(numValue) ? '0' : String(numValue)
	}

	// Handle scientific notation
	let processedValue = typeof value === 'number' ? value.toString() : value
	const isScientificNotation = /[eE]/.test(processedValue)

	if (isScientificNotation) {
		// Convert to fixed decimal string with enough precision
		processedValue = numValue.toFixed(20).replace(/\.?0+$/, '')
	}

	const [num, decimals] = processedValue.split('.')

	if (!decimals) return num

	if (decimals?.startsWith('999')) {
		return Number(value).toLocaleString('en-US', { maximumFractionDigits: 2 })
	}

	if (decimals?.startsWith('0000000000')) {
		return Number(value).toFixed(0)
	}

	if (maxDecimals !== undefined) {
		const decimalsToShow = decimals.substring(0, maxDecimals)
		// Check if all digits are zeros
		let allZeros = true
		for (let i = 0; i < decimalsToShow.length; i++) {
			if (decimalsToShow[i] !== '0') {
				allZeros = false
				break
			}
		}
		// If all decimal digits are zeros, return without decimal point
		if (allZeros) {
			return num
		}
		return num + '.' + decimalsToShow
	}

	// No maxDecimals provided - default behavior
	const absValue = Math.abs(numValue)
	const isLessThanPointOne = absValue > 0 && absValue < 0.1

	// Count leading zeros (needed for determining decimal places)
	let leadingZeros = 0
	for (let i = 0; i < decimals.length; i++) {
		if (decimals[i] === '0') {
			leadingZeros++
		} else {
			break
		}
	}

	if (isLessThanPointOne) {
		// If 3 or more zeros, return "0"
		if (leadingZeros >= 3) {
			return '0'
		}

		// Only show all digits if there are exactly 2 leading zeros AND the decimal is short (like 0.002, 0.001)
		// For longer decimals or 1 leading zero, show max 2 decimals (like 0.008, 0.07)
		if (leadingZeros === 2 && decimals.length <= 4) {
			// For very small numbers < 0.1 with exactly 2 leading zeros and short decimals, show all digits
			return num + '.' + decimals
		}
		// Fall through to max 2 decimals logic below
	}

	// For numbers >= 0.1 but < 1, or >= 1, show max 2 decimals
	// For numbers < 0.1, show 3 decimals only if there are 2 leading zeros (to get 0.008), otherwise 2 decimals
	const maxDecimalsToShow = absValue < 0.1 && leadingZeros === 2 ? 3 : 2
	const decimalsToShow = decimals.substring(0, maxDecimalsToShow)

	// Remove trailing zeros
	let endIndex = decimalsToShow.length
	while (endIndex > 0 && decimalsToShow[endIndex - 1] === '0') {
		endIndex--
	}

	if (endIndex === 0) {
		return num
	}

	return num + '.' + decimalsToShow.substring(0, endIndex)
}

export const formatNum = (value, maxDecimals, symbol) => {
	return appendSymbol(formatNum_internal(value, maxDecimals), symbol)
}

/**
 * @param {string | number | undefined | null} value
 * @param {number | undefined | null} maxDecimals
 * @returns {string | null}
 */
const abbreviateNumber_internal = (value, maxDecimals) => {
	if (value == null) return null

	const numValue = Number(value)

	if (Number.isNaN(numValue)) return '0'

	if (numValue < 1000) return formatNum(value.toString(), maxDecimals)

	// Handle negative numbers
	const isNegative = numValue < 0
	const absValue = Math.abs(numValue)

	// Determine suffix and divisor
	let result

	if (absValue >= 1_000_000_000) {
		// Billions - use 2 decimals max
		result = (absValue / 1_000_000_000).toFixed(2) + 'B'
	} else if (absValue >= 1_000_000) {
		// Millions - use 2 decimals max
		result = (absValue / 1_000_000).toFixed(2) + 'M'
	} else if (absValue >= 1_000) {
		// Thousands - use 2 decimals max
		result = (absValue / 1_000).toFixed(2) + 'K'
	} else {
		// Less than 1000, show up to 2 decimals
		return numValue.toFixed(2).replace(/\.?0+$/, '')
	}

	// Remove trailing zeros after decimal point
	result = result.replace(/\.?0+([KMB])$/, '$1')

	return isNegative ? `-${result}` : result
}

/**
 * @param {string | number | undefined | null} number
 * @param {number | undefined | null} maxDecimals
 * @param {string | undefined | null} symbol
 * @returns {string | null}
 */
export const abbreviateNumber = (value, maxDecimals, symbol) => {
	return appendSymbol(abbreviateNumber_internal(value, maxDecimals), symbol)
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

export function getNDistinctColors(n, colorToAvoid) {
	if (n < CHART_COLORS.length) {
		return CHART_COLORS.slice(0, n)
	}

	const colors = []
	const colorToAvoidHsl = colorToAvoid ? hexToHSL(colorToAvoid) : null

	// Pre-calculate HSL values for all chart colors to avoid repeated conversions
	const chartColorsHsl = CHART_COLORS.map(hexToHSL)

	// Optimized color distance calculation with early exit
	const getColorDistance = (hsl1, hsl2) => {
		const hueDiff = Math.abs(hsl1.h - hsl2.h)
		const hueDistance = (hueDiff > 180 ? 360 - hueDiff : hueDiff) / 180
		const satDistance = Math.abs(hsl1.s - hsl2.s) / 100
		const lightDistance = Math.abs(hsl1.l - hsl2.l) / 100
		return hueDistance * 0.7 + satDistance * 0.2 + lightDistance * 0.1
	}

	// Optimized similarity check with pre-calculated HSL values
	const isTooSimilarToAny = (colorHsl, existingColorsHsl) => {
		if (colorToAvoidHsl && getColorDistance(colorHsl, colorToAvoidHsl) < 0.25) {
			return true
		}
		for (const existingHsl of existingColorsHsl) {
			if (getColorDistance(colorHsl, existingHsl) < 0.25) {
				return true
			}
		}
		return false
	}

	// Step 1: Use all colors from CHART_COLORS first
	const chartColorsToUse = Math.min(n, CHART_COLORS.length)
	const usedColorsHsl = []

	for (let i = 0; i < chartColorsToUse; i++) {
		const chartColor = CHART_COLORS[i]
		const chartColorHsl = chartColorsHsl[i]

		if (!colorToAvoidHsl || getColorDistance(chartColorHsl, colorToAvoidHsl) >= 0.25) {
			colors.push(chartColor)
			usedColorsHsl.push(chartColorHsl)
		} else {
			colors.push(null)
		}
	}

	// Step 2: Generate remaining colors with enhanced uniqueness
	const remainingCount = n - chartColorsToUse
	const colorFamilies = ['blue', 'red', 'green', 'brown', 'yellow', 'purple', 'orange', 'pink']

	// Enhanced hue variations - more combinations to prevent duplicates
	const familyHues = {
		blue: [210, 240, 200, 220, 190, 230, 180, 250, 170, 260],
		red: [0, 15, 345, 330, 10, 20, 340, 325, 5, 25],
		green: [120, 140, 100, 160, 80, 150, 90, 170, 70, 180],
		brown: [30, 45, 15, 60, 0, 50, 10, 70, 5, 80],
		yellow: [60, 75, 45, 90, 30, 85, 40, 95, 35, 105],
		purple: [270, 285, 255, 300, 240, 295, 250, 305, 245, 315],
		orange: [30, 45, 15, 60, 0, 50, 10, 70, 5, 80],
		pink: [320, 335, 305, 350, 290, 340, 300, 355, 295, 5]
	}

	let generatedColors = []
	let usedColors = new Set([...colors.filter((c) => c), ...CHART_COLORS])

	// Pre-calculate HSL values for all existing colors
	const allExistingColorsHsl = [...usedColorsHsl, ...chartColorsHsl]

	// Generate colors with better distribution
	for (let i = 0; i < remainingCount; i++) {
		const familyIndex = i % colorFamilies.length
		const family = colorFamilies[familyIndex]
		const hueGroup = Math.floor(i / colorFamilies.length) % familyHues[family].length
		const baseHue = familyHues[family][hueGroup]

		let attempts = 0
		let color
		let colorHsl

		do {
			// Enhanced variation system
			const saturationGroup = Math.floor(i / (colorFamilies.length * familyHues[family].length)) % 8
			const lightnessGroup = Math.floor(i / (colorFamilies.length * familyHues[family].length * 8)) % 6

			const saturation = 65 + saturationGroup * 4 // 65, 69, 73, 77, 81, 85, 89, 93
			const lightness = 20 + lightnessGroup * 6 // 20, 26, 32, 38, 44, 50

			// Add hue variation based on attempt
			const hueVariation = (attempts % 7) * 3 - 9 // -9, -6, -3, 0, 3, 6, 9
			const finalHue = (baseHue + hueVariation + 360) % 360

			color = hslToHex(finalHue, saturation, lightness)
			colorHsl = hexToHSL(color)

			// Check for exact duplicates first
			if (usedColors.has(color)) {
				attempts++
				continue
			}

			// Use pre-calculated HSL values for faster comparison
			const isTooSimilar = isTooSimilarToAny(colorHsl, allExistingColorsHsl)

			if (!isTooSimilar) break

			attempts++
		} while (attempts < 25)

		// Simplified fallback - use golden angle distribution for better performance
		if (attempts >= 25) {
			const forcedHue = (i * 137.5) % 360 // Golden angle for maximum distribution
			const forcedSaturation = 70 + (i % 20)
			const forcedLightness = 25 + (i % 25)
			color = hslToHex(forcedHue, forcedSaturation, forcedLightness)
		}

		generatedColors.push(color)
		usedColors.add(color)
		allExistingColorsHsl.push(hexToHSL(color))
	}

	// Step 3: Replace null values (conflicting chart colors) with generated colors
	let generatedIndex = 0
	for (let i = 0; i < colors.length; i++) {
		if (colors[i] === null) {
			colors[i] = generatedColors[generatedIndex] || hslToHex(Math.random() * 360, 80, 40)
			generatedIndex++
		}
	}

	// Step 4: Add remaining generated colors
	for (let i = generatedIndex; i < generatedColors.length; i++) {
		colors.push(generatedColors[i])
	}

	// Step 5: Simplified adjacent similarity check - only check first few groups for performance
	const maxAdjacentChecks = Math.min(10, Math.floor(colors.length / 5))
	for (let i = 0; i < maxAdjacentChecks; i++) {
		const group = colors.slice(i * 5, (i + 1) * 5)
		if (group.length < 5) break

		let similarCount = 0
		for (let j = 0; j < group.length - 1; j++) {
			const hsl1 = hexToHSL(group[j])
			const hsl2 = hexToHSL(group[j + 1])
			if (getColorDistance(hsl1, hsl2) < 0.3) {
				similarCount++
			}
		}

		if (similarCount >= 3) {
			// Simple swap to break similarity
			const swapIndex = i * 5 + 2
			if (swapIndex < colors.length - 1) {
				;[colors[swapIndex], colors[swapIndex + 1]] = [colors[swapIndex + 1], colors[swapIndex]]
			}
		}
	}

	return colors
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

export function downloadDataURL(filename, dataURL) {
	const element = document.createElement('a')
	element.setAttribute('href', dataURL)
	element.setAttribute('download', filename)

	element.style.display = 'none'
	document.body.appendChild(element)

	element.click()

	document.body.removeChild(element)
}

export function downloadCSV(filename, csvData, options = {}) {
	try {
		const { mimeType = 'text/csv;charset=utf-8;', addTimestamp = false } = options

		let csvContent

		if (Array.isArray(csvData)) {
			csvContent = csvData
				.map((row) =>
					row
						.map((cell) => {
							if (cell === null || cell === undefined) return ''
							if (typeof cell === 'object') return JSON.stringify(cell)
							const cellStr = String(cell)
							if (cellStr.includes(',') || cellStr.includes('"') || cellStr.includes('\n')) {
								return `"${cellStr.replace(/"/g, '""')}"`
							}
							return cellStr
						})
						.join(',')
				)
				.join('\n')
		} else {
			csvContent = String(csvData)
		}

		let finalFilename = filename
		if (addTimestamp && !filename.includes(new Date().toISOString().split('T')[0])) {
			const extension = filename.split('.').pop()
			const nameWithoutExt = filename.replace(`.${extension}`, '')
			finalFilename = `${nameWithoutExt}_${new Date().toISOString().split('T')[0]}.${extension}`
		}

		const blob = new Blob([csvContent], { type: mimeType })
		const downloadUrl = window.URL.createObjectURL(blob)

		const link = document.createElement('a')
		link.href = downloadUrl
		link.download = finalFilename
		link.style.display = 'none'

		document.body.appendChild(link)
		link.click()
		document.body.removeChild(link)

		window.URL.revokeObjectURL(downloadUrl)
	} catch (error) {
		console.log('CSV download error:', error)
		download(filename, String(csvData))
	}
}

export function downloadDatasetCSV({
	data,
	columns,
	columnHeaders = {},
	filename,
	filenameSuffix,
	addTimestamp = true
}) {
	try {
		if (!data || !Array.isArray(data) || data.length === 0) {
			console.warn('No data provided for CSV download')
			return
		}

		const finalColumns = columns || Object.keys(data[0] || {})
		const headers = finalColumns.map((col) => columnHeaders[col] || col)

		const rows = data.map((item) =>
			finalColumns.map((col) => {
				const value = item[col]
				if (value === null || value === undefined) return ''
				if (typeof value === 'object') return JSON.stringify(value)
				return String(value)
			})
		)

		const csvData = [headers, ...rows]

		let finalFilename = filename || 'dataset'
		if (filenameSuffix) {
			finalFilename += `_${filenameSuffix}`
		}
		finalFilename += '.csv'

		downloadCSV(finalFilename, csvData, { addTimestamp })
	} catch (error) {
		console.log('Dataset CSV download error:', error)
	}
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
	// Normalize to start of day (00:00:00)
	lastDayDate.setUTCHours(0, 0, 0, 0)
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

	// Check if "Others" already exists in mainSlices
	const othersIndex = mainSlices.findIndex((slice) => slice.name === 'Others')
	let othersValueFromMain = 0
	let filteredMainSlices = mainSlices

	if (othersIndex !== -1) {
		// Remove existing "Others" from mainSlices and store its value
		othersValueFromMain = mainSlices[othersIndex].value
		filteredMainSlices = mainSlices.filter((_, index) => index !== othersIndex)
	}

	const otherSlicesValue =
		otherSlices.reduce((acc, curr) => {
			// Also include any "Others" entries from otherSlices
			return acc + curr.value
		}, 0) + othersValueFromMain

	if (otherSlicesValue > 0) {
		return [...filteredMainSlices, { name: 'Others', value: otherSlicesValue }]
	}

	return filteredMainSlices
}

export const formatEthAddress = (address) => {
	if (!address) return ''
	return `${address.slice(0, 6)}...${address.slice(-4)}`
}

/**
 * @param {string | string[] | null} value
 * @returns {number | null}
 */
export function toNumberOrNullFromQueryParam(value) {
	const finalValue = value ? (typeof value === 'string' ? value : (value?.[0] ?? null)) : null
	if (finalValue == null) return null
	return Number.isNaN(Number(finalValue)) ? null : Number(finalValue)
}
