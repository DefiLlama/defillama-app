import * as React from 'react'
import { useRouter } from 'next/router'
import { useFetchProjectsList, useFetchYieldsList } from '~/api/categories/yield/client'
import { tokenIconUrl } from '~/utils'
import { IBaseSearchProps, IGetSearchList } from '../types'

export function useGetYieldsSearchList(): IGetSearchList {
	const router = useRouter()
	const { data: yields, loading: fetchingYields } = useFetchYieldsList()
	const { data: projects, loading: fetchingProjects } = useFetchProjectsList()

	const searchData: IBaseSearchProps['data'] = React.useMemo(() => {
		const yieldsList =
			yields?.map((el) => ({
				name: `${el.name} (${el.symbol.toUpperCase()})`,
				symbol: el.symbol.toUpperCase(),
				route:
					router.pathname === '/yields/projects' ||
					router.pathname === '/yields/watchlist' ||
					router.pathname.includes('/yields/pool')
						? `/yields?token=${el.symbol.toUpperCase()}`
						: `${router.pathname}?token=${el.symbol.toUpperCase()}`,
				logo: el.image
			})) ?? []

		const projectList =
			projects?.map((p) => ({
				name: `Show all ${p.name} pools`,
				route:
					router.pathname === '/yields/projects' ||
					router.pathname === '/yields/watchlist' ||
					router.pathname.includes('/yields/pool')
						? `/yields?project=${p.slug}`
						: `${router.pathname}?project=${p.slug}`,
				logo: tokenIconUrl(p.slug)
			})) ?? []

		return [...yieldsList, ...projectList]
	}, [yields, projects, router.pathname])

	const onItemClick = (item) => {
		router.push(item.route, undefined, { shallow: true })
	}

	return { data: searchData || [], loading: fetchingProjects || fetchingYields, onItemClick }
}

export function useGetTokensSearchList({ lend, yields }): IGetSearchList {
	const router = useRouter()

	const [targetParam, restParam] = lend ? ['lend', 'borrow'] : ['borrow', 'lend']

	const searchData: IBaseSearchProps['data'] = React.useMemo(() => {
		const stablecoinsSearch = {
			name: `All USD Stablecoins`,
			symbol: 'USD_Stables',
			route: `${router.pathname}?${targetParam}=USD_Stables&${restParam}=${router.query[restParam] || ''}`,
			logo: '/icons/usd_native.png'
		}

		const yieldsList =
			yields?.map((el) => ({
				name: `${el.name} (${el.symbol.toUpperCase()})`,
				symbol: el.symbol.toUpperCase(),
				route: `${router.pathname}?${targetParam}=${el.symbol.toUpperCase()}&${restParam}=${
					router.query[restParam] || ''
				}`,
				logo: el.image
			})) ?? []

		return [stablecoinsSearch].concat(yieldsList)
	}, [yields, restParam, router.query, targetParam, router.pathname])

	const onItemClick = (item) => {
		router.push(item.route, undefined, { shallow: true })
	}

	return { data: searchData || [], loading: false, onItemClick }
}

export function useGetTokensSearchListMobile(): IGetSearchList {
	const router = useRouter()
	const { data: yields, loading: fetchingYields } = useFetchYieldsList()

	const searchData: IBaseSearchProps['data'] = React.useMemo(() => {
		const yieldsList =
			yields?.map((el) => [
				{
					name: `${el.name} (${el.symbol.toUpperCase()})`,
					symbol: el.symbol.toUpperCase(),
					route: `${router.pathname}?lend=${el.symbol.toUpperCase() || 'USDC'}&borrow=${router.query.borrow || 'ETH'}`,
					logo: el.image
				},
				{
					name: `Borrow: ${el.name} (${el.symbol.toUpperCase()})`,
					symbol: el.symbol.toUpperCase(),
					route: `${router.pathname}?lend=${router.query.lend || 'USDC'}&borrow=${el.symbol.toUpperCase() || 'ETH'}`,
					logo: el.image
				}
			]) ?? []

		return yieldsList.flat()
	}, [yields, router.query, router.pathname])

	const onItemClick = (item) => {
		router.push(item.route, undefined, { shallow: true })
	}

	return { data: searchData || [], loading: fetchingYields, onItemClick }
}
