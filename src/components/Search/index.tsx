import * as Ariakit from '@ariakit/react'
import { startTransition, useEffect, useRef, useState } from 'react'
import { BasicLink } from '../Link'
import { Icon } from '../Icon'
import { instantMeiliSearch } from '@meilisearch/instant-meilisearch'
import { InstantSearch, useInstantSearch, useSearchBox } from 'react-instantsearch'
import { fetchJson } from '~/utils/async'
import { useQuery } from '@tanstack/react-query'

const { searchClient } = instantMeiliSearch(
	'https://search.defillama.com',
	'ee4d49e767f84c0d1c4eabd841e015f02d403e5abf7ea2a523827a46b02d5ad5'
)

async function getSearchList() {
	try {
		const data = await fetchJson('https://defillama-datasets.llama.fi/searchlist.json')
		return data
	} catch (error) {
		throw new Error(error instanceof Error ? error.message : 'Unknown error')
	}
}

interface ISearchItem {
	name: string
	logo: string
	symbol?: string
	route: string
	type: string
	deprecated?: boolean
}

export const GlobalSearch = () => {
	return (
		<InstantSearch indexName="pages" searchClient={searchClient as any} future={{ preserveSharedStateOnUnmount: true }}>
			<Search />
		</InstantSearch>
	)
}

const Search = () => {
	const { query, refine } = useSearchBox()

	const { results, status, error } = useInstantSearch({ catchError: true })

	const {
		data: searchList,
		isLoading: isLoadingSearchList,
		error: errorSearchList
	} = useQuery({
		queryKey: ['searchlist'],
		queryFn: getSearchList,
		staleTime: 1000 * 60 * 60,
		refetchOnMount: false,
		refetchOnWindowFocus: false,
		gcTime: 1000 * 60 * 60
	})

	const [open, setOpen] = useState(false)
	const inputField = useRef<HTMLInputElement>(null)
	useEffect(() => {
		function focusSearchBar(e: KeyboardEvent) {
			if ((e.ctrlKey || e.metaKey) && e.code === 'KeyK') {
				e.preventDefault()
				inputField.current && inputField.current?.focus()
				setOpen(true)
			}
		}

		window.addEventListener('keydown', focusSearchBar)

		return () => window.removeEventListener('keydown', focusSearchBar)
	}, [setOpen])

	return (
		<Ariakit.ComboboxProvider
			resetValueOnHide
			setValue={(value) => {
				startTransition(() => {
					refine(value)
				})
			}}
			open={open}
			setOpen={setOpen}
		>
			<span className="relative isolate w-full max-w-[50vw]">
				<button onClick={(prev) => setOpen(!prev)} className="absolute top-[8px] left-[8px] opacity-50">
					{open ? (
						<>
							<span className="sr-only">Close Search</span>
							<Icon name="x" height={16} width={16} />
						</>
					) : (
						<>
							<span className="sr-only">Open Search</span>
							<Icon name="search" height={14} width={14} />
						</>
					)}
				</button>
				<Ariakit.Combobox
					placeholder="Search..."
					autoSelect
					ref={inputField}
					className="w-full text-sm rounded-md border border-(--cards-border) text-black dark:text-white bg-(--app-bg) py-[5px] px-[10px] pl-7"
				/>
				<span className="rounded-md text-xs text-(--link-text) bg-(--link-bg) p-1 absolute top-1 right-1 bottom-1 m-auto flex items-center justify-center">
					⌘K
				</span>
			</span>
			<Ariakit.ComboboxPopover
				unmountOnHide
				hideOnInteractOutside
				gutter={6}
				sameWidth
				className="flex flex-col bg-(--cards-bg) rounded-b-md z-10 overflow-auto overscroll-contain border border-t-0 border-(--cards-border) max-sm:drawer h-full max-h-[70vh] sm:max-h-[60vh]"
			>
				{query ? (
					status === 'loading' ? (
						<p className="flex items-center justify-center p-4">Loading...</p>
					) : error ? (
						<p className="flex items-center justify-center p-4 text-(--pct-red)">{`Error: ${error.message}`}</p>
					) : !results?.hits?.length ? (
						<p className="flex items-center justify-center p-4">No results found</p>
					) : (
						results.hits.map((route: ISearchItem) => {
							return (
								<Ariakit.ComboboxItem
									className="px-4 py-2 hover:bg-(--link-bg) flex items-center gap-2"
									key={`global-search-${route.name}-${route.route}`}
									render={<BasicLink href={route.route} />}
								>
									{route.logo ? (
										<img src={route.logo} alt={route.name} className="w-6 h-6 rounded-full" loading="lazy" />
									) : (
										<Icon name="file-text" className="w-6 h-6" />
									)}
									<span>{route.name}</span>
									<span className="text-xs text-(--link-text) ml-auto">{route.type}</span>
								</Ariakit.ComboboxItem>
							)
						})
					)
				) : isLoadingSearchList ? (
					<p className="flex items-center justify-center p-4">Loading...</p>
				) : errorSearchList ? (
					<p className="flex items-center justify-center p-4 text-(--pct-red)">{`Error: ${errorSearchList.message}`}</p>
				) : !searchList?.length ? (
					<p className="flex items-center justify-center p-4">No results found</p>
				) : (
					searchList.map((route: ISearchItem) => {
						return (
							<Ariakit.ComboboxItem
								className="px-4 py-2 hover:bg-(--link-bg) flex items-center gap-2"
								key={`global-search-dl-${route.name}-${route.route}`}
								render={<BasicLink href={route.route} />}
							>
								{route.logo ? (
									<img src={route.logo} alt={route.name} className="w-6 h-6 rounded-full" loading="lazy" />
								) : (
									<Icon name="file-text" className="w-6 h-6" />
								)}
								<span>{route.name}</span>
								<span className="text-xs text-(--link-text) ml-auto">{route.type}</span>
							</Ariakit.ComboboxItem>
						)
					})
				)}
			</Ariakit.ComboboxPopover>
		</Ariakit.ComboboxProvider>
	)
}
