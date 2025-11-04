import { MetricType } from '~/hooks/useEmailNotifications'

export const mapUIMetricToAPI = (uiMetric: string): MetricType => {
	const mapping: Record<string, MetricType> = {
		tvl: 'tvl',
		volume: 'volume',
		perp_volume: 'perps',
		fees: 'fees',
		revenue: 'revenue',
		mcap: 'mcap',
		price: 'price',
		fdv: 'fdv',
		outstanding_fdv: 'ofdv',
		inflows: 'tvl',
		stablecoins: 'stablecoins',
		bridge_volume: 'volume'
	}

	return (mapping[uiMetric] || uiMetric) as MetricType
}

export const mapAPIMetricToUI = (apiMetric: MetricType): string => {
	const mapping: Record<MetricType, string> = {
		tvl: 'tvl',
		volume: 'volume',
		perps: 'perp volume',
		fees: 'fees',
		revenue: 'revenue',
		mcap: 'mcap',
		price: 'price',
		fdv: 'fdv',
		ofdv: 'outstanding fdv',
		stablecoins: 'stablecoins',
		'holders-revenue': 'holders revenue'
	}

	return mapping[apiMetric] || apiMetric
}
