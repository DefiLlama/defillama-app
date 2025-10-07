import { useMemo, useRef, useEffect, useState } from 'react'
import { IProtocol } from '~/containers/ChainOverview/types'
import { Treemap } from './Treemap'
import { IWarRoomPanel, IWarRoomProtocol } from './types'
import { tokenIconUrl } from '~/utils'

interface WarRoomProps {
  protocols: IProtocol[]
}

type TimePeriod = '1d' | '7d' | '30d'
type RankRange = 'top20' | 'top21-50' | 'top51-100'


const getColorForChange = (change: number): string => {
  const absChange = Math.abs(change)
  
  if (change > 0) {
    if (absChange > 20) return 'rgba(22, 211, 143, 0.9)'
    if (absChange > 10) return 'rgba(22, 211, 143, 0.8)'
    if (absChange > 5) return 'rgba(22, 211, 143, 0.7)'
    if (absChange > 2) return 'rgba(22, 211, 143, 0.6)'
    return 'rgba(22, 211, 143, 0.4)'
  } else {
    if (absChange > 20) return 'rgba(227, 47, 80, 0.9)'
    if (absChange > 10) return 'rgba(227, 47, 80, 0.8)'
    if (absChange > 5) return 'rgba(227, 47, 80, 0.7)'
    if (absChange > 2) return 'rgba(227, 47, 80, 0.6)'
    return 'rgba(227, 47, 80, 0.4)'
  }
}

export function WarRoom({ protocols }: WarRoomProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 })
  const [timePeriod, setTimePeriod] = useState<TimePeriod>('1d')
  const [rankRange, setRankRange] = useState<RankRange>('top20')
  
  useEffect(() => {
    if (!containerRef.current) return
    
    const resizeObserver = new ResizeObserver(entries => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect
        if (height > 0 && height < 10000) {
          setDimensions({ width, height })
        }
      }
    })
    
    resizeObserver.observe(containerRef.current)
    
    const { width, height } = containerRef.current.getBoundingClientRect()
    if (height > 0 && height < 10000) {
      setDimensions({ width, height })
    }
    
    return () => resizeObserver.disconnect()
  }, [])
  
  
  const warRoomData = useMemo(() => {
    const getChangeValue = (p: IProtocol) => {
      switch (timePeriod) {
        case '1d':
          return p.tvlChange?.change1d
        case '7d':
          return p.tvlChange?.change7d
        case '30d':
          return p.tvlChange?.change1m
        default:
          return p.tvlChange?.change1d
      }
    }
    
    const processedProtocols: IWarRoomProtocol[] = protocols
      .filter(p => {
        const tvl = p.tvl?.default?.tvl || 0
        const tvlChange = getChangeValue(p)
        return tvl > 1000000 && tvlChange !== null && tvlChange !== undefined && !isNaN(tvlChange)
      })
      .map(p => {
        const tvl = p.tvl?.default?.tvl || 0
        const tvlPrevDay = p.tvl?.default?.tvlPrevDay || 0
        const tvlChange24h = getChangeValue(p) || 0
        
        const calculatedTvlPrevDay = tvlPrevDay > 0 ? tvlPrevDay : 
          (tvlChange24h !== 0 ? tvl / (1 + tvlChange24h / 100) : tvl)
        
        
        return {
          name: p.name,
          symbol: undefined,
          logo: tokenIconUrl(p.name),
          tvl,
          tvlPrevDay: calculatedTvlPrevDay,
          tvlChange24h,
          category: p.category,
          chains: p.chains,
          slug: p.slug
        }
      })
      .filter(p => Math.abs(p.tvlChange24h) > 0.01)
      .sort((a, b) => b.tvl - a.tvl)
    
    let rangedProtocols: IWarRoomProtocol[] = []
    switch (rankRange) {
      case 'top20':
        rangedProtocols = processedProtocols.slice(0, 20)
        break
      case 'top21-50':
        rangedProtocols = processedProtocols.slice(20, 50)
        break
      case 'top51-100':
        rangedProtocols = processedProtocols.slice(50, 100)
        break
    }
    
    const panels: IWarRoomPanel[] = rangedProtocols.map(protocol => {
      const size = Math.sqrt(protocol.tvl / 1000000)
      
      return {
        protocol,
        size: Math.max(size, 0.1),
        color: getColorForChange(protocol.tvlChange24h)
      }
    })
    
    return {
      panels,
      totalCount: processedProtocols.length
    }
  }, [protocols, timePeriod, rankRange])
  
  return (
    <div className="flex flex-col h-full">
      <div className="mb-3 space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">TVL Heatmap by Size</h3>
          <div className="flex gap-3 text-sm">
            <div className="flex items-center gap-1">
              <div className="h-3 w-3 rounded" style={{ backgroundColor: 'rgba(22, 211, 143, 0.9)' }} />
              <span>Gains</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="h-3 w-3 rounded" style={{ backgroundColor: 'rgba(227, 47, 80, 0.9)' }} />
              <span>Losses</span>
            </div>
          </div>
        </div>
        
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1 text-sm">
            <button
              onClick={() => setRankRange('top20')}
              className={`px-3 py-1 rounded transition-colors ${
                rankRange === 'top20'
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600'
              }`}
            >
              Top 20
            </button>
            <span className="text-gray-400">›</span>
            <button
              onClick={() => setRankRange('top21-50')}
              className={`px-3 py-1 rounded transition-colors ${
                rankRange === 'top21-50'
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600'
              }`}
            >
              21-50
            </button>
            <span className="text-gray-400">›</span>
            <button
              onClick={() => setRankRange('top51-100')}
              className={`px-3 py-1 rounded transition-colors ${
                rankRange === 'top51-100'
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600'
              }`}
            >
              51-100
            </button>
          </div>
          
          <div className="flex gap-1 text-sm">
            <button
              onClick={() => setTimePeriod('1d')}
              className={`px-3 py-1 rounded transition-colors ${
                timePeriod === '1d'
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600'
              }`}
            >
              1D
            </button>
            <button
              onClick={() => setTimePeriod('7d')}
              className={`px-3 py-1 rounded transition-colors ${
                timePeriod === '7d'
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600'
              }`}
            >
              7D
            </button>
            <button
              onClick={() => setTimePeriod('30d')}
              className={`px-3 py-1 rounded transition-colors ${
                timePeriod === '30d'
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600'
              }`}
            >
              30D
            </button>
          </div>
        </div>
      </div>
      
      <div 
        ref={containerRef}
        className="relative bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden flex-1"
        style={{ minHeight: '500px' }}
      >
        {dimensions.width > 0 && dimensions.height > 0 && warRoomData.panels.length > 0 && (
          <Treemap
            panels={warRoomData.panels}
            width={dimensions.width}
            height={dimensions.height}
          />
        )}
        
        {warRoomData.panels.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center">
            <p className="text-gray-500 dark:text-gray-400">
              No significant TVL changes in the selected range and time period
            </p>
          </div>
        )}
      </div>
      
      <div className="mt-2 text-xs text-gray-500 dark:text-gray-400 text-right">
        Showing {warRoomData.panels.length} of {warRoomData.totalCount} protocols with significant changes
      </div>
    </div>
  )
}
