import { slug } from '~/utils'
import type { IconsRowItem } from './index'

const toYieldsProjectSlug = (project: string) => project.toLowerCase().split(' ').join('-')

export const chainHref = (base: string, chain: string) => `${base}/${slug(chain)}`

export const yieldsChainHref = (chain: string) => `/yields?chain=${chain}`

export const yieldsProjectHref = (project: string) => `/yields?project=${toYieldsProjectSlug(project)}`

export const toChainIconItems = (
	chains: string[],
	getHref?: (chain: string) => string | undefined
): Array<IconsRowItem> => {
	return chains.map((chain) => ({
		label: chain,
		kind: 'chain',
		href: getHref?.(chain)
	}))
}

export const toTokenIconItems = (
	tokens: string[],
	options?: {
		titles?: string[]
		getHref?: (token: string) => string | undefined
	}
): Array<IconsRowItem> => {
	return tokens.map((token, index) => ({
		label: token,
		kind: 'token',
		title: options?.titles?.[index],
		href: options?.getHref?.(token)
	}))
}
