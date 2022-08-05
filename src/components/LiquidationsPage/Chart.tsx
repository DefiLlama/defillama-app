/* eslint-disable no-unused-vars*/

export type ChartState = {
	asset: string // TODO: symbol for now, later change to coingeckoId
	aggregateBy: 'chain' | 'protocol'
	filters: FilterChain | FilterProtocol
}
// this should be pulled dynamically
type FilterChain = 'all' | 'none' | string
type FilterProtocol = 'all' | 'none' | string

export const filters = (url: string) => {}
