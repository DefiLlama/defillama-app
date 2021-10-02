import React, { useState, useRef, useEffect, useMemo } from 'react'
import styled from 'styled-components'
import { Area, XAxis, YAxis, ResponsiveContainer, Tooltip, AreaChart, BarChart, Bar } from 'recharts'
import { AutoRow, RowBetween, RowFixed } from '../Row'
import { useHistory, useLocation } from "react-router-dom";

import { toK, toNiceDate, toNiceDateYear, formattedNum, getTimeframe, toNiceMonthlyDate } from '../../utils'
import { OptionButton } from '../ButtonStyled'
import { useMedia, usePrevious } from 'react-use'
import { timeframeOptions } from '../../constants'
import DropdownSelect from '../DropdownSelect'
import LocalLoader from '../LocalLoader'
import { AutoColumn } from '../Column'
import { Activity } from 'react-feather'
import { useDarkModeManager } from '../../contexts/LocalStorage'
import { fetchAPI } from '../../contexts/API'
import { chainCoingeckoIds } from '../../constants/chainTokens'

const ChartWrapper = styled.div`
  height: 100%;
  min-height: 300px;

  @media screen and (max-width: 600px) {
    min-height: 200px;
  }
`

const PriceOption = styled(OptionButton)`
  border-radius: 2px;
`

const CHART_VIEW = {
  VOLUME: 'Volume',
  LIQUIDITY: 'Liquidity',
  PRICE: 'Price',
  LINE_PRICE: 'Price (Line)'
}

const DATA_FREQUENCY = {
  DAY: 'DAY',
  HOUR: 'HOUR',
  LINE: 'LINE'
}

const BASIC_DENOMINATIONS = {
  USD: 'USD',
  ETH: 'ETH',
  TokensUSD: 'Tokens(USD)',
  Tokens: 'Tokens',
  Change: 'Change',
  ChangeSplit: 'ChangeSplit'
}

