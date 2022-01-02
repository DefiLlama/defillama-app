import React, { useRef } from 'react'
import { ResponsiveContainer } from 'recharts'
import styled from 'styled-components'
import Panel from '../Panel'
import { useMed } from 'hooks/useBreakpoints'

interface IChartWrapperProps {
  children: React.ReactNode
}

export const ChartWrapper = ({ children }: IChartWrapperProps) => {
  const ref = useRef(null)
  const isMobile = useMed()

  return (
    <PlaceholderChartPanel
      style={{
        margin: !isMobile && '0.3em'
      }}
    >
      <div
        style={{
          position: 'absolute',
          inset: 10
        }}
      >
        <ResponsiveContainer
          width={ref?.current?.container?.clientWidth}
          height={ref?.current?.container?.clientHeight}
        >
          {children}
        </ResponsiveContainer>
      </div>
    </PlaceholderChartPanel>
  )
}

const PlaceholderChartPanel = styled(Panel)`
  padding-bottom: 28%;
  height: 100%;
  @media (max-width: 800px) {
    padding-bottom: 69%;
  }
`

export { ChainPieChart } from './PieChart'
export { ChainDominanceChart } from './DominanceChart'
