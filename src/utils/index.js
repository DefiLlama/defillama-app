import * as React from 'react'
import { BigNumber } from 'bignumber.js'
import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'
import { Text } from 'rebass'
import Numeral from 'numeral'
import { ICONS_CDN, ICONS_PALETTE_CDN, timeframeOptions } from '~/constants'
export * from './blockExplorers'
import { colord, extend } from 'colord'
import lchPlugin from 'colord/plugins/lch'
import relativeTime from 'dayjs/plugin/relativeTime'

extend([lchPlugin])
BigNumber.set({ EXPONENTIAL_AT: 50 })
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
	let x = dayjs.utc(dayjs.unix(date)).format('D MMM, HH:mm')
	return x
}
export const toNiceHour = (date) => {
	let x = dayjs.utc(dayjs.unix(date)).format('HH:mm')
	return x
}
export const toNiceDayMonthAndYear = (date) => {
	let x = dayjs.utc(dayjs.unix(date)).format('D MMM, YYYY')
	return x
}

export const toNiceMonthlyDate = (date) => {
	let x = dayjs.utc(dayjs.unix(date)).format('MMM YYYY')
	return x
}

export const toYearMonth = (date) => {
	let x = dayjs.utc(dayjs.unix(date)).format('YYYY-MM')
	return x
}

export const toNiceDate = (date) => {
	let x = dayjs.utc(dayjs.unix(date)).format('MMM DD')
	return x
}

export const toNiceCsvDate = (date) => {
	let x = dayjs.utc(dayjs.unix(date)).format('YYYY-MM-DD')
	return x
}

export const toNiceDateYear = (date) => dayjs.utc(dayjs.unix(date)).format('MMMM DD, YYYY')

export const toK = (num) => {
	return Numeral(num).format('0.[00]a')
}

// using a currency library here in case we want to add more in future
var priceFormatter = new Intl.NumberFormat('en-US', {
	style: 'currency',
	currency: 'USD',
	minimumFractionDigits: 2
})

export const formattedNum = (number, symbol = false, acceptNegatives = false) => {
	let currencySymbol
	if (symbol === true) {
		currencySymbol = '$'
	} else if (symbol === false) {
		currencySymbol = ''
	} else {
		currencySymbol = symbol
	}
	if (isNaN(number) || number === '' || number === undefined) {
		return symbol ? `${currencySymbol}0` : 0
	}
	let num = parseFloat(number)
	const isNegative = num < 0
	num = Math.abs(num)

	const currencyMark = isNegative ? `${currencySymbol}-` : currencySymbol
	const normalMark = isNegative ? '-' : ''

	if (num > 10000000) {
		return (symbol ? currencyMark : normalMark) + toK(num.toFixed(0), true)
	}

	if (num === 0) {
		return symbol ? `${currencySymbol}0` : 0
	}

	if (num < 0.0001 && num > 0) {
		return symbol ? `< ${currencySymbol}0.0001` : '< 0.0001'
	}

	if (num > 1000) {
		return symbol
			? currencyMark + Number(parseFloat(num).toFixed(0)).toLocaleString()
			: normalMark + Number(parseFloat(num).toFixed(0)).toLocaleString()
	}

	if (symbol) {
		if (num < 0.1) {
			return currencyMark + Number(parseFloat(num).toFixed(2))
		} else {
			let usdString = priceFormatter.format(num)
			return currencyMark + usdString.slice(1, usdString.length)
		}
	}

	return Number(parseFloat(num).toFixed(2))
}

export const formattedPeggedPrice = (number, symbol = false, acceptNegatives = false) => {
	let currencySymbol
	if (symbol === true) {
		currencySymbol = '$'
	} else if (symbol === false) {
		currencySymbol = ''
	} else {
		currencySymbol = symbol
	}
	if (isNaN(number) || number === '' || number === undefined) {
		return symbol ? `${currencySymbol}0` : 0
	}
	let num = parseFloat(number)
	const isNegative = num < 0
	num = Math.abs(num)

	const currencyMark = isNegative ? `${currencySymbol}-` : currencySymbol
	const normalMark = isNegative ? '-' : ''

	if (num > 10000000) {
		return (symbol ? currencyMark : normalMark) + toK(num.toFixed(0), true)
	}

	if (num === 0) {
		return symbol ? `${currencySymbol}0` : 0
	}

	if (num < 0.0001 && num > 0) {
		return symbol ? `< ${currencySymbol}0.0001` : '< 0.0001'
	}

	if (num > 1000) {
		return symbol
			? currencyMark + Number(parseFloat(num).toFixed(0)).toLocaleString()
			: normalMark + Number(parseFloat(num).toFixed(0)).toLocaleString()
	}

	if (symbol) {
		return currencyMark + parseFloat(num).toFixed(2) // this is all pegged is using, should merge with above
	}

	return Number(parseFloat(num).toFixed(2))
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
	return `${ICONS_CDN}/chains/rsz_${chain.toLowerCase()}?w=24&h=24`
}

export function chainIconPaletteUrl(chain) {
	return `${ICONS_PALETTE_CDN}/chains/rsz_${chain.toLowerCase()}`
}

