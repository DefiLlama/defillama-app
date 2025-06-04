import { ISearchData } from './types'

export const defaultTriggers = ['@', '$']

export function getList(trigger: string | null, searchData: ISearchData) {
	switch (trigger) {
		case '@':
			return searchData.protocolsAndChains
		case '$':
			return searchData.tokens
		default:
			return []
	}
}

export function getValue(listValue: string, trigger: string | null, searchData: any) {
	const list = trigger === '@' ? searchData.protocolsAndChains : trigger === '$' ? searchData.tokens : []
	return list.find((item) => item.listValue === listValue)
}
