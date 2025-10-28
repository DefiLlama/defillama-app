import { useMemo } from 'react'
import { IWarRoomPanel } from './types'
import { formattedNum, formattedPercent } from '~/utils'
import { TokenLogo } from '~/components/TokenLogo'
import { Tooltip } from '~/components/Tooltip'
import Link from 'next/link'

interface TreemapProps {
  panels: IWarRoomPanel[]
  width: number
  height: number
}

interface TreemapNode extends IWarRoomPanel {
  x: number
  y: number
  width: number
  height: number
}

function squarify(
  data: IWarRoomPanel[],
  x: number,
  y: number,
  width: number,
  height: number,
  spacing: number = 1
): TreemapNode[] {
  if (data.length === 0) return []
  
  const totalSize = data.reduce((sum, d) => sum + d.size, 0)
  if (totalSize === 0) return []
  
  const sortedData = [...data].sort((a, b) => b.size - a.size)
  
  const results: TreemapNode[] = []
  
  function squarifyRecursive(
    items: IWarRoomPanel[],
    x: number,
    y: number,
    width: number,
    height: number
  ) {
    if (items.length === 0) return
    
    const shortestSide = Math.min(width, height)
    const itemsTotalSize = items.reduce((sum, d) => sum + d.size, 0)
    const scale = (width * height) / itemsTotalSize
    
    let remainingItems = [...items]
    
    while (remainingItems.length > 0) {
      const row = [remainingItems[0]]
      let oldRatio = Number.MAX_VALUE
      
      for (let i = 1; i < remainingItems.length; i++) {
        const testRow = [...row, remainingItems[i]]
        const newRatio = calculateWorstRatio(testRow, shortestSide, scale)
        
        if (newRatio <= oldRatio) {
          row.push(remainingItems[i])
          oldRatio = newRatio
        } else {
          break
        }
      }
      
      const rowSize = row.reduce((sum, d) => sum + d.size, 0)
      const rowArea = rowSize * scale
      
      if (width >= height) {
        const rowWidth = rowArea / height
        layoutRow(row, x, y, rowWidth, height)
        
        remainingItems = remainingItems.slice(row.length)
        if (remainingItems.length > 0) {
          squarifyRecursive(
            remainingItems,
            x + rowWidth,
            y,
            width - rowWidth,
            height
          )
        }
      } else {
        const rowHeight = rowArea / width
        layoutRow(row, x, y, width, rowHeight)
        
        remainingItems = remainingItems.slice(row.length)
        if (remainingItems.length > 0) {
          squarifyRecursive(
            remainingItems,
            x,
            y + rowHeight,
            width,
            height - rowHeight
          )
        }
      }
      break
    }
  }
  
  function layoutRow(
    items: IWarRoomPanel[],
    x: number,
    y: number,
    width: number,
    height: number
  ) {
    if (items.length === 0) return
    
    const itemsTotalSize = items.reduce((sum, d) => sum + d.size, 0)
    const scale = (width * height) / itemsTotalSize
    
    let currentPos = 0
    
    items.forEach((item, index) => {
      const itemArea = item.size * scale
      
      if (width >= height) {
        const itemWidth = index === items.length - 1 
          ? width - currentPos
          : itemArea / height
          
        results.push({
          ...item,
          x: x + currentPos,
          y: y,
          width: Math.max(itemWidth, 10),
          height: height
        })
        currentPos += itemWidth
      } else {
        const itemHeight = index === items.length - 1 
          ? height - currentPos
          : itemArea / width
          
        results.push({
          ...item,
          x: x,
          y: y + currentPos,
          width: width,
          height: Math.max(itemHeight, 10)
        })
        currentPos += itemHeight
      }
    })
  }
  
  function calculateWorstRatio(row: IWarRoomPanel[], length: number, scale: number): number {
    const rowSize = row.reduce((sum, d) => sum + d.size, 0)
    const rowArea = rowSize * scale
    const width = rowArea / length
    
    let worst = 0
    row.forEach(item => {
      const itemArea = item.size * scale
      const itemLength = itemArea / width
      const ratio = Math.max(width / itemLength, itemLength / width)
      worst = Math.max(worst, ratio)
    })
    
    return worst
  }
  
  squarifyRecursive(sortedData, x, y, width, height)
  
  return results
}

export function Treemap({ panels, width, height }: TreemapProps) {
  const nodes = useMemo(() => squarify(panels, 0, 0, width, height, 1), [panels, width, height])
  
  return (
    <div className="relative" style={{ width, height }}>
      {nodes.map((node) => (
        <TreemapPanel key={node.protocol.name} node={node} />
      ))}
    </div>
  )
}