function stringToColour(str) {
  var hash = 0;
  for (var i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  var colour = '#';
  for (var i = 0; i < 3; i++) {
    var value = (hash >> (i * 8)) & 0xFF;
    colour += ('00' + value.toString(16)).substr(-2);
  }
  return colour;
}

const ALL_CHAINS = "All Chains"
const TokenChart = ({ small = false, color, base, data, tokens, tokensInUsd, chainTvls, misrepresentedTokens, denomination: initialDenomination, chains, selectedChain = "all" }) => {
  // settings for the window and candle width
  const [frequency, setFrequency] = useState(DATA_FREQUENCY.HOUR)

  let DENOMINATIONS = BASIC_DENOMINATIONS
  let chainDenomination;
  if (selectedChain !== 'all' || chains.length === 1) {
    chainDenomination = chainCoingeckoIds[selectedChain] ?? chainCoingeckoIds[chains[0]];
    if (chainDenomination !== undefined) {
      DENOMINATIONS = {
        ...BASIC_DENOMINATIONS,
        [chainDenomination.symbol]: chainDenomination.symbol
      }
    }
  }

  const denomination = Object.values(DENOMINATIONS).find(den => den.toLowerCase() === initialDenomination?.split('-')?.[0].toLowerCase()) ?? DENOMINATIONS.USD
  const balanceToken = initialDenomination?.substr(initialDenomination.indexOf('-') + 1)
  const [denominationPriceHistory, setDenominationPriceHistory] = useState(undefined)
  const chartFilter = (denomination === DENOMINATIONS.Change || denomination === DENOMINATIONS.ChangeSplit) ? CHART_VIEW.VOLUME : CHART_VIEW.LIQUIDITY

  const [darkMode] = useDarkModeManager()
  const textColor = darkMode ? 'white' : 'black'

  const history = useHistory();
  const location = useLocation();
  const buildUrl = () => {
    const splitLocation = location.pathname.split('/')
    if (splitLocation.length < 4) {
      splitLocation.push(selectedChain)
    }
    if (splitLocation.length < 5) {
      splitLocation.push(denomination)
    }
    return splitLocation
  }
  const setDenomination = (newDenomination) => {
    const splitLocation = buildUrl()
    splitLocation[4] = newDenomination
    history.push(splitLocation.join('/'))
  }
  const setSelectedChain = newChain => {
    const splitLocation = buildUrl()
    splitLocation[3] = newChain === ALL_CHAINS ? 'all' : newChain
    history.push(splitLocation.join('/'))
  }

  let chartData = data;
  if (selectedChain !== "all") {
    chartData = chainTvls[selectedChain].tvl;
    base = chartData[chartData.length - 1].totalLiquidityUSD;
    tokens = chainTvls[selectedChain].tokens;
    tokensInUsd = chainTvls[selectedChain].tokensInUsd
  }

  const [timeWindow, setTimeWindow] = useState(timeframeOptions.ALL_TIME)
  const prevWindow = usePrevious(timeWindow)

  // switch to hourly data when switched to week window
  useEffect(() => {
    if (timeWindow === timeframeOptions.WEEK && prevWindow && prevWindow !== timeframeOptions.WEEK) {
      setFrequency(DATA_FREQUENCY.HOUR)
    }
  }, [prevWindow, timeWindow])

  // switch to daily data if switche to month or all time view
  useEffect(() => {
    if (timeWindow === timeframeOptions.MONTH && prevWindow && prevWindow !== timeframeOptions.MONTH) {
      setFrequency(DATA_FREQUENCY.DAY)
    }
    if (timeWindow === timeframeOptions.ALL_TIME && prevWindow && prevWindow !== timeframeOptions.ALL_TIME) {
      setFrequency(DATA_FREQUENCY.DAY)
    }
  }, [prevWindow, timeWindow])

  const below1080 = useMedia('(max-width: 1080px)')
  const below600 = useMedia('(max-width: 600px)')

  let utcStartTime = 0
  if (timeWindow !== timeframeOptions.ALL_TIME) {
    utcStartTime = getTimeframe(timeWindow)
    chartData = chartData?.filter(entry => entry.date >= utcStartTime)
    tokens = tokens?.filter(entry => entry.date >= utcStartTime);
    tokensInUsd = tokensInUsd?.filter(entry => entry.date >= utcStartTime)
  }

  const domain = [dataMin => (dataMin > utcStartTime ? dataMin : utcStartTime), 'dataMax']
  const aspect = below1080 ? 60 / 32 : below600 ? 60 / 42 : 60 / 22

  const [stackedDataset, tokensUnique] = useMemo(() => {
    if (denomination !== DENOMINATIONS.TokensUSD) {
      return [undefined, []]
    }
    const tokenSet = new Set();
    const stacked = tokensInUsd.map(dayTokens => {
      Object.keys(dayTokens.tokens).forEach(symbol => tokenSet.add(symbol))
      return {
        ...Object.fromEntries(Object.entries(dayTokens.tokens).filter(t => !(t[0].startsWith("UNKNOWN") && t[1] < 1))),
        date: dayTokens.date
      }
    })
    return [stacked, Array.from(tokenSet)]
  }, [tokensInUsd, denomination])
  if (denomination === DENOMINATIONS.TokensUSD) {
    chartData = stackedDataset
  }

  useEffect(() => {
    if ((denomination === DENOMINATIONS.ETH || denomination === chainDenomination?.symbol) && (denominationPriceHistory === undefined || denominationPriceHistory.asset !== denomination)) {
      fetchAPI(`https://api.coingecko.com/api/v3/coins/${denomination === DENOMINATIONS.ETH ? 'ethereum' : chainDenomination.geckoId}/market_chart/range?vs_currency=usd&from=${utcStartTime}&to=${Math.floor(Date.now() / 1000)}`).then(data => setDenominationPriceHistory({
        asset: denomination,
        prices: data.prices
      }))
    }
  }, [denomination])

  const [finalChartData, tokenSet] = useMemo(() => {
    if (denomination === DENOMINATIONS.ETH || denomination === chainDenomination?.symbol) {
      if (denominationPriceHistory !== undefined && denominationPriceHistory.asset === denomination) {
        let priceIndex = 0;
        let prevPriceDate = 0
        const denominationPrices = denominationPriceHistory.prices;
        const newChartData = []
        for (let i = 0; i < chartData.length; i++) {
          const date = chartData[i].date * 1000;
          while (priceIndex < denominationPrices.length && Math.abs(date - prevPriceDate) > Math.abs(date - denominationPrices[priceIndex][0])) {
            prevPriceDate = denominationPrices[priceIndex][0];
            priceIndex++;
          }
          const price = denominationPrices[priceIndex - 1][1];
          //console.log(join(new Date(date), a, '-'), price, chartData[i].totalLiquidityUSD, chartData[i].totalLiquidityUSD / price)
          newChartData.push({
            date: chartData[i].date,
            totalLiquidityUSD: chartData[i].totalLiquidityUSD / price
          })
        }
        chartData = newChartData;
      } else {
        chartData = undefined
      }
    }
    if (denomination === DENOMINATIONS.Tokens) {
      chartData = [];
      tokens.forEach(tokenSnapshot => {
        chartData.push({
          date: tokenSnapshot.date,
          totalLiquidityUSD: tokenSnapshot.tokens[balanceToken] ?? 0
        })
      })
    }
    let tokenSet = new Set()
    if (denomination === DENOMINATIONS.Change || denomination === DENOMINATIONS.ChangeSplit) {
      chartData = [];
      for (let i = 1; i < tokensInUsd.length; i++) {
        let dayDifference = 0;
        let tokenDayDifference = {}
        for (const token in tokensInUsd[i].tokens) {
          tokenSet.add(token);
          const price = tokensInUsd[i].tokens[token] / tokens[i].tokens[token];
          const diff = (tokens[i].tokens[token] ?? 0) - (tokens[i - 1].tokens[token] ?? 0);
          const diffUsd = price * diff
          if (diffUsd) {
            tokenDayDifference[token] = diffUsd
            dayDifference += diffUsd
          }
        }
        if (denomination === DENOMINATIONS.Change) {
          chartData.push({
            date: tokensInUsd[i].date,
            dailyVolumeUSD: dayDifference
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
  }, [denomination, chartData, denominationPriceHistory, tokens, tokensInUsd, balanceToken]);

  // update the width on a window resize
  const ref = useRef()
  const isClient = typeof window === 'object'
  const [width, setWidth] = useState(ref?.current?.container?.clientWidth)
  useEffect(() => {
    if (!isClient) {
      return false
    }
    function handleResize() {
      setWidth(ref?.current?.container?.clientWidth ?? width)
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [isClient, width]) // Empty array ensures that effect is only run on mount and unmount

  let moneySymbol = '$';
  switch (denomination) {
    case DENOMINATIONS.ETH:
      moneySymbol = 'Ξ';
      break;
    case chainDenomination?.symbol:
      moneySymbol = chainDenomination.symbol.slice(0, 1);
      break;
    case DENOMINATIONS.Tokens:
      moneySymbol = '';
      break;
  }

  const formatDate = finalChartData?.length > 120 ? toNiceMonthlyDate : toNiceDate
  const tokensProvided = tokensInUsd !== undefined && tokensInUsd.length !== 0 && !tokensInUsd.some(data => !data.tokens) && misrepresentedTokens === undefined
  const denominationsToDisplay = {
    USD: 'USD',
    ETH: 'ETH',
  };
  if (chainDenomination) {
    denominationsToDisplay[chainDenomination.symbol] = chainDenomination.symbol
  }
  if (tokensProvided) {
    denominationsToDisplay['TokensUSD'] = 'Tokens(USD)';
    if (!small) {
      denominationsToDisplay['Change'] = 'Change'
      denominationsToDisplay['ChangeSplit'] = 'ChangeSplit'
    }
  }
  console.log(denominationsToDisplay)
  const tokenSymbols = useMemo(() => tokensProvided ? Object.entries(tokensInUsd[tokensInUsd.length - 1].tokens).sort((a, b) => b[1] - a[1]).map(t => t[0]) : undefined)
  return (
    <ChartWrapper>
      {below600 ? (
        <RowBetween mb={40}>
          <DropdownSelect options={denominationsToDisplay} active={denomination} setActive={setDenomination} color={color} />
          <DropdownSelect options={timeframeOptions} active={timeWindow} setActive={setTimeWindow} color={color} />
        </RowBetween>
      ) : (
        <RowBetween
          mb={
            chartFilter === CHART_VIEW.LIQUIDITY ||
              chartFilter === CHART_VIEW.VOLUME ||
              (chartFilter === CHART_VIEW.PRICE && frequency === DATA_FREQUENCY.LINE)
              ? 40
              : 0
          }
          align="flex-start"
        >
          <AutoColumn gap="8px">
            <RowFixed>
              {Object.values(denominationsToDisplay).map(option => <OptionButton
                active={denomination === option}
                onClick={() => setDenomination(option)}
                style={{ marginRight: '6px', zIndex: '99' }}
                key={option}
              >
                {option}
              </OptionButton>
              )}
              {tokenSymbols && !small && <DropdownSelect options={tokenSymbols} active={denomination === DENOMINATIONS.Tokens ? balanceToken : 'Tokens'} setActive={(token) => {
                setDenomination(`${DENOMINATIONS.Tokens}-${token}`)
              }} color={color} style={{ marginRight: '6px' }} />}
              {chainTvls && Object.keys(chainTvls).length > 1 && <DropdownSelect options={[ALL_CHAINS].concat(Object.keys(chainTvls))} active={selectedChain === 'all' ? ALL_CHAINS : selectedChain} setActive={(chain) => {
                setSelectedChain(chain)
              }} color={color} />}
            </RowFixed>
            {chartFilter === CHART_VIEW.PRICE && (
              <AutoRow gap="4px">
                <PriceOption
                  active={frequency === DATA_FREQUENCY.DAY}
                  onClick={() => {
                    setTimeWindow(timeframeOptions.MONTH)
                    setFrequency(DATA_FREQUENCY.DAY)
                  }}
                >
                  D
                </PriceOption>
                <PriceOption
                  active={frequency === DATA_FREQUENCY.HOUR}
                  onClick={() => setFrequency(DATA_FREQUENCY.HOUR)}
                >
                  H
                </PriceOption>
                <PriceOption
                  active={frequency === DATA_FREQUENCY.LINE}
                  onClick={() => setFrequency(DATA_FREQUENCY.LINE)}
                >
                  <Activity size={14} />
                </PriceOption>
              </AutoRow>
            )}
          </AutoColumn>
          <AutoRow justify="flex-end" gap="6px" align="flex-start">
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
        <ResponsiveContainer aspect={aspect}>
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
              dataKey="date"
              tick={{ fill: textColor }}
              domain={['dataMin', 'dataMax']}
            />
            <YAxis
              type="number"
              orientation="right"
              tickFormatter={tick => moneySymbol + toK(tick)}
              axisLine={false}
              tickLine={false}
              interval="preserveEnd"
              minTickGap={80}
              yAxisId={0}
              tick={{ fill: textColor }}
            />
            <Tooltip
              cursor={true}
              formatter={val => formattedNum(val, moneySymbol === '$')}
              labelFormatter={label => toNiceDateYear(label)}
              labelStyle={{ paddingTop: 4 }}
              itemSorter={item => -item.value}
              contentStyle={{
                padding: '10px 14px',
                borderRadius: 10,
                borderColor: color,
                color: 'black'
              }}
              wrapperStyle={{ top: -70, left: -10 }}
            />
            {tokensUnique.length > 0 ? tokensUnique.map(tokenSymbol => <Area
              type="monotone"
              dataKey={tokenSymbol}
              key={tokenSymbol}
              stackId="1"
              fill={stringToColour(tokenSymbol)}
              stroke={stringToColour(tokenSymbol)}
            />) :
              <Area
                key={'other'}
                dataKey={'totalLiquidityUSD'}
                stackId="2"
                strokeWidth={2}
                dot={false}
                type="monotone"
                name={'TVL'}
                yAxisId={0}
                stroke={color}
                fill="url(#colorUv)"
              />
            }
          </AreaChart>
        </ResponsiveContainer>
      )
      }
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
              tick={{ fill: textColor }}
              domain={['dataMin', 'dataMax']}
            />
            <YAxis
              type="number"
              axisLine={false}
              tickMargin={16}
              tickFormatter={tick => moneySymbol + toK(tick)}
              tickLine={false}
              orientation="right"
              interval="preserveEnd"
              minTickGap={80}
              yAxisId={0}
              tick={{ fill: textColor }}
            />
            <Tooltip
              cursor={{ fill: color, opacity: 0.1 }}
              formatter={val => formattedNum(val, true)}
              labelFormatter={label => toNiceDateYear(label)}
              labelStyle={{ paddingTop: 4 }}
              contentStyle={{
                padding: '10px 14px',
                borderRadius: 10,
                borderColor: color,
                color: 'black'
              }}
              wrapperStyle={{ top: -70, left: -10 }}
            />
            {denomination === DENOMINATIONS.Change ?
              <Bar
                type="monotone"
                name={'Daily Change'}
                dataKey={'dailyVolumeUSD'}
                fill={color}
                opacity={'0.8'}
                yAxisId={0}
                stroke={color}
              /> : Array.from(tokenSet).map(token => <Bar
                key={token}
                type="monotone"
                dataKey={token}
                fill={stringToColour(token)}
                opacity={'0.8'}
                yAxisId={0}
                stackId="stack"
              />)
            }
          </BarChart>
        </ResponsiveContainer>
      )
      }
    </ChartWrapper >
  )
}

export default TokenChart
