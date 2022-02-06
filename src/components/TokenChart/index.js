import React, { useState, useEffect, useMemo } from 'react'
import styled from 'styled-components'
import { Area, XAxis, YAxis, ResponsiveContainer, Tooltip, AreaChart, BarChart, Bar, ReferenceLine } from 'recharts'
import { useRouter } from 'next/router'
import { BasicLink } from 'components/Link'

import { OptionButton } from 'components/ButtonStyled'
import { AutoColumn } from 'components/Column'
import DropdownSelect from 'components/DropdownSelect'
import LocalLoader from 'components/LocalLoader'
import { AutoRow, RowBetween, RowFixed } from 'components/Row'

import { timeframeOptions } from 'constants/index'
import { chainCoingeckoIds } from 'constants/chainTokens'
import { useDarkModeManager } from 'contexts/LocalStorage'
import { fetchAPI } from 'contexts/API'
import { useXl, useLg, useMed } from 'hooks'
import {
  toK,
  toNiceDate,
  toNiceDateYear,
  formattedNum,
  getTimeframe,
  toNiceMonthlyDate,
  toNiceHour,
  toNiceDayAndHour,
} from 'utils'

const ChartWrapper = styled.div`
  height: 100%;
  min-height: 300px;

  @media screen and (max-width: 600px) {
    min-height: 200px;
  }
`

const CHART_VIEW = {
  VOLUME: 'Volume',
  LIQUIDITY: 'Liquidity',
  PRICE: 'Price',
  LINE_PRICE: 'Price (Line)',
}

const BASIC_DENOMINATIONS = {
  USD: 'USD',
  ETH: 'ETH',
  TokensUSD: 'Tokens(USD)',
  Tokens: 'Tokens',
  Change: 'Change',
  ChangeSplit: 'ChangeSplit',
  Chains: 'Chains',
}

function stringToColour() {
  return '#' + ((Math.random() * 0xffffff) << 0).toString(16).padStart(6, '0')
}

export function GeneralAreaChart({aspect, finalChartData, tokensUnique, textColor, color, moneySymbol, formatDate, hallmarks}){
  return <ResponsiveContainer aspect={aspect}>
  <AreaChart margin={{ top: 0, right: 10, bottom: 6, left: 0 }} barCategoryGap={1} data={finalChartData}>
    <defs>
      <linearGradient id="colorUv" x1="0" y1="0" x2="0" y2="1">
        <stop offset="5%" stopColor={color} stopOpacity={0.35} />
        <stop offset="95%" stopColor={color} stopOpacity={0} />
      </linearGradient>
    </defs>
    <XAxis
      tickLine={false}
      axisLine={false}
      interval="preserveEnd"
      tickMargin={16}
      minTickGap={120}
      tickFormatter={formatDate}
      dataKey={tokensUnique.length > 0 ? 'date' : '0'}
      scale="time"
      type="number"
      tick={{ fill: textColor }}
      domain={['dataMin', 'dataMax']}
    />
    <YAxis
      type="number"
      orientation="right"
      tickFormatter={(tick) => moneySymbol + toK(tick)}
      axisLine={false}
      tickLine={false}
      interval="preserveEnd"
      minTickGap={80}
      yAxisId={0}
      tick={{ fill: textColor }}
    />
    <Tooltip
      cursor={true}
      formatter={(val) => formattedNum(val, moneySymbol === '$')}
      labelFormatter={(label) => toNiceDateYear(label)}
      labelStyle={{ paddingTop: 4 }}
      itemSorter={(item) => -item.value}
      contentStyle={{
        padding: '10px 14px',
        borderRadius: 10,
        borderColor: color,
        color: 'black',
      }}
      wrapperStyle={{ top: -70, left: -10 }}
    />
    {hallmarks.map((hallmark, i) => (
      <ReferenceLine
        x={hallmark[0]}
        stroke={textColor}
        label={{ value: hallmark[1], fill: textColor, position: 'insideTop', offset: ((i * 50) % 300) + 50 }}
        key={'hall1' + i}
      />
    ))}
    {tokensUnique.length > 0 ? (
      tokensUnique.map((tokenSymbol) => {
        const randomColor = stringToColour()
        return (
          <Area
            type="monotone"
            dataKey={tokenSymbol}
            key={tokenSymbol}
            stackId="1"
            fill={randomColor}
            stroke={randomColor}
          />
        )
      })
    ) : (
      <Area
        key={'other'}
        dataKey="1"
        isAnimationActive={false}
        stackId="2"
        strokeWidth={2}
        dot={false}
        type="monotone"
        name={'TVL'}
        yAxisId={0}
        stroke={color}
        fill="url(#colorUv)"
      />
    )}
  </AreaChart>
</ResponsiveContainer>
}

