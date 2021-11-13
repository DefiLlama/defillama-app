import React, { useState, useMemo, useEffect, useRef } from 'react'
import { ResponsiveContainer } from 'recharts'
import TokenChart from '../TokenChart'
import { usePool2Manager, useStakingManager } from '../../contexts/LocalStorage'

const ProtocolChart = ({ chartData, protocol, small, tokens, tokensInUsd, chainTvls, misrepresentedTokens, color, denomination, selectedChain, chains, tokenData }) => {
  // global historical data

  // based on window, get starttim
  const [stakingEnabled] = useStakingManager()
  const [pool2Enabled] = usePool2Manager()

  const chartDataFiltered = useMemo(() => {
    let tvlDictionary = {}
    if (stakingEnabled || pool2Enabled) {
      for (const name of ['staking', 'pool2']) {
        if (chainTvls?.[name]) {
          tvlDictionary[name] = {}
          chainTvls[name].tvl.forEach(dataPoint => {
            tvlDictionary[name][dataPoint.date] = dataPoint.totalLiquidityUSD
          })
        }
      }
      return chartData?.map(item => ({
        date: item.date,
        totalLiquidityUSD: item.totalLiquidityUSD + (stakingEnabled ? (tvlDictionary.staking?.[item.date] ?? 0) : 0) + (pool2Enabled ? (tvlDictionary.pool2?.[item.date] ?? 0) : 0)
      }))
    }
    return chartData
  }, [chartData, stakingEnabled, pool2Enabled])

  let change = 100;
  if (chartDataFiltered.length > 1) {
    change = ((chartDataFiltered[chartDataFiltered.length - 1].totalLiquidityUSD - chartDataFiltered[chartDataFiltered.length - 2].totalLiquidityUSD) / chartDataFiltered[chartDataFiltered.length - 2].totalLiquidityUSD) * 100;
  }

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

  return chartDataFiltered ? (
    <>
      {chartDataFiltered && (
        <ResponsiveContainer aspect={60 / 28} ref={ref}>
          <TokenChart
            small={small}
            data={chartDataFiltered}
            base={chartDataFiltered[chartDataFiltered.length - 1].totalLiquidityUSD}
            baseChange={change}
            denomination={denomination}
            title={`${protocol} TVL`}
            field="totalLiquidityUSD"
            width={width}
            tokens={tokens}
            tokensInUsd={tokensInUsd}
            chainTvls={chainTvls}
            misrepresentedTokens={misrepresentedTokens}
            color={color}
            selectedChain={selectedChain}
            chains={chains ?? [protocol]}
            tokenData={tokenData}
          //type={CHART_TYPES.AREA}
          />
        </ResponsiveContainer>
      )}
    </>
  ) : (
    ''
  )
}

export default ProtocolChart
