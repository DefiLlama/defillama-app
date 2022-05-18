import React from 'react'
import dynamic from 'next/dynamic'
import { transparentize } from 'polished'
import { useCalcSingleExtraTvl } from '../../hooks/data'
import { useScrollToTop, useProtocolColor, useXl, useLg } from 'hooks'
import { ThemedBackground } from 'Theme'
import { formattedNum, getBlockExplorer } from 'utils'
import SEO from 'components/SEO'
import {
  toNiceDate,
  toNiceMonthlyDate,
  toNiceHour,
  toNiceDayAndHour,
} from 'utils'

const ProtocolChart = dynamic(() => import('components/ProtocolChart'), { ssr: false })
const AreaChart = dynamic(() => import('components/TokenChart/AreaChart'))
const BarChart = dynamic(() => import('components/TokenChart/BarChart'))


function ProtocolContainer({ protocolData, protocol, denomination, selectedChain }) {
  useScrollToTop()

  let {
    address = '',
    name,
    symbol,
    url,
    description,
    tvl,
    logo,
    audits,
    category,
    tvlList: chartData,
    twitter,
    currentChainTvls: chainTvls = {},
    chainTvls: historicalChainTvls,
    audit_links,
    methodology,
    module: codeModule,
    isHourlyChart,
    chainsStacked,
    chainsList,
    chains,
    tokenBreakdown,
    tokensUnique,
    usdInflows,
    tokenInflows,
    ...protocolParams
  } = protocolData
  const backgroundColor = useProtocolColor({ protocol, logo, transparent: false })
  const { blockExplorerLink, blockExplorerName } = getBlockExplorer(address)

  const totalVolume = useCalcSingleExtraTvl(chainTvls, tvl)

  const belowXl = useXl()
  const belowLg = useLg()

  const aspect = belowXl ? (!belowLg ? 60 / 42 : 60 / 22) : 60 / 22

  const formatDate = (date) => {
    if (isHourlyChart) {
      return chartData?.length > 24 ? toNiceDayAndHour(date) : toNiceHour(date)
    } else {
      return chartData?.length > 120 ? toNiceMonthlyDate(date) : toNiceDate(date)
    }
  }

  return (
    <>
      <SEO cardName={name} token={name} logo={logo} tvl={formattedNum(totalVolume, true)} />
      <ThemedBackground backgroundColor={transparentize(0.6, backgroundColor)} />

      <AreaChart finalChartData={chainsStacked} aspect={aspect} formatDate={formatDate} color={backgroundColor}
        tokensUnique={chains}
      />
      {tokenBreakdown && <AreaChart finalChartData={tokenBreakdown} aspect={aspect} formatDate={formatDate} color={backgroundColor}
        tokensUnique={tokensUnique}
      />}

      {usdInflows &&
        <BarChart finalChartData={usdInflows} aspect={aspect} formatDate={formatDate} color={backgroundColor}
          tokensUnique={[]}
        />
      }

      {tokenInflows &&
        <BarChart finalChartData={tokenInflows} aspect={aspect} formatDate={formatDate} color={backgroundColor}
          tokensUnique={tokensUnique}
        />
      }

    </ >
  )
}

export default ProtocolContainer
