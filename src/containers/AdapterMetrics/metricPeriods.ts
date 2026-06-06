type NullableNumber = number | null | undefined

export type MetricPeriodFields = {
	total24h?: NullableNumber
	total48hto24h?: NullableNumber
	total7d?: NullableNumber
	total14dto7d?: NullableNumber
	total30d?: NullableNumber
	total60dto30d?: NullableNumber
	total7DaysAgo?: NullableNumber
	total30DaysAgo?: NullableNumber
	total1y?: NullableNumber
	totalAllTime?: NullableNumber
	change_1d?: NullableNumber
	change_7d?: NullableNumber
	change_1m?: NullableNumber
	change_7dover7d?: NullableNumber
	change_30dover30d?: NullableNumber
}

type MetricPeriodChanges = Pick<
	MetricPeriodFields,
	'change_1d' | 'change_7d' | 'change_1m' | 'change_7dover7d' | 'change_30dover30d'
>

const SUM_FIELDS = [
	'total24h',
	'total48hto24h',
	'total7d',
	'total14dto7d',
	'total30d',
	'total60dto30d',
	'total7DaysAgo',
	'total30DaysAgo',
	'total1y',
	'totalAllTime'
] as const

function sumNullable(left: NullableNumber, right: NullableNumber) {
	if (left == null && right == null) return null
	return (left ?? 0) + (right ?? 0)
}

function getPercentChange(valueNow: NullableNumber, valuePrevious: NullableNumber) {
	if (valueNow == null || valuePrevious == null || valuePrevious === 0) return null

	const percent = ((valueNow - valuePrevious) / valuePrevious) * 100
	return Number.isFinite(percent) ? percent : null
}

export function deriveMetricChanges<T extends MetricPeriodFields>(protocol: T): T & MetricPeriodChanges {
	protocol.change_1d = getPercentChange(protocol.total24h, protocol.total48hto24h)
	protocol.change_7d = getPercentChange(protocol.total24h, protocol.total7DaysAgo)
	protocol.change_1m = getPercentChange(protocol.total24h, protocol.total30DaysAgo)
	protocol.change_7dover7d = getPercentChange(protocol.total7d, protocol.total14dto7d)
	protocol.change_30dover30d = getPercentChange(protocol.total30d, protocol.total60dto30d)

	return protocol
}

export function mergeMetricPeriods<T extends MetricPeriodFields>(
	existing: T,
	protocol: MetricPeriodFields
): T & MetricPeriodChanges {
	for (const field of SUM_FIELDS) {
		existing[field] = sumNullable(existing[field], protocol[field])
	}

	return deriveMetricChanges(existing)
}
