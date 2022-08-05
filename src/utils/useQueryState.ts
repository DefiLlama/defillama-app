import { useRouter } from 'next/router'
import { ParsedUrlQuery } from 'querystring'
import { useEffect, useState } from 'react'

export function useQueryState<T extends ParsedUrlQuery>(initialQueryState: T) {
	const router = useRouter()
	const _query = router.query as T
	const [queryState, setQueryState] = useState(initialQueryState)

	useEffect(() => {
		setQueryState(_query)
	}, [_query])

	const setQueryParams = (query = {}) => {
		router.push({ pathname: router.pathname, query }, undefined, {
			shallow: true
		})
	}

	return [queryState, setQueryParams]
}
