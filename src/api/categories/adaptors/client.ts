import { DIMENISIONS_SUMMARY_BASE_API } from '~/constants'

export const getAPIUrlSummary = (type: string, protocolName: string, dataType?: string, fullChart?: boolean) => {
	const params: string[] = []
	if (dataType) params.push(`dataType=${dataType}`)
	if (fullChart) params.push(`fullChart=${true}`)
	const queryString = params.length > 0 ? `?${params.join('&')}` : ''
	return `${DIMENISIONS_SUMMARY_BASE_API}/${type}/${protocolName}${queryString}`
}