function TreemapPanel({ node }: { node: TreemapNode }) {
  const { protocol, x, y, width, height, color } = node
  const isGain = protocol.tvlChange24h > 0
  
  if (width < 20 || height < 20) return null
  
  const padding = Math.max(4, Math.min(width, height) * 0.08)
  const contentWidth = width - (padding * 2)
  const contentHeight = height - (padding * 2)
  
  const showFullInfo = contentWidth > 60 && contentHeight > 45
  const showName = contentWidth > 30 && contentHeight > 20
  const showPercentage = contentWidth > 25 && contentHeight > 15
  const showLogo = contentWidth > 30 && contentHeight > 20
  
  const minDimension = Math.min(width, height)
  const nameFontSize = Math.min(24, Math.max(6, minDimension * 0.12))
  const percentageFontSize = Math.min(28, Math.max(8, minDimension * 0.16))
  const logoSize = Math.min(40, Math.max(12, minDimension * 0.25))
  
  
  return (
    <Tooltip 
      content={
        <div className="space-y-1">
          <div className="font-semibold">{protocol.name}</div>
          <div>TVL: {formattedNum(protocol.tvl, true)}</div>
          <div className={isGain ? 'text-green-500' : 'text-red-500'}>
            24h: {formattedPercent(protocol.tvlChange24h)}
          </div>
          {protocol.category && <div className="text-xs opacity-75">Category: {protocol.category}</div>}
        </div>
      }
    >
      <Link href={`/protocols/${protocol.slug || protocol.name.toLowerCase().replace(/\s+/g, '-')}`}>
        <div
          className="absolute border border-white/30 overflow-hidden cursor-pointer hover:z-10 transition-all duration-200 hover:shadow-lg hover:scale-[1.02] hover:border-white/50"
          style={{
            left: x,
            top: y,
            width,
            height,
            backgroundColor: color,
            boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.1)',
            margin: '1px'
          }}
        >
        <div
          className="relative w-full h-full flex items-center justify-center text-white mix-blend-normal"
          style={{
            textShadow: '0 1px 2px rgba(0,0,0,0.5)',
            padding: `${padding}px`,
            boxSizing: 'border-box'
          }}
        >
          {showFullInfo && (
            <div 
              className="flex flex-col justify-center items-center text-center"
              style={{
                width: contentWidth,
                height: contentHeight,
                maxWidth: '100%',
                maxHeight: '100%'
              }}
            >
              {showLogo && protocol.logo && (
                <div style={{ marginBottom: Math.max(4, contentHeight * 0.08) }}>
                  <TokenLogo 
                    logo={protocol.logo} 
                    size={logoSize}
                  />
                </div>
              )}
              
              {showName && (
                <div 
                  className="font-semibold leading-tight"
                  style={{
                    fontSize: `${nameFontSize}px`,
                    lineHeight: '1.1',
                    marginBottom: Math.max(4, contentHeight * 0.08),
                    wordBreak: 'break-word',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    maxWidth: '100%',
                    maxHeight: `${contentHeight * 0.4}px`,
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical'
                  }}
                >
                  {protocol.name}
                </div>
              )}
              
              {showPercentage && (
                <div 
                  className="font-bold"
                  style={{
                    fontSize: `${percentageFontSize}px`,
                    lineHeight: '1',
                    marginTop: Math.max(3, contentHeight * 0.05),
                    maxWidth: '100%',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap'
                  }}
                >
                  {formattedPercent(protocol.tvlChange24h)}
                </div>
              )}
            </div>
          )}
          
          {!showFullInfo && showName && (
            <div 
              className="flex flex-col justify-center items-center text-center"
              style={{
                width: contentWidth,
                height: contentHeight,
                maxWidth: '100%',
                maxHeight: '100%'
              }}
            >
              {showLogo && protocol.logo && (
                <div style={{ marginBottom: Math.max(3, contentHeight * 0.06) }}>
                  <TokenLogo 
                    logo={protocol.logo} 
                    size={Math.min(logoSize, 24)}
                  />
                </div>
              )}
              
              <div 
                className="font-semibold leading-tight"
                style={{
                  fontSize: `${nameFontSize}px`,
                  lineHeight: '1.1',
                    marginBottom: Math.max(3, contentHeight * 0.06),
                  wordBreak: 'break-word',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  maxWidth: '100%',
                  maxHeight: `${contentHeight * 0.5}px`,
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical'
                }}
              >
                {protocol.name}
              </div>
              
              {showPercentage && (
                <div 
                  className="font-bold"
                  style={{
                    fontSize: `${percentageFontSize}px`,
                    lineHeight: '1',
                    marginTop: Math.max(3, contentHeight * 0.05),
                    maxWidth: '100%',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap'
                  }}
                >
                  {formattedPercent(protocol.tvlChange24h)}
                </div>
              )}
            </div>
          )}
          
          {!showName && showPercentage && (
            <div 
              className="font-bold flex items-center justify-center"
              style={{
                fontSize: `${percentageFontSize}px`,
                lineHeight: '1',
                width: contentWidth,
                height: contentHeight,
                maxWidth: '100%',
                maxHeight: '100%',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap'
              }}
            >
              {formattedPercent(protocol.tvlChange24h)}
            </div>
          )}
        </div>
        </div>
      </Link>
    </Tooltip>
  )
}

