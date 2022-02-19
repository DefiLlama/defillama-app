import React, { useState, useEffect, useMemo } from 'react'
import styled from 'styled-components'
import { useRouter } from 'next/router'
import { BasicLink } from 'components/Link'

import { OptionButton } from 'components/ButtonStyled'
import { AutoColumn } from 'components/Column'
import DropdownSelect from 'components/DropdownSelect'
import LocalLoader from 'components/LocalLoader'
import { AutoRow, RowBetween, RowFixed } from 'components/Row'

import { timeframeOptions } from 'constants/index'
import { useDarkModeManager } from 'contexts/LocalStorage'
import { useMed } from 'hooks'
import {
  getTimeframe,
} from 'utils'
import { GeneralAreaChart, GeneralBarChart } from './charts'
import { getAspectRatio } from './aspect'

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
  Tokens: 'Tokens',
}

const ALL_CHAINS = 'All Chains'
const TokenChart = ({
  small = false,
  color,
  data,
  tokens,
  chainsList,
  tokensUnique,
  denomination: initialDenomination,
  selectedChain = 'all',
  hallmarks = [],
  formatDate,
  chainDenomination,
  denominationPrices
}) => {
  let DENOMINATIONS = BASIC_DENOMINATIONS
  if (chainDenomination !== null) {
    DENOMINATIONS = {
      ...BASIC_DENOMINATIONS,
      [chainDenomination.symbol]: chainDenomination.symbol,
    }
  }

  const denomination =
    Object.values(DENOMINATIONS).find(
      (den) => den?.toLowerCase() === initialDenomination?.split('-')?.[0]?.toLowerCase()
    ) ?? DENOMINATIONS.USD

  const balanceToken = initialDenomination?.substr(initialDenomination.indexOf('-') + 1)

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

  const [timeWindow, setTimeWindow] = useState(timeframeOptions.ALL_TIME)

  let utcStartTime = 0
  if (timeWindow !== timeframeOptions.ALL_TIME) {
    utcStartTime = getTimeframe(timeWindow)
    chartData = chartData?.filter((entry) => entry[0] >= utcStartTime)
    tokens = tokens?.filter((entry) => entry[0] >= utcStartTime)
  }

  const belowMed = useMed()
  const aspect = getAspectRatio()

  const finalChartData = useMemo(() => {
    if (denomination === DENOMINATIONS.ETH || denomination === chainDenomination?.symbol) {
      let priceIndex = 0
      let prevPriceDate = 0
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
    }
    if (denomination === DENOMINATIONS.Tokens) {
      chartData = []
      tokens.forEach((tokenSnapshot) => {
        chartData.push([tokenSnapshot.date, tokenSnapshot.tokens[balanceToken] ?? 0])
      })
    }
    return chartData
  }, [denomination, chartData, tokens, balanceToken])

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

  const denominationsToDisplay = {
    USD: 'USD',
    ETH: 'ETH',
  }
  if (chainDenomination) {
    denominationsToDisplay[chainDenomination.symbol] = chainDenomination.symbol
  }
  const tokenSymbols = tokensUnique

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
          mb={40}
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
              {chainsList && chainsList.length > 1 && (
                <DropdownSelect
                  options={[ALL_CHAINS].concat(chainsList).map((chain) => ({
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
      <GeneralAreaChart {...({ aspect, finalChartData, tokensUnique: [], color, moneySymbol, formatDate, hallmarks })} />
      {/*(
        <GeneralBarChart tokenBreakdown={denomination === DENOMINATIONS.Change} {...({ aspect, finalChartData, tokenSet, textColor, color, moneySymbol, formatDate, hallmarks })} />
      */}
    </ChartWrapper>
  )
}

export default TokenChart
