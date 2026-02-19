import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import utc from 'dayjs/plugin/utc'
import { ICONS_CDN } from '~/constants'
import { CHART_COLORS } from '~/constants/colors'
import { fetchJson } from './async'

export * from './blockExplorers'

dayjs.extend(utc)
dayjs.extend(relativeTime)

interface HSL {
	h: number
	s: number
	l: number
}

interface CSVDownloadOptions {
	mimeType?: string
	addTimestamp?: boolean
}

interface DatasetCSVParams {
	data: Record<string, unknown>[]
	columns?: string[]
	columnHeaders?: Record<string, string>
	filename?: string
	filenameSuffix?: string
	addTimestamp?: boolean
}

type CsvCell = string | number | boolean | object | null | undefined
type CsvData = CsvCell[][] | string

interface VolumeChartEntry {
	Deposits: number
	Withdrawals: number
	txs: number
	volume: number
	[key: string]: unknown
}

export function keepNeededProperties<T extends object, K extends keyof T & string>(
	protocol: T,
	propertiesToKeep: readonly K[]
): Pick<T, K>
export function keepNeededProperties(protocol: object, propertiesToKeep: readonly string[]): Record<string, unknown>
export function keepNeededProperties(protocol: object, propertiesToKeep: readonly string[]): Record<string, unknown> {
	const obj = protocol as Record<string, unknown>
	const result: Record<string, unknown> = {}
	for (const prop of propertiesToKeep) {
		result[prop] = obj[prop]
	}
	return result
}

/** gives output like `5 days ago` or `17 hours ago` from a timestamp, https://day.js.org/docs/en/plugin/relative-time */
export const toNiceDaysAgo = (date: number): string => dayjs().to(dayjs.utc(dayjs.unix(date)))

export const toNiceDayAndHour = (date: number): string => {
	return dayjs.utc(dayjs.unix(date)).format('D MMM, HH:mm')
}
export const toNiceHour = (date: number): string => {
	return dayjs.utc(dayjs.unix(date)).format('HH:mm')
}
export const toNiceDayMonthAndYear = (date: number): string => {
	return dayjs.utc(dayjs.unix(date)).format('D MMM, YYYY')
}

export const toNiceDayMonthAndYearAndTime = (date: number): string => {
	return dayjs.utc(dayjs.unix(date)).format('D MMM, YYYY HH:mm')
}

export const toYearMonth = (date: number): string => {
	return dayjs.utc(dayjs.unix(date)).format('YYYY-MM')
}

export const toNiceDate = (date: number): string => {
	return dayjs.utc(dayjs.unix(date)).format('MMM DD')
}

export const toNiceCsvDate = (date: number): string => {
	return dayjs.utc(dayjs.unix(date)).format('YYYY-MM-DD')
}

export const toNiceDateYear = (date: number): string => dayjs.utc(dayjs.unix(date)).format('MMMM DD, YYYY')

export const toNiceDayMonthYear = (date: number): string => dayjs.utc(dayjs.unix(date)).format('DD MMM YYYY')

const toK = (num: number): string => {
	if ((!num && num !== 0) || Number.isNaN(Number(num))) {
		return '0'
	}

	const stringifiedNum = Number(num).toFixed(0)
	const len = stringifiedNum.length

	if (len >= 4 && len <= 6) {
		return (+stringifiedNum / 1_000).toLocaleString(undefined, { maximumFractionDigits: 2 }) + 'k'
	}

	if (len >= 7 && len <= 9) {
		return (+stringifiedNum / 1_000_000).toLocaleString(undefined, { maximumFractionDigits: 2 }) + 'm'
	}

	if (len >= 10 && len <= 12) {
		return (+stringifiedNum / 1_000_000_000).toLocaleString(undefined, { maximumFractionDigits: 3 }) + 'b'
	}

	if (len > 12) {
		return (+stringifiedNum / 1_000_000_000_000).toLocaleString(undefined, { maximumFractionDigits: 3 }) + 't'
	}

	return num.toLocaleString(undefined, {
		maximumFractionDigits: num > 0.1 ? 1 : num > 0.01 ? 2 : num > 0.0001 ? 3 : 5
	})
}

function appendSymbol(value: string | null | undefined, symbol: string | undefined): string | null | undefined {
	if (!value || !symbol) return value

	if (symbol === '$') {
		return value.startsWith('-') ? `-$${value.substring(1)}` : `$${value}`
	}

	if (symbol === '%') {
		return `${value}%`
	}

	return `${value} ${symbol}`
}

