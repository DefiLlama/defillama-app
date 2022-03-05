import React from 'react'
import { BigNumber } from 'bignumber.js'
import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'
import { Text } from 'rebass'
import _Decimal from 'decimal.js-light'
import toFormat from 'toformat'
import Numeral from 'numeral'

import { timeframeOptions } from '../constants'
export * from './blockExplorers'

// format libraries
const Decimal = toFormat(_Decimal)
BigNumber.set({ EXPONENTIAL_AT: 50 })
dayjs.extend(utc)

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

export function localNumber(val) {
  return Numeral(val).format('0,0')
}

export const toNiceDayAndHour = (date) => {
  let x = dayjs.utc(dayjs.unix(date)).format('D MMM, HH:mm')
  return x
}
export const toNiceHour = (date) => {
  let x = dayjs.utc(dayjs.unix(date)).format('HH:mm')
  return x
}

export const toNiceMonthlyDate = (date) => {
  let x = dayjs.utc(dayjs.unix(date)).format('MMM YYYY')
  return x
}

export const toNiceDate = (date) => {
  let x = dayjs.utc(dayjs.unix(date)).format('MMM DD')
  return x
}

export const toNiceCsvDate = (date) => {
  let x = dayjs.utc(dayjs.unix(date)).format('DD/MM/YYYY')
  return x
}

export const toWeeklyDate = (date) => {
  const formatted = dayjs.utc(dayjs.unix(date))
  date = new Date(formatted)
  const day = new Date(formatted).getDay()
  var lessDays = day === 6 ? 0 : day + 1
  var wkStart = new Date(new Date(date).setDate(date.getDate() - lessDays))
  var wkEnd = new Date(new Date(wkStart).setDate(wkStart.getDate() + 6))
  return dayjs.utc(wkStart).format('MMM DD') + ' - ' + dayjs.utc(wkEnd).format('MMM DD')
}

export function getTimestampsForChanges() {
  const utcCurrentTime = dayjs()
  const t1 = utcCurrentTime.subtract(1, 'day').startOf('minute').unix()
  const t2 = utcCurrentTime.subtract(2, 'day').startOf('minute').unix()
  const tWeek = utcCurrentTime.subtract(1, 'week').startOf('minute').unix()
  return [t1, t2, tWeek]
}

/**
 * @notice Creates an evenly-spaced array of timestamps
 * @dev Periods include a start and end timestamp. For example, n periods are defined by n+1 timestamps.
 * @param {Int} timestamp_from in seconds
 * @param {Int} period_length in seconds
 * @param {Int} periods
 */
export function getTimestampRange(timestamp_from, period_length, periods) {
  let timestamps = []
  for (let i = 0; i <= periods; i++) {
    timestamps.push(timestamp_from + i * period_length)
  }
  return timestamps
}

export const toNiceDateYear = (date) => dayjs.utc(dayjs.unix(date)).format('MMMM DD, YYYY')
export const toK = (num) => {
  return Numeral(num).format('0.[00]a')
}

export const setThemeColor = (theme) => document.documentElement.style.setProperty('--c-token', theme || '#333333')

export const Big = (number) => new BigNumber(number)

export const formatTime = (unix) => {
  const now = dayjs()
  const timestamp = dayjs.unix(unix)

  const inSeconds = now.diff(timestamp, 'second')
  const inMinutes = now.diff(timestamp, 'minute')
  const inHours = now.diff(timestamp, 'hour')
  const inDays = now.diff(timestamp, 'day')

  if (inHours >= 24) {
    return `${inDays} ${inDays === 1 ? 'day' : 'days'} ago`
  } else if (inMinutes >= 60) {
    return `${inHours} ${inHours === 1 ? 'hour' : 'hours'} ago`
  } else if (inSeconds >= 60) {
    return `${inMinutes} ${inMinutes === 1 ? 'minute' : 'minutes'} ago`
  } else {
    return `${inSeconds} ${inSeconds === 1 ? 'second' : 'seconds'} ago`
  }
}

export const formatNumber = (num) => {
  return num.toString().replace(/(\d)(?=(\d{3})+(?!\d))/g, '$1,')
}

// using a currency library here in case we want to add more in future
var priceFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 2,
})

export const toSignificant = (number, significantDigits) => {
  Decimal.set({ precision: significantDigits + 1, rounding: Decimal.ROUND_UP })
  const updated = new Decimal(number).toSignificantDigits(significantDigits)
  return updated.toFormat(updated.decimalPlaces(), { groupSeparator: '' })
}

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
      return currencyMark + Number(parseFloat(num).toFixed(4))
    } else {
      let usdString = priceFormatter.format(num)
      return currencyMark + usdString.slice(1, usdString.length)
    }
  }

  return Number(parseFloat(num).toFixed(5))
}

export const filterCollectionsByCurrency = (collections, displayUsd) =>
  (collections &&
    collections.length &&
    collections.map((collection) => ({
      ...collection,
      floor: displayUsd ? collection?.floorUSD : collection?.floor,
      dailyVolume: displayUsd ? collection?.dailyVolumeUSD : collection?.dailyVolume,
      totalVolume: displayUsd ? collection?.totalVolumeUSD : collection?.totalVolume,
    }))) ||
  []

