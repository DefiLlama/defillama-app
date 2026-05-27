import type { NextRouter } from 'next/router'
import { pushShallowQuery } from '~/utils/routerQuery'
import { resetYieldsPoolPageOnFilterChange } from './queryState'

type QueryUpdatePrimitive = string | number | boolean
type QueryUpdateValue = QueryUpdatePrimitive | QueryUpdatePrimitive[] | undefined

export function pushYieldsQuery<T extends Record<string, QueryUpdateValue>>(
	router: NextRouter,
	updates: T,
	{ resetPage = true, pathname = router.pathname }: { resetPage?: boolean; pathname?: string } = {}
) {
	const nextUpdates = resetPage ? resetYieldsPoolPageOnFilterChange(pathname, updates) : updates
	return pushShallowQuery(router, nextUpdates, pathname)
}
