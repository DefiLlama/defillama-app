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
	const {
		project,
		excludeProject,
		lendingProtocol,
		excludeLendingProtocol,
		farmProtocol,
		excludeFarmProtocol,
		chain,
		excludeChain,
		attribute,
		excludeAttribute,
		category,
		excludeCategory,
		token_pair,
		minTvl,
		maxTvl,
		minApy,
		maxApy,
		minAvailable,
		maxAvailable,
		customLTV
	} = router.query
	const token = router.query[tokenQueryKey]
	const excludeToken = router.query[excludeTokenQueryKey]
	const exactToken = router.query[exactTokenQueryKey]
	const decodedQuery = React.useMemo(
		() => ({
			project,
			excludeProject,
			lendingProtocol,
			excludeLendingProtocol,
			farmProtocol,
			excludeFarmProtocol,
			chain,
			excludeChain,
			attribute,
			excludeAttribute,
			category,
			excludeCategory,
			token_pair,
			minTvl,
			maxTvl,
			minApy,
			maxApy,
			minAvailable,
			maxAvailable,
			customLTV,
			[tokenQueryKey]: token,
			[excludeTokenQueryKey]: excludeToken,
			[exactTokenQueryKey]: exactToken
		}),
		[
			project,
			excludeProject,
			lendingProtocol,
			excludeLendingProtocol,
			farmProtocol,
			excludeFarmProtocol,
			chain,
			excludeChain,
			attribute,
			excludeAttribute,
			category,
			excludeCategory,
			token_pair,
			minTvl,
			maxTvl,
			minApy,
			maxApy,
			minAvailable,
			maxAvailable,
			customLTV,
			token,
			excludeToken,
			exactToken,
			tokenQueryKey,
			excludeTokenQueryKey,
			exactTokenQueryKey
		]
	)

	return React.useMemo(() => {
		return decodeYieldsQuery(decodedQuery, {
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
		projectList,
		chainList,
		categoryList,
		lendingProtocols,
		farmProtocols,
		evmChains,
		decodedQuery,
		tokenQueryKey,
		excludeTokenQueryKey,
		exactTokenQueryKey
	])
}