const ALL_CHAINS = 'All Chains'
const TokenChart = ({
  small = false,
  color,
  data,
  tokens,
  tokensInUsd,
  chainTvls,
  misrepresentedTokens,
  denomination: initialDenomination,
  chains,
  selectedChain = 'all',
  hallmarks = [],
  isHourlyChart,
}) => {
  let DENOMINATIONS = BASIC_DENOMINATIONS
  let chainDenomination
  if (selectedChain !== 'all' || chains.length === 1) {
    chainDenomination = chainCoingeckoIds[selectedChain] ?? chainCoingeckoIds[chains[0]]
    if (chainDenomination !== undefined) {
      DENOMINATIONS = {
        ...BASIC_DENOMINATIONS,
        [chainDenomination.symbol]: chainDenomination.symbol,
      }
    }
  }

  const denomination =
    Object.values(DENOMINATIONS).find(
      (den) => den?.toLowerCase() === initialDenomination?.split('-')?.[0]?.toLowerCase()
    ) ?? DENOMINATIONS.USD

  const balanceToken = initialDenomination?.substr(initialDenomination.indexOf('-') + 1)

  const [denominationPriceHistory, setDenominationPriceHistory] = useState(undefined)
  const chartFilter =
    denomination === DENOMINATIONS.Change || denomination === DENOMINATIONS.ChangeSplit
      ? CHART_VIEW.VOLUME
      : CHART_VIEW.LIQUIDITY

  const [darkMode] = useDarkModeManager()
  const textColor = darkMode ? 'white' : 'black'

  const router = useRouter()
  const buildUrl = () => {
    const splitLocation = router.asPath.split('/')
    if (splitLocation.length < 4) {
      splitLocation.push(selectedChain)
    }
    if (splitLocation.length < 5) {
      splitLocation.push(denomination)
    }
    return splitLocation
  }
  const buildDenomUrl = (denom) => {
    const splitLocation = buildUrl()
    splitLocation[4] = denom
    return splitLocation.join('/')
  }
  const buildChainUrl = (newChain) => {
    const splitLocation = buildUrl()
    splitLocation[3] = newChain === ALL_CHAINS ? 'all' : newChain
    return splitLocation.join('/')
  }

  let chartData = data
  if (selectedChain !== 'all') {
    chartData = chainTvls[selectedChain].tvl.map(({ date, totalLiquidityUSD }) => [date, totalLiquidityUSD])
    tokens = chainTvls[selectedChain].tokens
    tokensInUsd = chainTvls[selectedChain].tokensInUsd
  }

  const [timeWindow, setTimeWindow] = useState(timeframeOptions.ALL_TIME)

  let utcStartTime = 0
  if (timeWindow !== timeframeOptions.ALL_TIME) {
    utcStartTime = getTimeframe(timeWindow)
    chartData = chartData?.filter((entry) => entry[0] >= utcStartTime)
    tokens = tokens?.filter((entry) => entry[0] >= utcStartTime)
    tokensInUsd = tokensInUsd?.filter((entry) => entry[0] >= utcStartTime)
  }

  //const domain = [dataMin => (dataMin > utcStartTime ? dataMin : utcStartTime), 'dataMax']
  const belowXl = useXl()
  const belowLg = useLg()
  const belowMed = useMed()
  // Use chainTvls to determine if this is a chain page
  const aspect = belowXl ? (!belowLg ? 60 / 42 : 60 / 22) : 60 / 22

  const [stackedDataset, tokensUnique] = useMemo(() => {
    if (denomination === DENOMINATIONS.TokensUSD) {
      const tokenSet = new Set()
      const stacked = tokensInUsd.map((dayTokens) => {
        Object.keys(dayTokens.tokens).forEach((symbol) => tokenSet.add(symbol))
        return {
          ...Object.fromEntries(
            Object.entries(dayTokens.tokens).filter((t) => !(t[0].startsWith('UNKNOWN') && t[1] < 1))
          ),
          date: dayTokens.date,
        }
      })
      return [stacked, Array.from(tokenSet)]
    } else if (denomination === DENOMINATIONS.Chains) {
      const timeToTvl = {}

      Object.entries(chainTvls).forEach(([chainToAdd, tvl]) => {
        tvl.tvl.forEach((dayTvl) => {
          timeToTvl[dayTvl.date] = {
            ...timeToTvl[dayTvl.date],
            [chainToAdd]: dayTvl.totalLiquidityUSD,
          }
        })
      })

      const stacked = Object.keys(timeToTvl)
        .sort((a, b) => Number(a) - Number(b))
        .map((dayDate) => ({
          ...timeToTvl[dayDate],
          // kinda scuffed but gotta fix the datakey for chart again
          date: Number(dayDate),
        }))
      return [stacked, Object.keys(chainTvls)]
    }
    return [undefined, []]
  }, [tokensInUsd, denomination, chainTvls, DENOMINATIONS])

  if (denomination === DENOMINATIONS.TokensUSD || denomination === DENOMINATIONS.Chains) {
    chartData = stackedDataset
  }

  useEffect(() => {
    if (
      (denomination === DENOMINATIONS.ETH || denomination === chainDenomination?.symbol) &&
      (denominationPriceHistory === undefined || denominationPriceHistory.asset !== denomination)
    ) {
      fetchAPI(
        `https://api.coingecko.com/api/v3/coins/${
          denomination === DENOMINATIONS.ETH ? 'ethereum' : chainDenomination.geckoId
        }/market_chart/range?vs_currency=usd&from=${utcStartTime}&to=${Math.floor(Date.now() / 1000)}`
      ).then((data) =>
        setDenominationPriceHistory({
          asset: denomination,
          prices: data.prices,
        })
      )
    }
  }, [denomination, chainDenomination, utcStartTime, DENOMINATIONS, denominationPriceHistory])

  const [finalChartData, tokenSet] = useMemo(() => {
    if (denomination === DENOMINATIONS.ETH || denomination === chainDenomination?.symbol) {
      if (denominationPriceHistory !== undefined && denominationPriceHistory.asset === denomination) {
        let priceIndex = 0
        let prevPriceDate = 0
        const denominationPrices = denominationPriceHistory.prices
        const newChartData = []
        for (let i = 0; i < chartData.length; i++) {
          const date = chartData[i][0] * 1000
          while (
            priceIndex < denominationPrices.length &&
            Math.abs(date - prevPriceDate) > Math.abs(date - denominationPrices[priceIndex][0])
          ) {
            prevPriceDate = denominationPrices[priceIndex][0]
            priceIndex++
          }
          const price = denominationPrices[priceIndex - 1][1]
          newChartData.push([chartData[i][0], chartData[i][1] / price])
        }
        chartData = newChartData
      } else {
        chartData = undefined
      }
    }
    if (denomination === DENOMINATIONS.Tokens) {
      chartData = []
      tokens.forEach((tokenSnapshot) => {
        chartData.push([tokenSnapshot.date, tokenSnapshot.tokens[balanceToken] ?? 0])
      })
    }
    let tokenSet = new Set()
    if (denomination === DENOMINATIONS.Change || denomination === DENOMINATIONS.ChangeSplit) {
      chartData = []
      for (let i = 1; i < tokensInUsd.length; i++) {
        let dayDifference = 0
        let tokenDayDifference = {}
        for (const token in tokensInUsd[i].tokens) {
          tokenSet.add(token)
          const price = tokensInUsd[i].tokens[token] / tokens[i].tokens[token]
          const diff = (tokens[i].tokens[token] ?? 0) - (tokens[i - 1].tokens[token] ?? 0)
          const diffUsd = price * diff
          if (diffUsd) {
            tokenDayDifference[token] = diffUsd
            dayDifference += diffUsd
          }
        }
        if (denomination === DENOMINATIONS.Change) {
          chartData.push({
            date: tokensInUsd[i].date,
            dailyVolumeUSD: dayDifference,
          })
        } else {
          chartData.push({
            ...tokenDayDifference,
            date: tokensInUsd[i].date,
          })
        }
      }
    }
    return [chartData, tokenSet]
  }, [denomination, chartData, denominationPriceHistory, tokens, tokensInUsd, balanceToken])

  let moneySymbol = '$'
  switch (denomination) {
    case DENOMINATIONS.ETH:
      moneySymbol = 'Ξ'
      break
    case chainDenomination?.symbol:
      moneySymbol = chainDenomination.symbol.slice(0, 1)
      break
    case DENOMINATIONS.Tokens:
      moneySymbol = ''
      break
    default:
      moneySymbol = '$'
  }

  let formatDate = (date) => {
    if (isHourlyChart) {
      return finalChartData?.length > 24 ? toNiceDayAndHour(date) : toNiceHour(date)
    } else {
      return finalChartData?.length > 120 ? toNiceMonthlyDate(date) : toNiceDate(date)
    }
  }

  const tokensProvided =
    tokensInUsd &&
    tokensInUsd.length !== 0 &&
    !tokensInUsd.some((data) => !data.tokens) &&
    misrepresentedTokens === undefined
  const denominationsToDisplay = {
    USD: 'USD',
    ETH: 'ETH',
  }
  if (chainDenomination) {
    denominationsToDisplay[chainDenomination.symbol] = chainDenomination.symbol
  }
  if (tokensProvided) {
    denominationsToDisplay['TokensUSD'] = 'Tokens(USD)'
    if (!small) {
      denominationsToDisplay['Change'] = 'Change'
      denominationsToDisplay['ChangeSplit'] = 'ChangeSplit'
    }
  }
  if (chainTvls) {
    denominationsToDisplay['Chains'] = 'Chains'
  }
  const tokenSymbols = tokensProvided
    ? Object.keys(tokensInUsd[tokensInUsd.length - 1]?.tokens).sort((a, b) => a.localeCompare(b))
    : undefined

  return (
    <ChartWrapper>
      {belowMed ? (
        <RowBetween mb={40}>
          <DropdownSelect
            options={Object.values(denominationsToDisplay).map((d) => ({
              label: d,
              to: buildDenomUrl(d),
            }))}
            active={denomination}
            color={color}
          />
          <DropdownSelect
            options={Object.values(timeframeOptions).map((t) => ({ label: t }))}
            active={timeWindow}
            setActive={setTimeWindow}
            color={color}
          />
        </RowBetween>
      ) : (
        <RowBetween
          mb={chartFilter === CHART_VIEW.LIQUIDITY || chartFilter === CHART_VIEW.VOLUME ? 40 : 0}
          align="flex-start"
        >
          <AutoColumn gap="0px">
            <RowFixed>
              {Object.values(denominationsToDisplay).map((option) => (
                <BasicLink href={buildDenomUrl(option)} key={option}>
                  <OptionButton active={denomination === option} style={{ marginRight: '6px' }}>
                    {option}
                  </OptionButton>
                </BasicLink>
              ))}
              {tokenSymbols && !small && (
                <DropdownSelect
                  options={tokenSymbols.map((symbol) => ({
                    label: symbol,
                    to: buildDenomUrl(`${DENOMINATIONS.Tokens}-${symbol}`),
                  }))}
                  active={denomination === DENOMINATIONS.Tokens ? balanceToken : 'Tokens'}
                  color={color}
                  style={{ marginRight: '6px' }}
                />
              )}
              {chainTvls && Object.keys(chainTvls).length > 1 && (
                <DropdownSelect
                  options={[ALL_CHAINS].concat(Object.keys(chainTvls)).map((chain) => ({
                    label: chain,
                    to: buildChainUrl(chain),
                  }))}
                  active={selectedChain === 'all' ? ALL_CHAINS : selectedChain}
                  color={color}
                />
              )}
            </RowFixed>
          </AutoColumn>
          <AutoRow style={{ width: 'fit-content' }} justify="flex-end" gap="6px" align="flex-start">
            <OptionButton
              active={timeWindow === timeframeOptions.MONTH}
              onClick={() => setTimeWindow(timeframeOptions.MONTH)}
            >
              1M
            </OptionButton>
            <OptionButton
              active={timeWindow === timeframeOptions.YEAR}
              onClick={() => setTimeWindow(timeframeOptions.YEAR)}
            >
              1Y
            </OptionButton>
            <OptionButton
              active={timeWindow === timeframeOptions.ALL_TIME}
              onClick={() => setTimeWindow(timeframeOptions.ALL_TIME)}
            >
              All
            </OptionButton>
          </AutoRow>
        </RowBetween>
      )}
      {finalChartData === undefined && <LocalLoader />}
      {chartFilter === CHART_VIEW.LIQUIDITY && finalChartData && (
        <GeneralAreaChart {...({aspect, finalChartData, tokensUnique, textColor, color, moneySymbol, formatDate, hallmarks})} />
      )}
      {chartFilter === CHART_VIEW.VOLUME && finalChartData && (
        <ResponsiveContainer aspect={aspect}>
          <BarChart margin={{ top: 0, right: 10, bottom: 6, left: 10 }} barCategoryGap={1} data={finalChartData}>
            <XAxis
              tickLine={false}
              axisLine={false}
              interval="preserveEnd"
              minTickGap={80}
              tickMargin={14}
              tickFormatter={formatDate}
              dataKey="date"
              scale="time"
              type="number"
              tick={{ fill: textColor }}
              domain={['dataMin', 'dataMax']}
            />
            <YAxis
              type="number"
              axisLine={false}
              tickMargin={16}
              tickFormatter={(tick) => moneySymbol + toK(tick)}
              tickLine={false}
              orientation="right"
              interval="preserveEnd"
              minTickGap={80}
              yAxisId={0}
              tick={{ fill: textColor }}
            />
            {hallmarks.map((hallmark, i) => (
              <ReferenceLine x={hallmark[0]} stroke="red" label={hallmark[1]} key={'hall2' + i} />
            ))}
            <Tooltip
              cursor={{ fill: color, opacity: 0.1 }}
              formatter={(val) => formattedNum(val, true)}
              labelFormatter={(label) => toNiceDateYear(label)}
              labelStyle={{ paddingTop: 4 }}
              contentStyle={{
                padding: '10px 14px',
                borderRadius: 10,
                borderColor: color,
                color: 'black',
              }}
              wrapperStyle={{ top: -70, left: -10 }}
            />
            {denomination === DENOMINATIONS.Change ? (
              <Bar
                type="monotone"
                name={'Daily Change'}
                dataKey={'dailyVolumeUSD'}
                fill={color}
                opacity={'0.8'}
                yAxisId={0}
                stroke={color}
              />
            ) : (
              Array.from(tokenSet).map((token) => (
                <Bar
                  key={token}
                  type="monotone"
                  dataKey={token}
                  fill={stringToColour(token)}
                  opacity={'0.8'}
                  yAxisId={0}
                  stackId="stack"
                />
              ))
            )}
          </BarChart>
        </ResponsiveContainer>
      )}
    </ChartWrapper>
  )
}

export default TokenChart