export function rawPercent(percentRaw) {
  let percent = parseFloat(percentRaw * 100)
  if (!percent || percent === 0) {
    return '0%'
  }
  if (percent < 1 && percent > 0) {
    return '< 1%'
  }
  return percent.toFixed(0) + '%'
}

export function getChainsFromAllTokenData(data) {
  const chainsUniqueSet = new Set()
  Object.values(data).forEach((token) => {
    if (token.category === 'Chain') return
    token.chains.forEach((chain) => {
      chainsUniqueSet.add(chain)
    })
  })
  const chainsUnique = Array.from(chainsUniqueSet)
  return chainsUnique.map((name) => ({
    logo: chainIconUrl(name),
    isChain: true,
    name,
  }))
}

export function chainIconUrl(chain) {
  return `/chain-icons/rsz_${chain.toLowerCase()}.jpg`
}

export function tokenIconUrl(name) {
  return `/icons/${name.toLowerCase().split(' ').join('-')}.jpg`
}

export function formattedPercent(percent, useBrackets = false) {
  if (percent === null) {
    return null
  }
  percent = parseFloat(percent)
  if (!percent || percent === 0) {
    return <Text fontWeight={500}>0%</Text>
  }

  if (percent < 0.0001 && percent > 0) {
    return (
      <Text fontWeight={500} color="green">
        {'< 0.0001%'}
      </Text>
    )
  }

  if (percent < 0 && percent > -0.0001) {
    return (
      <Text fontWeight={500} color="red">
        {'< 0.0001%'}
      </Text>
    )
  }

  let fixedPercent = percent.toFixed(2)
  if (fixedPercent === '0.00') {
    return '0%'
  }
  if (fixedPercent > 0) {
    if (fixedPercent > 100) {
      return <Text fontWeight={500} color="green">{`+${percent?.toFixed(0).toLocaleString()}%`}</Text>
    } else {
      return <Text fontWeight={500} color="green">{`+${fixedPercent}%`}</Text>
    }
  } else {
    return <Text fontWeight={500} color="red">{`${fixedPercent}%`}</Text>
  }
}

/**
 * gets the amoutn difference plus the % change in change itself (second order change)
 * @param {*} valueNow
 * @param {*} value24HoursAgo
 * @param {*} value48HoursAgo
 */
export const get2DayPercentChange = (valueNow, value24HoursAgo, value48HoursAgo) => {
  // get volume info for both 24 hour periods
  let currentChange = parseFloat(valueNow) - parseFloat(value24HoursAgo)
  let previousChange = parseFloat(value24HoursAgo) - parseFloat(value48HoursAgo)

  const adjustedPercentChange = (parseFloat(currentChange - previousChange) / parseFloat(previousChange)) * 100

  if (isNaN(adjustedPercentChange) || !isFinite(adjustedPercentChange)) {
    return [currentChange, 0]
  }
  return [currentChange, adjustedPercentChange]
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

export function isEquivalent(a, b) {
  var aProps = Object.getOwnPropertyNames(a)
  var bProps = Object.getOwnPropertyNames(b)
  if (aProps.length !== bProps.length) {
    return false
  }
  for (var i = 0; i < aProps.length; i++) {
    var propName = aProps[i]
    if (a[propName] !== b[propName]) {
      return false
    }
  }
  return true
}

export function isValidProtocol(tokensObject, protocol) {
  try {
    const tokens = Object.values(tokensObject)
    const isValid = tokens.some(
      (token) =>
        (protocol.includes('-') && token.name.toLowerCase().split(' ').join('-') === protocol) ||
        token.name.toLowerCase().split(' ').join('') === protocol
    )
    return isValid
  } catch (error) {
    return false
  }
}

export function isValidCollection(nftCollections, collection) {
  const isValid = nftCollections.some((nftCollection) => nftCollection.id === collection)
  return isValid
}

export function getTokenAddressFromName(tokensObject, protocol) {
  try {
    const tokens = Object.values(tokensObject)
    const filteredToken = tokens.find((token) => token.slug === protocol)
    return filteredToken?.address || ''
  } catch (error) {
    return false
  }
}

export function getTokenIdFromName(tokensObject, protocol) {
  try {
    const tokens = Object.values(tokensObject)
    const filteredToken = tokens.findIndex((token) => token.name.toLowerCase().replace(' ', '-') === protocol)
    return filteredToken
  } catch (error) {
    return false
  }
}

export function getTokenFromName(tokensObject, protocol) {
  try {
    const tokens = Object.values(tokensObject)
    const filteredToken = tokens.find((token) => token.slug === protocol)
    return filteredToken
  } catch (error) {
    return false
  }
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

export const getTokenDominance = (topToken, totalVolume) => {
  const dominance = topToken.tvl && totalVolume && (topToken.tvl / totalVolume) * 100.0

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

export function download(filename, text) {
  var element = document.createElement('a')
  element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(text))
  element.setAttribute('download', filename)

  element.style.display = 'none'
  document.body.appendChild(element)

  element.click()

  document.body.removeChild(element)
}
