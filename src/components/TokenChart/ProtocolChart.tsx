import React, { useMemo } from 'react'
import dynamic from 'next/dynamic'
import styled from 'styled-components'
import { transparentize } from 'polished'
import { useRouter } from 'next/router'
import Link from 'next/link'
import { useDenominationPriceHistory } from 'utils/dataApi'
import { useGetExtraTvlEnabled } from 'contexts/LocalStorage'

const AreaChart = dynamic(() => import('./AreaChart'), { ssr: false }) as any

interface IProps {
  protocol: string
  tvlChartData: any
  formatDate: (date: string) => string
  color: string
  historicalChainTvls: {},
  bobo?: boolean
}

export default function ({ protocol, tvlChartData, formatDate, color, historicalChainTvls, bobo=false }: IProps) {
  const router = useRouter()

  const extraTvlEnabled = useGetExtraTvlEnabled()

  const { denomination } = router.query

  // const {data, loading} = useDenominationPriceHistory()

  const sections = Object.keys(historicalChainTvls).filter((sect) => extraTvlEnabled[sect.toLowerCase()])

  const chartDataFiltered = useMemo(() => {
    const tvlDictionary = {}
    if (sections.length > 0) {
      for (const name of sections) {
        tvlDictionary[name] = {}
        historicalChainTvls[name].tvl.forEach((dataPoint) => {
          tvlDictionary[name][dataPoint.date] = dataPoint.totalLiquidityUSD
        })
      }
      return tvlChartData?.map((item) => {
        const sum = sections.reduce((total, sect) => total + (tvlDictionary[sect]?.[item[0]] ?? 0), item[1])
        return [item[0], sum]
      })
    } else return tvlChartData
  }, [tvlChartData, historicalChainTvls, sections])

  return (
    <div
      style={{
        ...(bobo && {
          backgroundImage: 'url("/bobo.png")',
          backgroundSize: "100%",
          backgroundRepeat: "no-repeat",
          backgroundPosition: "bottom",
        }),
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
        padding: '0 0 20px 0',
        minHeight: '460px',
      }}
    >
      <Denominations color={color}>
        <Link href={`/protocol/${protocol}?denomination=USD`} shallow>
          <Denomination active={!denomination || denomination === 'USD'}>USD</Denomination>
        </Link>
        <Link href={`/protocol/${protocol}?denomination=ETH`} shallow>
          <Denomination active={denomination === 'ETH'}>ETH</Denomination>
        </Link>
      </Denominations>
      <AreaChart chartData={chartDataFiltered} formatDate={formatDate} color={color} tokensUnique={[]} title="" />
    </div>
  )
}

const Denominations = styled.section`
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 6px;
  margin: 16px 16px 0;
  background-color: ${({ color }) => transparentize(0.8, color)};
  border-radius: 12px;
  width: min-content;
`

interface IDenomination {
  active?: boolean
}

// TODO add translate background animation
const Denomination = styled.a<IDenomination>`
  display: inline-block;
  margin: 0;
  border: none;
  font-weight: 500;
  font-size: 0.875rem;
  border-radius: 10px;
  background: ${({ theme, active }) =>
    active ? transparentize(0.5, theme.mode === 'dark' ? '#000' : '#fff') : 'none'};
  padding: 6px 8px;
  color: ${({ theme, active }) =>
    active
      ? theme.mode === 'dark'
        ? '#fff'
        : '#000'
      : theme.mode === 'dark'
      ? 'rgba(255, 255, 255, 0.6)'
      : 'rgba(0, 0, 0, 0.6)'};
  :focus-visible {
    outline: ${({ theme }) => '2px solid ' + theme.text4};
  }
  :hover {
    cursor: pointer;
  }
`
