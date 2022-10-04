import { Protocol } from "~/api/types"

//TODO: import from generic types


//  Response /dexs
export interface IGetDexsResponseBody {
  totalVolume: number;
  changeVolume1d: number;
  changeVolume7d: number;
  changeVolume30d: number;
  totalDataChartBreakdown: Array<[string, { [dex: string]: number }]>,
  totalDataChart: Array<[string, number]>,
  dexs: VolumeSummaryDex[]
  allChains: string[]
}

//  Response /dex
export interface IDexResponse extends Protocol {
  volumeAdapter: string
  volumeHistory: Array<{
    dailyVolume: {
      [chain: string]: {
        [protocolVersion: string]: number | string
      }
    }
    timestamp: number
  }> | null
  total1dVolume: number | null
  change1dVolume: number | null
  disabled: boolean | null
}

///////////////////////////////////////////////////////////////////
export interface VolumeSummaryDex extends Protocol {
  totalVolume24h: number | null
  volume24hBreakdown: {
    [chain: string]: {
      [protocolVersion: string]: number | string,
    }
  } | null
  change_1d: number | null
  change_7d: number | null
  change_1m: number | null
  protocolVersions: {
    [protVersion: string]: {
      totalVolume24h: number | null
      change_1d: number | null
      change_7d: number | null
      change_1m: number | null
      chains: string[] | null
    } | null
  } | null
}