export function tokenIconUrl(name) {
	const x = name ?? ''
	return `${ICONS_CDN}/protocols/${x.toLowerCase().split(' ').join('-').split("'").join('')}?w=24&h=24`
}

export function nftCollectionIconUrl(address) {
	return `${ICONS_CDN}/nfts/${address}?w=24&h=24`
}

export function tokenIconPaletteUrl(name) {
	const x = name ?? ''
	return `${ICONS_PALETTE_CDN}/protocols/${x.toLowerCase().split(' ').join('-').split("'").join('')}`
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
		return `${ICONS_CDN}/liquidations/${symbol.toLowerCase()}?w=24&h=24`
	}
}

export function liquidationsIconPaletteUrl(symbol) {
	return `${ICONS_PALETTE_CDN}/protocols/${symbol.toLowerCase()}`
}

export function peggedAssetIconUrl(name) {
	return `${ICONS_CDN}/pegged/${encodeURIComponent(name.toLowerCase().split(' ').join('-'))}?w=24&h=24`
}

export function peggedAssetIconPalleteUrl(name) {
	return `${ICONS_PALETTE_CDN}/pegged/${encodeURIComponent(name.toLowerCase().split(' ').join('-'))}`
}

export function formattedPercent(percent, noSign = false, fontWeight = 400) {
	if (percent === null) {
		return null
	}

	let up = '#3fb950'
	let down = '#f85149'

	if (noSign) {
		up = down = ''
	}

	percent = parseFloat(percent)

	if (!percent || percent === 0) {
		return (
			<Text as="span" fontWeight={fontWeight}>
				0%
			</Text>
		)
	}

	if (percent < 0.0001 && percent > 0) {
		return (
			<Text as="span" fontWeight={fontWeight} color={up}>
				{'< 0.0001%'}
			</Text>
		)
	}

	if (percent < 0 && percent > -0.0001) {
		return (
			<Text as="span" fontWeight={fontWeight} color={down}>
				{'< 0.0001%'}
			</Text>
		)
	}

	let fixedPercent = percent.toFixed(2)
	if (fixedPercent === '0.00') {
		return '0%'
	}
	const prefix = noSign ? '' : '+'
	if (fixedPercent > 0) {
		if (fixedPercent > 100) {
			return (
				<Text as="span" fontWeight={fontWeight} color={up}>{`${prefix}${percent?.toFixed(0).toLocaleString()}%`}</Text>
			)
		} else {
			return <Text as="span" fontWeight={fontWeight} color={up}>{`${prefix}${fixedPercent}%`}</Text>
		}
	} else {
		return <Text as="span" fontWeight={fontWeight} color={down}>{`${fixedPercent}%`}</Text>
	}
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

export const standardizeProtocolName = (tokenName = '') =>
	tokenName.toLowerCase().split(' ').join('-').split("'").join('')

export const slug = standardizeProtocolName

export function getRandomColor() {
	var letters = '0123456789ABCDEF'
	var color = '#'
	for (var i = 0; i < 6; i++) {
		color += letters[Math.floor(Math.random() * 16)]
	}
	return color
}

export const getColorFromNumber = (index, length) => {
	//use defillama blue as starting
	return colord({
		l: 48.792 + (index / (length + 1)) * 30,
		c: 67 + (index / (length + 1)) * 20,
		h: 278.2 + (index / (length + 1)) * 360
	}).toHex()
}

export const getDominancePercent = (value, total) => {
	const ratio = total > 0 ? value / total : 0

	return Number((ratio * 100).toFixed(2))
}

export const getTokenDominance = (topToken, totalVolume) => {
	const dominance = topToken.tvl && totalVolume && (topToken.tvl / totalVolume) * 100.0

	if (dominance < 100) {
		return dominance.toFixed(2)
	} else return 100
}

export const getPeggedDominance = (topToken, totalMcap) => {
	if (topToken && totalMcap) {
		const dominance = topToken.mcap && totalMcap && (topToken.mcap / totalMcap) * 100.0
		if (dominance < 100) {
			return dominance.toFixed(2)
		} else return 100
	} else return null
}

/**
 * get tvl of specified day before last day using chart data
 * @param {*} chartData
 * @param {*} daysBefore
 */
export const getPrevTvlFromChart = (chart, daysBefore) => {
	return chart[chart.length - 1 - daysBefore]?.[1] ?? null
}

export const getPrevPeggedTotalFromChart = (chart, daysBefore, issuanceType, pegType = '') => {
	const prevChart = chart[chart.length - 1 - daysBefore]
	if (!prevChart) return null
	if (!pegType) return Object.values(prevChart?.[issuanceType]).reduce((a, b) => a + b)
	return prevChart?.[issuanceType]?.[pegType] ?? null
}

export const getPrevVolumeFromChart = (chart, daysBefore, txs = false, inflows = false) => {
	const prevChart = chart[chart.length - 1 - daysBefore]
	if (!prevChart) return null
	if (inflows) {
		return prevChart.Deposits - prevChart.Withdrawals
	}
	return txs ? prevChart.txs : prevChart.volume
}

export function download(filename, text) {
	var element = document.createElement('a')
	element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(text))
	element.setAttribute('download', filename)

	element.style.display = 'none'
	document.body.appendChild(element)

	element.click()

	document.body.removeChild(element)
}
