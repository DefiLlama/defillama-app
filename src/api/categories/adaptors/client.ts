import { DIMENISIONS_SUMMARY_BASE_API } from '~/constants'

export const getAPIUrlSummary = (type: string, protocolName: string, dataType?: string, fullChart?: boolean) => {
	let API = `${DIMENISIONS_SUMMARY_BASE_API}/${type}/${protocolName}?`
	if (dataType) API = `${API}dataType=${dataType}&`
	if (fullChart) API = `${API}fullChart=${true}`
	return API
}
