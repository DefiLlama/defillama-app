import * as Ariakit from '@ariakit/react'
import { useQuery } from '@tanstack/react-query'
import { useRouter } from 'next/router'
import { startTransition, useEffect, useMemo, useRef, useState } from 'react'
import { Icon } from '~/components/Icon'
import { BasicLink } from '~/components/Link'
import { LoadingDots } from '~/components/Loaders'
import { SEARCH_API_TOKEN, SEARCH_API_URL } from '~/constants'
import { useAuthContext } from '~/containers/Subscribtion/auth'
import { setStorageItem, useStorageItem } from '~/contexts/localStorageStore'
import { useDebouncedValue } from '~/hooks/useDebounce'
import { useIsClient } from '~/hooks/useIsClient'
import { fetchJson, handleSimpleFetchResponse } from '~/utils/async'

async function getDefaultSearchList() {
	try {
		const data = await fetchJson('https://defillama-datasets.llama.fi/searchlist.json')
		return data
	} catch (error) {
		throw new Error(error instanceof Error ? error.message : 'Unknown error')
	}
}
async function fetchSearchList(query: string) {
	const response: Array<ISearchItem> = await fetch(SEARCH_API_URL, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			Authorization: `Bearer ${SEARCH_API_TOKEN}`
		},
		body: JSON.stringify({
			queries: [
				{
					indexUid: 'pages',
					limit: 20,
					offset: 0,
					q: query
				}
			]
		})
	})
		.then(handleSimpleFetchResponse)
		.then((res) => res.json())
		.then((res) => res?.results?.[0]?.hits ?? [])

	return response
}

interface ISearchItem {
	name: string
	logo: string
	symbol?: string
	route: string
	type: string
	deprecated?: boolean
	hideType?: boolean
	subName?: string
}

const hideLlamaAI = new Set(['/ai'])

export const MobileSearch = () => {
	const router = useRouter()

	const isClient = useIsClient()
	const { hasActiveSubscription } = useAuthContext()

	const { defaultSearchList, recentSearchList, isLoadingDefaultSearchList, errorDefaultSearchList } =
		useDefaultSearchList()

	const [searchValue, setSearchValue] = useState('')
	const debouncedSearchValue = useDebouncedValue(searchValue, 200)
	const { data, isLoading, error } = useSearch(debouncedSearchValue)
	const [dialogOpen, setDialogOpen] = useState(false)
	const handleSelect = () => setDialogOpen(false)

	return (
		<>
			{!hideLlamaAI.has(router.pathname) && (
				<BasicLink
					href={isClient && hasActiveSubscription ? '/ai/chat' : '/ai'}
					className="llamaai-glow relative -my-0.5 overflow-hidden rounded-md bg-[linear-gradient(93.94deg,#FDE0A9_24.73%,#FBEDCB_57.42%,#FDE0A9_99.73%)] p-3 text-black shadow-[0px_0px_30px_0px_rgba(253,224,169,0.5),0px_0px_1px_2px_rgba(255,255,255,0.1)] lg:hidden"
					data-umami-event="llamaai-mobile-nav-link"
					data-umami-event-subscribed={isClient && hasActiveSubscription ? 'true' : 'false'}
				>
					<svg className="h-4 w-4 shrink-0">
						<use href="/assets/llamaai/ask-llamaai-3.svg#ai-icon" />
					</svg>
					<span className="sr-only">Ask LlamaAI</span>
				</BasicLink>
			)}
			<Ariakit.DialogProvider open={dialogOpen} setOpen={setDialogOpen}>
				<Ariakit.DialogDisclosure className="-my-0.5 rounded-md bg-[#445ed0] p-3 text-white shadow lg:hidden">
					<span className="sr-only">Search</span>
					<Icon name="search" height={16} width={16} />
				</Ariakit.DialogDisclosure>

				<Ariakit.Dialog
					className="dialog h-[calc(100dvh-80px)] max-h-(--popover-available-height) bg-(--bg-main) p-2 max-sm:drawer"
					unmountOnHide
					hideOnInteractOutside
					portal
				>
					<Ariakit.ComboboxProvider
						setValue={(value) => {
							startTransition(() => {
								setSearchValue(value)
							})
						}}
					>
						<span className="relative isolate flex w-full items-center justify-between gap-2">
							<Ariakit.Combobox
								placeholder="Search..."
								className="ml-2 flex-1 rounded-md bg-white px-3 py-1 text-base focus:ring-(--primary) dark:bg-black"
							/>
							<Ariakit.DialogDismiss className="p-2">
								<Icon name="x" className="h-5 w-5" />
							</Ariakit.DialogDismiss>
						</span>

						<Ariakit.ComboboxList className="flex flex-col gap-1" alwaysVisible>
							{debouncedSearchValue ? (
								isLoading ? (
									<p className="flex items-center justify-center gap-1 p-4">
										Loading
										<LoadingDots />
									</p>
								) : error ? (
									<p className="flex items-center justify-center p-4 text-(--error)">{`Error: ${error.message}`}</p>
								) : !data?.length ? (
									<p className="flex items-center justify-center p-4">No results found</p>
								) : (
									data.map((route: ISearchItem) => (
										<SearchItem
											key={`m-srch-data-${route.name}-${route.route}`}
											route={route}
											onSelect={handleSelect}
										/>
									))
								)
							) : isLoadingDefaultSearchList ? (
								<p className="flex items-center justify-center gap-1 p-4">
									Loading
									<LoadingDots />
								</p>
							) : errorDefaultSearchList ? (
								<p className="flex items-center justify-center p-4 text-(--error)">{`Error: ${errorDefaultSearchList.message}`}</p>
							) : !defaultSearchList?.length ? (
								<p className="flex items-center justify-center p-4">No results found</p>
							) : (
								<>
									{recentSearchList.map((route: ISearchItem) => (
										<SearchItem
											key={`m-search-rct-${route.name}-${route.route}`}
											route={route}
											recent
											onSelect={handleSelect}
										/>
									))}
									{defaultSearchList.map((route: ISearchItem) => (
										<SearchItem
											key={`m-search-dl-${route.name}-${route.route}`}
											route={route}
											onSelect={handleSelect}
										/>
									))}
								</>
							)}
						</Ariakit.ComboboxList>
					</Ariakit.ComboboxProvider>
				</Ariakit.Dialog>
			</Ariakit.DialogProvider>
		</>
	)
}

