import * as React from 'react'
import { useRouter } from 'next/router'
import { useFetchCoingeckoTokensList } from '~/api'
import { useFetchProjectsList } from '~/api/categories/yield/client'
import { tokenIconUrl } from '~/utils'
import { IBaseSearchProps, IGetSearchList } from '../types'

export function useGetYieldsSearchList(): IGetSearchList {
	const router = useRouter()
	const { data: yields, loading: fetchingYields } = useFetchCoingeckoTokensList()
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
