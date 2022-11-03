//TODO: import from generic types


//  Response /overview/type
export interface IGetOverviewResponseBody {
  total24h: number;
  change_1d: number;
  change_7d: number;
  change_1m: number;
  totalDataChartBreakdown: Array<[string, { [protocol: string]: number }]>,
  totalDataChart: Array<[number, number]>,
  protocols: ProtocolAdaptorSummary[]
  allChains: string[]
}

//  Response /summary
export interface ProtocolAdaptorSummaryResponse extends ProtocolAdaptorSummary {
  logo: string | null;
  address?: string | null;
  url: string;
  description: string | null;
  audits?: string | null;
  category?: string;
  twitter?: string | null;
  audit_links?: Array<string>;
  forkedFrom?: Array<string>;
  gecko_id: string | null;
  module: string;
  totalDataChartBreakdown: Array<[number, IJSON<{ [protocol: string]: number | IJSON<number> }>]>,
  totalDataChart: Array<[number, number]>,
  total24h: number | null
  totalAllTime: number | null
  change_1d: number | null
  protocolType?: string
  protocolsData: IJSON<{
    chains: string[]
    disabled: boolean
  }> | null
}

///////////////////////////////////////////////////////////////////
export type IJSON<T> = { [key: string]: T }
export type ProtocolAdaptorSummary = {
  name: string
  disabled: boolean
  displayName: string
  change_1d: number
  change_7d: number
  change_1m: number
  total24h: number
  breakdown24h: IJSON<IJSON<number>>
  chains: Array<string>,
  module: string
  totalAllTime: number | null
  protocolsStats: IJSON<IJSON<{
    chains: string[],
    disabled: boolean,
    total24h: number | null
    change_1d: number | null
    change_7d: number | null
    change_1m: number | null
    breakdown24h: number | null
  }>>
}