export const DesktopSearch = () => {
	const router = useRouter()

	const isClient = useIsClient()
	const { hasActiveSubscription } = useAuthContext()

	const [open, setOpen] = useState(false)
	const inputField = useRef<HTMLInputElement>(null)
	useEffect(() => {
		function focusSearchBar(e: KeyboardEvent) {
			if ((e.ctrlKey || e.metaKey) && e.code === 'KeyK') {
				e.preventDefault()
				inputField.current?.focus()
				setOpen(true)
			}
		}

		window.addEventListener('keydown', focusSearchBar)

		return () => window.removeEventListener('keydown', focusSearchBar)
	}, [setOpen])

	const { defaultSearchList, recentSearchList, isLoadingDefaultSearchList, errorDefaultSearchList } =
		useDefaultSearchList()

	const [searchValue, setSearchValue] = useState('')
	const debouncedSearchValue = useDebouncedValue(searchValue, 200)
	const { data, isLoading, error } = useSearch(debouncedSearchValue)

	return (
		<>
			<Ariakit.ComboboxProvider
				resetValueOnHide
				setValue={(value) => {
					startTransition(() => {
						setSearchValue(value)
					})
				}}
				open={open}
				setOpen={setOpen}
			>
				<span className="relative isolate hidden w-full lg:inline-block lg:max-w-[50vw]">
					<button onClick={(prev) => setOpen(!prev)} className="absolute top-0 bottom-0 left-2 my-auto opacity-50">
						{open ? (
							<>
								<span className="sr-only">Close Search</span>
								<Icon name="x" height={16} width={16} />
							</>
						) : (
							<>
								<span className="sr-only">Open Search</span>
								<Icon name="search" height={16} width={16} />
							</>
						)}
					</button>
					<Ariakit.Combobox
						placeholder="Search..."
						autoSelect
						ref={inputField}
						className="w-full rounded-md border border-(--cards-border) bg-(--app-bg) px-2.5 py-0.75 pl-7 text-black focus:border-(--primary) focus:ring-1 focus:ring-(--primary) focus:outline-hidden focus-visible:outline-hidden lg:py-1.25 dark:text-white"
					/>
					<span className="absolute top-0.75 right-0.75 bottom-0.75 m-auto flex items-center justify-center rounded-md bg-(--link-bg) p-1 text-xs text-(--link-text)">
						⌘K
					</span>
				</span>
				<Ariakit.ComboboxPopover
					unmountOnHide
					hideOnInteractOutside
					gutter={6}
					sameWidth
					className="z-10 flex thin-scrollbar max-h-[min(var(--popover-available-height),60vh)] flex-col overflow-auto overscroll-contain rounded-b-md border border-t-0 border-(--cards-border) bg-(--cards-bg) max-sm:h-[calc(100dvh-80px)] max-sm:drawer"
					portal
				>
					<Ariakit.ComboboxList alwaysVisible>
						{debouncedSearchValue ? (
							isLoading ? (
								<p className="flex items-center justify-center gap-1 p-4">
									Loading
									<LoadingDots />
								</p>
							) : error ? (
								<p className="flex items-center justify-center p-4 text-(--error)">{`Error: ${error.message}`}</p>
							) : !data?.length ? (
								<p className="flex items-center justify-center p-4">No results found</p>
							) : (
								data.map((route: ISearchItem) => (
									<SearchItem key={`gs-${route.name}-${route.route}-${route.subName}`} route={route} />
								))
							)
						) : isLoadingDefaultSearchList ? (
							<p className="flex items-center justify-center gap-1 p-4">
								Loading
								<LoadingDots />
							</p>
						) : errorDefaultSearchList ? (
							<p className="flex items-center justify-center p-4 text-(--error)">{`Error: ${errorDefaultSearchList.message}`}</p>
						) : !defaultSearchList?.length ? (
							<p className="flex items-center justify-center p-4">No results found</p>
						) : (
							<>
								{recentSearchList.map((route: ISearchItem) => (
									<SearchItem key={`gs-r-${route.name}-${route.route}-${route.subName}`} route={route} recent />
								))}
								{defaultSearchList.map((route: ISearchItem) => (
									<SearchItem key={`gs-dl-${route.name}-${route.route}-${route.subName}`} route={route} />
								))}
							</>
						)}
					</Ariakit.ComboboxList>
				</Ariakit.ComboboxPopover>
			</Ariakit.ComboboxProvider>
			{!hideLlamaAI.has(router.pathname) && (
				<BasicLink
					href={isClient && hasActiveSubscription ? '/ai/chat' : '/ai'}
					className="llamaai-glow relative mr-auto hidden items-center justify-between gap-[10px] overflow-hidden rounded-md bg-[linear-gradient(93.94deg,#FDE0A9_24.73%,#FBEDCB_57.42%,#FDE0A9_99.73%)] px-4 py-2 text-xs font-semibold text-black shadow-[0px_0px_30px_0px_rgba(253,224,169,0.5),0px_0px_1px_2px_rgba(255,255,255,0.1)] lg:flex"
					data-umami-event="llamaai-nav-link"
					data-umami-event-subscribed={isClient && hasActiveSubscription ? 'true' : 'false'}
				>
					<svg className="h-4 w-4 shrink-0">
						<use href="/assets/llamaai/ask-llamaai-3.svg#ai-icon" />
					</svg>
					<span className="whitespace-nowrap">Ask LlamaAI</span>
				</BasicLink>
			)}
		</>
	)
}

