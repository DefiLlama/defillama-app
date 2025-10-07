export interface IWarRoomProtocol {
  name: string
  symbol?: string
  logo?: string
  tvl: number
  tvlChange24h: number
  tvlPrevDay: number
  category?: string
  chains?: string[]
  slug?: string
}

export interface IWarRoomPanel {
  protocol: IWarRoomProtocol
  size: number
  color: string 
}

export interface IWarRoomData {
  panels: IWarRoomPanel[]
  totalTvl: number
  lastUpdated: number
}

