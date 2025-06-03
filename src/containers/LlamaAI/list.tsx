export const defaultTriggers = ['@', '$']

export function getList(trigger: string | null, searchData: any) {
	switch (trigger) {
		case '@':
			return searchData.protocolsAndChains.map((item) => item.listValue)
		case '$':
			return searchData.tokens.map((item) => item.listValue)
		default:
			return []
	}
}

export function getValue(listValue: string, trigger: string | null, searchData: any) {
	const list = trigger === '@' ? searchData.protocolsAndChains : trigger === '$' ? searchData.tokens : []
	return list.find((item) => item.listValue === listValue)
}