const toNumericContext = (value: unknown): { numValue: number; stringValue: string } => ({
	numValue: Number(value),
	stringValue: typeof value === 'number' ? value.toString() : String(value)
})

type NumberFormatMode = 'standard' | 'compact'

const ABBREVIATION_SCALES = [
	{ threshold: 1_000_000_000_000, divisor: 1_000_000_000_000, suffix: 'T' },
	{ threshold: 1_000_000_000, divisor: 1_000_000_000, suffix: 'B' },
	{ threshold: 1_000_000, divisor: 1_000_000, suffix: 'M' },
	{ threshold: 1_000, divisor: 1_000, suffix: 'K' }
] as const

const formatNumberCore = (value: unknown, maxDecimals?: number, mode: NumberFormatMode = 'standard'): string => {
	if (!value && value !== 0) return '0'
	const { numValue, stringValue } = toNumericContext(value)
	if (Number.isNaN(numValue) || !Number.isFinite(numValue)) {
		return Number.isNaN(numValue) ? '0' : String(numValue)
	}

	if (mode === 'compact' && Math.abs(numValue) >= 1000) {
		const isNegative = numValue < 0
		const absValue = Math.abs(numValue)
		const resolvedMaxDecimals = maxDecimals ?? 2

		let scaleIndex = ABBREVIATION_SCALES.findIndex((scale) => absValue >= scale.threshold)
		if (scaleIndex === -1) {
			return formatNumberCore(value, maxDecimals, 'standard')
		}

		let scale = ABBREVIATION_SCALES[scaleIndex]
		let scaledValue = absValue / scale.divisor
		let formattedScaled = formatNumberCore(scaledValue, resolvedMaxDecimals, 'standard')

		// If rounding pushes 999.99K -> 1000K, promote to next suffix.
		while (Number(formattedScaled) >= 1000 && scaleIndex > 0) {
			scaleIndex -= 1
			scale = ABBREVIATION_SCALES[scaleIndex]
			scaledValue = absValue / scale.divisor
			formattedScaled = formatNumberCore(scaledValue, resolvedMaxDecimals, 'standard')
		}

		const result = `${formattedScaled}${scale.suffix}`
		return isNegative ? `-${result}` : result
	}

	// Handle scientific notation
	let processedValue: string = stringValue
	const isScientificNotation = processedValue.includes('e') || processedValue.includes('E')

	if (isScientificNotation) {
		// Convert to fixed decimal string with enough precision
		processedValue = numValue.toFixed(20).replace(/\.?0+$/, '')
	}

	const [num, decimals] = processedValue.split('.')

	if (!decimals) return num

	if (decimals?.startsWith('999')) {
		return numValue.toLocaleString('en-US', { maximumFractionDigits: 2 })
	}

	if (decimals?.startsWith('0000000000')) {
		return numValue.toFixed(0)
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

export const formatNum = (value: unknown, maxDecimals?: number, symbol?: string): string | null | undefined => {
	return appendSymbol(formatNumberCore(value, maxDecimals, 'standard'), symbol)
}

export const abbreviateNumber = (
	value: unknown,
	maxDecimals?: number | null,
	symbol?: string
): string | null | undefined => {
	if (value == null) return null
	return appendSymbol(formatNumberCore(value, maxDecimals ?? undefined, 'compact'), symbol)
}

export const formattedNum = (number: unknown, symbol: boolean | string = false): string => {
	let currencySymbol: string
	if (symbol === true) {
		currencySymbol = '$'
	} else if (symbol === false) {
		currencySymbol = ''
	} else {
		currencySymbol = symbol
	}

	if (number === '' || number == null || Number.isNaN(Number(number))) {
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

export function chainIconUrl(chain: unknown): string {
	return `${ICONS_CDN}/chains/rsz_${String(chain).toLowerCase()}?w=48&h=48`
}

export function tokenIconUrl(name: unknown): string {
	const x = typeof name === 'string' ? name : ''
	return `${ICONS_CDN}/protocols/${
		x
			.trim()
			.toLowerCase()
			.replace(/[()'"]/g, '') // Remove parentheses and quotes
			.replace(/\s+/g, '-') // Replace spaces with hyphens
			.replace(/[^\w.!&-]/g, '') // Remove any other non-word chars except hyphens, !, & and .
	}?w=48&h=48`
}

export function liquidationsIconUrl(symbol: unknown, hd: boolean = false): string {
	if (hd) {
		return `${ICONS_CDN}/liquidations/${String(symbol).toLowerCase()}?w=64&h=64`
	} else {
		return `${ICONS_CDN}/liquidations/${String(symbol).toLowerCase()}?w=48&h=48`
	}
}

export function peggedAssetIconUrl(name: unknown): string {
	return `${ICONS_CDN}/pegged/${encodeURIComponent(String(name).toLowerCase().split(' ').join('-'))}?w=48&h=48`
}

export function renderPercentChange(
	percent: unknown,
	noSign: boolean | undefined,
	fontWeight: number | undefined,
	returnTextOnly: true
): string | null
export function renderPercentChange(
	percent: unknown,
	noSign?: boolean,
	fontWeight?: number,
	returnTextOnly?: false
): React.JSX.Element | null
export function renderPercentChange(
	percent: unknown,
	noSign?: boolean,
	fontWeight?: number,
	returnTextOnly?: boolean
): string | null | React.JSX.Element
export function renderPercentChange(
	percent: unknown,
	noSign?: boolean,
	fontWeight?: number,
	returnTextOnly?: boolean
): string | null | React.JSX.Element {
	if (!percent && percent !== 0) {
		return null
	}

	const parsedPercent = parseFloat(String(percent))
	let isPositive = false
	let isNegative = false
	let finalValue = ''

	if (!parsedPercent || parsedPercent === 0) {
		finalValue = '0%'
	} else if (parsedPercent > 0 && parsedPercent < 0.0001) {
		isPositive = true
		finalValue = '< 0.0001%'
	} else if (parsedPercent < 0 && parsedPercent > -0.0001) {
		isNegative = true
		finalValue = '< 0.0001%'
	} else {
		const fixedPercent = parsedPercent.toFixed(2)
		const fixedNum = Number(fixedPercent)

		if (fixedNum === 0) {
			finalValue = '0%'
		} else if (fixedNum > 0) {
			isPositive = true
			const prefix = noSign ? '' : '+'
			finalValue = fixedNum > 100 ? `${prefix}${parsedPercent.toFixed(0)}%` : `${prefix}${fixedPercent}%`
		} else {
			isNegative = true
			finalValue = `${fixedPercent}%`
		}
	}

	if (returnTextOnly) {
		return finalValue
	}

	const colorClass = noSign ? '' : isPositive ? 'text-(--success)' : isNegative ? 'text-(--error)' : ''
	const weight = fontWeight ?? 400

	return weight > 400 ? (
		<span className={colorClass} style={{ fontWeight: weight }}>
			{finalValue}
		</span>
	) : (
		<span className={colorClass}>{finalValue}</span>
	)
}

/**
 * get standard percent change between two values
 */
export const getPercentChange = (valueNow: unknown, value24HoursAgo: unknown): number | null => {
	const adjustedPercentChange =
		((parseFloat(String(valueNow)) - parseFloat(String(value24HoursAgo))) / parseFloat(String(value24HoursAgo))) * 100
	if (Number.isNaN(adjustedPercentChange) || !isFinite(adjustedPercentChange)) {
		return null
	}
	return adjustedPercentChange
}

export const capitalizeFirstLetter = (word: unknown): string =>
	typeof word === 'string' ? word.charAt(0).toUpperCase() + word.slice(1) : ''

export const slug = (name: unknown = ''): string =>
	String(name ?? '')
		.toLowerCase()
		.replace(/ /g, '-')
		.replace(/'/g, '')

export function getNDistinctColors(n: number): string[] {
	if (n <= 0) {
		return []
	}

	const colors: string[] = []
	const usedColors = new Set<string>()
	const usedBuckets = new Map<string, HSL[]>()
	const saturationSteps = [60, 68, 76]
	const lightnessSteps = [40, 48, 56]
	const minContrastRatio = 2.5
	const similarityThreshold = 0.16
	const hueBinSize = 24
	const satBinSize = 14
	const lightBinSize = 14
	const hueBinCount = Math.ceil(360 / hueBinSize)

	const getRelativeLuminance = (hex: string): number => {
		const r = parseInt(hex.slice(1, 3), 16)
		const g = parseInt(hex.slice(3, 5), 16)
		const b = parseInt(hex.slice(5, 7), 16)
		const toLinear = (channel: number): number => {
			const value = channel / 255
			return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4
		}

		return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b)
	}

	const hasBalancedContrast = (hex: string): boolean => {
		const luminance = getRelativeLuminance(hex)
		const contrastOnWhite = 1.05 / (luminance + 0.05)
		const contrastOnBlack = (luminance + 0.05) / 0.05
		return contrastOnWhite >= minContrastRatio && contrastOnBlack >= minContrastRatio
	}

	const getColorDistance = (hsl1: HSL, hsl2: HSL): number => {
		const hueDiff = Math.abs(hsl1.h - hsl2.h)
		const hueDistance = (hueDiff > 180 ? 360 - hueDiff : hueDiff) / 180
		const satDistance = Math.abs(hsl1.s - hsl2.s) / 100
		const lightDistance = Math.abs(hsl1.l - hsl2.l) / 100
		return hueDistance * 0.7 + satDistance * 0.2 + lightDistance * 0.1
	}

	const getBucketKey = (hsl: HSL): string => {
		const hBin = Math.floor(hsl.h / hueBinSize) % hueBinCount
		const sBin = Math.floor(hsl.s / satBinSize)
		const lBin = Math.floor(hsl.l / lightBinSize)
		return `${hBin}:${sBin}:${lBin}`
	}

	const addToBuckets = (hsl: HSL): void => {
		const key = getBucketKey(hsl)
		const bucket = usedBuckets.get(key)
		if (bucket) {
			bucket.push(hsl)
		} else {
			usedBuckets.set(key, [hsl])
		}
	}

	const isDistinct = (hsl: HSL): boolean => {
		const centerH = Math.floor(hsl.h / hueBinSize) % hueBinCount
		const centerS = Math.floor(hsl.s / satBinSize)
		const centerL = Math.floor(hsl.l / lightBinSize)

		for (let dh = -1; dh <= 1; dh++) {
			const hBin = (centerH + dh + hueBinCount) % hueBinCount
			for (let ds = -1; ds <= 1; ds++) {
				const sBin = centerS + ds
				if (sBin < 0) continue
				for (let dl = -1; dl <= 1; dl++) {
					const lBin = centerL + dl
					if (lBin < 0) continue
					const bucket = usedBuckets.get(`${hBin}:${sBin}:${lBin}`)
					if (!bucket) continue
					for (const existing of bucket) {
						if (getColorDistance(existing, hsl) < similarityThreshold) {
							return false
						}
					}
				}
			}
		}

		return true
	}

	for (const baseColor of CHART_COLORS) {
		if (colors.length === n) {
			return colors
		}

		if (usedColors.has(baseColor)) continue
		if (!hasBalancedContrast(baseColor)) continue
		const baseColorHsl = hexToHSL(baseColor)
		if (!isDistinct(baseColorHsl)) continue

		usedColors.add(baseColor)
		colors.push(baseColor)
		addToBuckets(baseColorHsl)
	}

	let i = 0
	let attempts = 0
	const maxAttempts = n * 40

	// Deterministic low-discrepancy sequence with bucketed distance checks.
	while (colors.length < n && attempts < maxAttempts) {
		const hue = (i * 137.508) % 360
		const saturation = saturationSteps[Math.floor(i / lightnessSteps.length) % saturationSteps.length]
		const baseLightnessIndex = i % lightnessSteps.length

		for (let lightnessShift = 0; lightnessShift < lightnessSteps.length; lightnessShift++) {
			const lightness = lightnessSteps[(baseLightnessIndex + lightnessShift) % lightnessSteps.length]
			const candidate = hslToHex(hue, saturation, lightness)
			if (usedColors.has(candidate)) continue
			if (!hasBalancedContrast(candidate)) continue
			const candidateHsl = hexToHSL(candidate)
			if (!isDistinct(candidateHsl)) continue

			usedColors.add(candidate)
			colors.push(candidate)
			addToBuckets(candidateHsl)
			break
		}

		i++
		attempts++
	}

	// Ensure we always return n colors, even for very large n.
	while (colors.length < n) {
		const hue = (i * 137.508) % 360
		const saturation = 68 + (i % 3) * 6
		const lightness = 44 + (i % 3) * 6
		const candidate = hslToHex(hue, saturation, lightness)
		i++
		if (usedColors.has(candidate)) continue
		usedColors.add(candidate)
		colors.push(candidate)
	}

	return colors
}

export const getDominancePercent = (value: unknown, total: unknown): number => {
	const numValue = Number(value)
	const numTotal = Number(total)
	if (!numValue || !numTotal) {
		return 0
	}

	const ratio = numTotal > 0 ? numValue / numTotal : 0

	return Math.round(ratio * 10000) / 100
}

export const getTokenDominance = (
	topToken: { tvl?: number | null; [key: string]: unknown },
	totalVolume: number | null | undefined
): string | number | null => {
	const dominance = topToken.tvl && totalVolume && (topToken.tvl / totalVolume) * 100.0
	if (!dominance) return null
	if (dominance < 100) {
		return dominance.toFixed(2)
	} else return 100
}

/**
 * get tvl of specified day before last day using chart data
 */
export const getPrevTvlFromChart = (chart: [number, number][], daysBefore: number): number | null => {
	return chart[chart.length - 1 - daysBefore]?.[1] ?? null
}

export const getPrevVolumeFromChart = (
	chart: VolumeChartEntry[] | null | undefined,
	daysBefore: number,
	txs: boolean = false,
	inflows: boolean = false
): number | null => {
	if (!chart) return null
	const prevChart = chart[chart.length - 1 - daysBefore]
	if (!prevChart) return null
	if (inflows) {
		return prevChart.Deposits - prevChart.Withdrawals
	}
	return txs ? prevChart.txs : prevChart.volume
}

export function download(filename: string, text: string): void {
	const element = document.createElement('a')
	element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(text))
	element.setAttribute('download', filename)

	element.style.display = 'none'
	document.body.appendChild(element)

	element.click()

	document.body.removeChild(element)
}

export function downloadDataURL(filename: string, dataURL: string): void {
	const element = document.createElement('a')
	element.setAttribute('href', dataURL)
	element.setAttribute('download', filename)

	element.style.display = 'none'
	document.body.appendChild(element)

	element.click()

	document.body.removeChild(element)
}

export function downloadCSV(filename: string, csvData: CsvData, options: CSVDownloadOptions = {}): void {
	try {
		const { mimeType = 'text/csv;charset=utf-8;', addTimestamp = false } = options

		let csvContent: string

		if (Array.isArray(csvData)) {
			csvContent = csvData
				.map((row) =>
					row
						.map((cell) => {
							if (cell == null) return ''
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
}: DatasetCSVParams): void {
	try {
		if (!data || !Array.isArray(data) || data.length === 0) {
			console.log('No data provided for CSV download')
			return
		}

		const finalColumns =
			columns ||
			(() => {
				const inferredColumns: string[] = []
				const firstRow = data[0] || {}
				for (const column in firstRow) {
					inferredColumns.push(column)
				}
				return inferredColumns
			})()
		const headers = finalColumns.map((col) => columnHeaders[col] || col)

		const rows = data.map((item) =>
			finalColumns.map((col) => {
				const value = item[col]
				if (value == null) return ''
				if (typeof value === 'object') return JSON.stringify(value)
				return String(value)
			})
		)

		const csvRows: CsvCell[][] = [headers, ...rows]

		let finalFilename = filename || 'dataset'
		if (filenameSuffix) {
			finalFilename += `_${filenameSuffix}`
		}
		finalFilename += '.csv'

		downloadCSV(finalFilename, csvRows, { addTimestamp })
	} catch (error) {
		console.log('Dataset CSV download error:', error)
	}
}

export const formatPercentage = (value: number): string => {
	let zeroes = 0
	let stop = false

	const decimals = value.toString().split('.')?.[1]?.slice(0, 5)?.split('') ?? []
	for (const x of decimals) {
		if (!stop && x == '0') {
			zeroes += 1
		} else {
			stop = true
		}
	}

	return value.toLocaleString(undefined, { maximumFractionDigits: zeroes + 1 })
}

export function firstDayOfMonth(utcTimestamp: number): number {
	const date = new Date(utcTimestamp * 1000)
	return Math.trunc(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1) / 1000)
}

export function firstDayOfQuarter(utcTimestamp: number): number {
	const date = new Date(utcTimestamp * 1000)
	const month = date.getUTCMonth()
	const quarterStartMonth = Math.floor(month / 3) * 3
	return Math.trunc(Date.UTC(date.getUTCFullYear(), quarterStartMonth, 1) / 1000)
}

export function lastDayOfWeek(utcTimestamp: number): number {
	const date = new Date(utcTimestamp * 1000)
	const weekDay = date.getUTCDay()
	const daysToAdd = weekDay === 0 ? 0 : 7 - weekDay
	const lastDayDate = new Date(date.getTime() + daysToAdd * 24 * 60 * 60 * 1000)
	lastDayDate.setUTCHours(0, 0, 0, 0)
	return Math.trunc(lastDayDate.getTime() / 1000)
}

function hexToHSL(hex: string): HSL {
	const r = parseInt(hex.slice(1, 3), 16) / 255
	const g = parseInt(hex.slice(3, 5), 16) / 255
	const b = parseInt(hex.slice(5, 7), 16) / 255

	const max = Math.max(r, g, b)
	const min = Math.min(r, g, b)
	let h = 0
	let s = 0
	const l = (max + min) / 2

	if (max !== min) {
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

function hslToHex(h: number, s: number, l: number): string {
	l /= 100
	const a = (s * Math.min(l, 1 - l)) / 100

	const f = (n: number): string => {
		const k = (n + h / 30) % 12
		const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1)
		return Math.round(255 * color)
			.toString(16)
			.padStart(2, '0')
	}

	return `#${f(0)}${f(8)}${f(4)}`
}

const chunks = <T,>(array: T[], size: number): T[][] => {
	const result: T[][] = []
	for (let i = 0; i < array.length; i += size) {
		result.push(array.slice(i, i + size))
	}
	return result
}

interface BatchHistoricalPrice {
	price: number
	timestamp: number
	[key: string]: unknown
}

interface BatchHistoricalCoin {
	prices?: BatchHistoricalPrice[]
	[key: string]: unknown
}

interface BatchHistoricalResponse {
	coins: Record<string, BatchHistoricalCoin>
}

export async function batchFetchHistoricalPrices(
	priceReqs: Record<string, number | number[]>,
	batchSize: number = 15
): Promise<{ results: Record<string, BatchHistoricalCoin> }> {
	const entries = Object.entries(priceReqs)
	const batches = chunks(entries, batchSize)

	const results: Record<string, BatchHistoricalCoin> = {}

	for (const batch of batches) {
		const batchReqs = Object.fromEntries(batch)
		const response = await fetchJson<BatchHistoricalResponse>(
			`https://coins.llama.fi/batchHistorical?coins=${JSON.stringify(batchReqs)}&searchWidth=6h`
		)

		for (const coinId of batch) {
			if (response.coins[coinId[0]]?.prices) {
				response.coins[coinId[0]].prices = response.coins[coinId[0]].prices!.map((price) => ({
					...price
				}))
			}
		}

		Object.assign(results, response.coins)
	}

	return { results }
}

export function roundToNearestHalfHour(timestamp: number): number {
	const date = new Date(timestamp * 1000)
	const minutes = date.getMinutes()
	const roundedMinutes = minutes >= 30 ? 30 : 0
	date.setMinutes(roundedMinutes)
	date.setSeconds(0)
	date.setMilliseconds(0)
	return Math.floor(date.getTime() / 1000)
}

export function formatValue(value: unknown, formatType: string = 'auto'): string | null {
	switch (formatType) {
		case 'usd':
			return formattedNum(value, true)
		case 'number':
			return formattedNum(value)
		case 'percent': {
			const num = typeof value === 'number' ? value : Number(value)
			if (!Number.isNaN(num) && num !== 0 && Math.abs(num) < 1) {
				return renderPercentChange(num * 100, true, 400, true)
			}
			return renderPercentChange(value, true, 400, true)
		}
		case 'auto':
		default: {
			const num = typeof value === 'number' ? value : typeof value === 'string' ? Number(value) : NaN
			if (!Number.isNaN(num)) {
				if (num !== 0 && Math.abs(num) < 1) return renderPercentChange(num * 100, true, 400, true)
				if (Math.abs(num) > 1000) return formattedNum(num, true)
				return formattedNum(num)
			}
			return typeof value === 'string' ? value : String(value)
		}
	}
}

export const formatEthAddress = (address: unknown): string => {
	if (!address || typeof address !== 'string') return ''
	return `${address.slice(0, 6)}...${address.slice(-4)}`
}

export function toNumberOrNullFromQueryParam(value: string | string[] | null | undefined): number | null {
	const finalValue = value ? (typeof value === 'string' ? value : (value?.[0] ?? null)) : null
	if (finalValue == null) return null
	return Number.isNaN(Number(finalValue)) ? null : Number(finalValue)
}

export const getAnnualizedRatio = (numerator?: number | null, denominator?: number | null) => {
	if (numerator == null || denominator == null) {
		return null
	}
	if (denominator === 0) {
		return null
	}
	return Number((numerator / (denominator * 12)).toFixed(2))
}
