import { MetricType } from '~/hooks/useNotifications'

/**
 * Map UI metric keys to API metric types
 */
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
		inflows: 'tvl', // Map inflows to tvl for chains
		stablecoins: 'stablecoins',
		bridge_volume: 'volume' // Map bridge volume to volume
	}

	return (mapping[uiMetric] || uiMetric) as MetricType
}

/**
 * Map API metric types to UI metric keys
 */
export const mapAPIMetricToUI = (apiMetric: MetricType): string => {
	const mapping: Record<MetricType, string> = {
		tvl: 'tvl',
		volume: 'volume',
		perps: 'perp_volume',
		fees: 'fees',
		revenue: 'revenue',
		mcap: 'mcap',
		price: 'price',
		fdv: 'fdv',
		ofdv: 'outstanding_fdv',
		stablecoins: 'stablecoins',
		'holders-revenue': 'revenue' // Map holders-revenue back to revenue in UI
	}

	return mapping[apiMetric] || apiMetric
}

/**
 * Get user's timezone using Intl API
 */
export const getUserTimezone = (): string => {
	try {
		return Intl.DateTimeFormat().resolvedOptions().timeZone
	} catch (error) {
		return 'UTC'
	}
}

/**
 * Format time to HH:mm
 */
export const formatTimeToHHMM = (hour: number, minute: number): string => {
	return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`
}

/**
 * Parse HH:mm time string
 */
export const parseHHMMTime = (time: string): { hour: number; minute: number } => {
	const [hourStr, minuteStr] = time.split(':')
	return {
		hour: parseInt(hourStr, 10),
		minute: parseInt(minuteStr, 10)
	}
}
