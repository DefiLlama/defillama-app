export const DIMENSIONS_API_METRIC_CONFIG: Record<string, { endpoint: string; dataType?: string; metricName: string }> =
	{
		fees: { endpoint: 'fees', metricName: 'fees' },
		revenue: { endpoint: 'fees', dataType: 'dailyRevenue', metricName: 'revenue' },
		volume: { endpoint: 'dexs', metricName: 'volume' },
		perps: { endpoint: 'derivatives', metricName: 'perps volume' },
		'options-notional': { endpoint: 'options', dataType: 'dailyNotionalVolume', metricName: 'options notional' },
		'options-premium': { endpoint: 'options', dataType: 'dailyPremiumVolume', metricName: 'options premium' },
		'bridge-aggregators': { endpoint: 'bridge-aggregators', metricName: 'bridge volume' },
		'dex-aggregators': { endpoint: 'aggregators', metricName: 'DEX aggregator volume' },
		'perps-aggregators': { endpoint: 'aggregator-derivatives', metricName: 'perps aggregator volume' },
		'user-fees': { endpoint: 'fees', dataType: 'dailyUserFees', metricName: 'user fees' },
		'holders-revenue': { endpoint: 'fees', dataType: 'dailyHoldersRevenue', metricName: 'holders revenue' },
		'protocol-revenue': { endpoint: 'fees', dataType: 'dailyProtocolRevenue', metricName: 'protocol revenue' },
		'supply-side-revenue': { endpoint: 'fees', dataType: 'dailySupplySideRevenue', metricName: 'supply side revenue' },
		'open-interest': { endpoint: 'open-interest', dataType: 'openInterestAtEnd', metricName: 'open interest' }
	}