const SearchItem = ({
	route,
	recent = false,
	onSelect
}: {
	route: ISearchItem
	recent?: boolean
	onSelect?: () => void
}) => {
	const router = useRouter()
	return (
		<Ariakit.ComboboxItem
			className="flex flex-wrap items-center gap-2 px-2 py-2 hover:bg-(--link-bg) focus-visible:bg-(--link-bg) data-active-item:bg-(--link-bg) lg:px-4"
			render={
				<BasicLink
					href={route.route}
					shallow={
						!!(route.subName && route.route.includes('?') && router.asPath.startsWith(route.route.split('?')[0]))
					}
				/>
			}
			onClick={() => {
				if (!recent) {
					setRecentSearch(route)
				}
				onSelect?.()
			}}
			value={route.route}
		>
			{route.logo ? (
				<img src={route.logo} alt={route.name} className="h-6 w-6 rounded-full" loading="lazy" />
			) : (
				<Icon name="file-text" className="h-6 w-6" />
			)}
			<span>{route.name}</span>
			{route.subName ? (
				<>
					<Icon name="chevron-right" height={16} width={16} className="text-(--text-form)" />
					<span className="text-(--text-form)">{route.subName}</span>
				</>
			) : null}
			{route.deprecated && <span className="text-xs text-(--error)">(Deprecated)</span>}
			{route.hideType ? null : recent ? (
				<Icon name="clock" height={12} width={12} className="ml-auto" />
			) : (
				<span className="ml-auto text-xs text-(--link-text)">{route.type}</span>
			)}
		</Ariakit.ComboboxItem>
	)
}

const setRecentSearch = (route: ISearchItem) => {
	const recentSearch = window.localStorage.getItem('recentSearch')
	const recentSearchArray = JSON.parse(recentSearch ?? '[]')
	setStorageItem(
		'recentSearch',
		JSON.stringify([route, ...recentSearchArray.filter((r: ISearchItem) => r.route !== route.route).slice(0, 2)])
	)
}

const useDefaultSearchList = () => {
	const { data, isLoading, error } = useQuery({
		queryKey: ['search', 'default-list'],
		queryFn: getDefaultSearchList,
		staleTime: 1000 * 60 * 60,
		refetchOnMount: false,
		refetchOnWindowFocus: false
	})

	const recentSearch = useStorageItem('recentSearch', '[]')

	const { defaultSearchList, recentSearchList } = useMemo(() => {
		if (!data || data.length === 0) return { defaultSearchList: [], recentSearchList: [] }

		const recentSearchArray = JSON.parse(recentSearch)

		return {
			defaultSearchList:
				data?.filter((route: ISearchItem) => !recentSearchArray.some((r: ISearchItem) => r.route === route.route)) ??
				[],
			recentSearchList: recentSearchArray ?? []
		}
	}, [data, recentSearch])

	return {
		defaultSearchList,
		recentSearchList,
		isLoadingDefaultSearchList: isLoading,
		errorDefaultSearchList: error
	}
}

function useSearch(searchValue: string) {
	return useQuery({
		queryKey: ['search', 'results', searchValue],
		queryFn: () => fetchSearchList(searchValue),
		enabled: searchValue.length > 0,
		staleTime: 5 * 60 * 1000,
		refetchOnWindowFocus: false
	})
}
