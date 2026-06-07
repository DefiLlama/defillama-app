import type { IProtocolChartV2Params } from './api.types'

export type ProtocolValueChartSource = 'tvl' | 'treasury'
export type ProtocolValueChartQueryKind = 'tvl-chart' | 'treasury-chart'
export type ProtocolValueChartQueryKey = [
	'protocol-overview',
	ProtocolValueChartQueryKind,
	string | null,
	string | undefined,
	string | undefined,
	IProtocolChartV2Params['breakdownType']
]

const protocolValueChartSources = {
	tvl: {
		apiKind: 'tvl',
		queryKind: 'tvl-chart'
	},
	treasury: {
		apiKind: 'treasury',
		queryKind: 'treasury-chart'
	}
} satisfies Record<
	ProtocolValueChartSource,
	{ apiKind: ProtocolValueChartSource; queryKind: ProtocolValueChartQueryKind }
>

export const buildProtocolValueChartApiUrl = ({
	source,
	protocol,
	key,
	currency,
	breakdownType
}: {
	source: ProtocolValueChartSource
	protocol: string
	key?: string
	currency?: string
	breakdownType?: IProtocolChartV2Params['breakdownType']
}) => {
	const searchParams = new URLSearchParams()
	searchParams.set('kind', protocolValueChartSources[source].apiKind)
	searchParams.set('protocol', protocol)
	if (key != null) searchParams.set('key', key)
	if (currency != null) searchParams.set('currency', currency)
	if (breakdownType != null) searchParams.set('breakdownType', breakdownType)
	return `/api/public/charts/protocol?${searchParams.toString()}`
}

export const buildProtocolValueChartQueryKey = ({
	source,
	protocol,
	key,
	currency,
	breakdownType
}: {
	source: ProtocolValueChartSource
	protocol: string | null
	key?: string
	currency?: string
	breakdownType?: IProtocolChartV2Params['breakdownType']
}): ProtocolValueChartQueryKey => [
	'protocol-overview',
	protocolValueChartSources[source].queryKind,
	protocol,
	key,
	currency,
	breakdownType
]
