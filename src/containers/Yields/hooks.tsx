import { useRouter } from 'next/router'
import * as React from 'react'
import { decodeYieldsQuery, type DecodeYieldsQueryContext } from './queryState'

type IFormatYieldQueryParams = DecodeYieldsQueryContext

export const useFormatYieldQueryParams = ({
	projectList,
	chainList,
	categoryList,
	lendingProtocols,
	farmProtocols,
	evmChains,
	tokenQueryKey = 'token',
	excludeTokenQueryKey = 'excludeToken',
	exactTokenQueryKey = 'exactToken'
}: IFormatYieldQueryParams) => {
	const router = useRouter()

	return React.useMemo(() => {
		return decodeYieldsQuery(router.query, {
			projectList,
			chainList,
			categoryList,
			lendingProtocols,
			farmProtocols,
			evmChains,
			tokenQueryKey,
			excludeTokenQueryKey,
			exactTokenQueryKey
		})
	}, [
		router.query,
		projectList,
		chainList,
		categoryList,
		lendingProtocols,
		farmProtocols,
		evmChains,
		tokenQueryKey,
		excludeTokenQueryKey,
		exactTokenQueryKey
	])
}
