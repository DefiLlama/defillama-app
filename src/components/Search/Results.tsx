import * as Ariakit from '@ariakit/react'
import { matchSorter } from 'match-sorter'
import { startTransition, useDeferredValue, useMemo, useState } from 'react'
import metadataCache from '~/utils/metadata'
import { BasicLink } from '../Link'
import { chainIconUrl, tokenIconUrl } from '~/utils'
import { Icon } from '../Icon'
const { searchList } = metadataCache

export const Results = () => {
	const [searchValue, setSearchValue] = useState('')
	const deferredSearchValue = useDeferredValue(searchValue)

	const finalSearchList = useMemo(() => {
		if (!deferredSearchValue)
			return searchList.map((cat) => ({ category: cat.category, pages: cat.pages.slice(0, 3), route: cat.route }))
		return matchSorter(searchList, deferredSearchValue, {
			baseSort: (a, b) => (a.index < b.index ? -1 : 1),
			keys: ['category', 'pages.*.name'],
			threshold: matchSorter.rankings.CONTAINS
		})
			.map((cat) => ({
				category: cat.category,
				pages: cat.pages.filter(
					(page) =>
						matchSorter([page], deferredSearchValue, {
							keys: ['name'],
							threshold: matchSorter.rankings.CONTAINS
						}).length > 0
				),
				route: cat.route
			}))
			.filter((category) => category.pages.length > 0)
	}, [deferredSearchValue])

	return (
		<Ariakit.Dialog
			className="dialog p-0 gap-0 sm:w-full sm:max-w-[min(85vw,615px)] max-sm:drawer h-[min(515px,100vh-32px)]"
			unmountOnHide
			onClose={() => {
				setSearchValue('')
			}}
		>
			<Ariakit.ComboboxProvider
				setValue={(value) => {
					startTransition(() => {
						setSearchValue(value)
					})
				}}
			>
				<span className="relative w-full">
					<Ariakit.Combobox
						placeholder="Search across blockchains, protocols, metrics..."
						autoFocus
						className="bg-white dark:bg-black rounded-t-md p-4 border-b-2 border-(--cards-border) w-full"
					/>
					<Ariakit.DialogDismiss className="rounded-md text-xs text-(--link-text) bg-(--link-bg) px-[10px] absolute top-[10px] right-[10px] bottom-[10px] m-auto flex items-center justify-center">
						Esc
					</Ariakit.DialogDismiss>
				</span>
				<Ariakit.ComboboxList className="overflow-y-auto p-4 flex flex-col gap-2" alwaysVisible>
					{finalSearchList.map((cat) => {
						const getLogo = ['Chains', 'Protocols'].includes(cat.category)
							? (name: string) => (cat.category === 'Chains' ? chainIconUrl(name) : tokenIconUrl(name))
							: null
						return (
							<div className="flex flex-col" key={`global-search-${cat.category}`}>
								<div className="flex items-center justify-between gap-1 flex-wrap">
									<h1 className="text-sm font-medium mb-2">{cat.category}</h1>
									{cat.route ? (
										<BasicLink href={cat.route} className="text-(--link) ml-auto">
											See all
										</BasicLink>
									) : null}
								</div>
								{cat.pages.map((route) => (
									<Ariakit.ComboboxItem
										className="p-2 rounded-md hover:bg-(--cards-bg) flex items-center gap-2"
										key={`global-search-${route.name}-${route.route}`}
										render={<BasicLink href={route.route} />}
									>
										{getLogo ? (
											<img src={getLogo(route.name)} alt={route.name} className="w-6 h-6 rounded-full" loading="lazy" />
										) : (
											<Icon name="file-text" className="w-6 h-6" />
										)}
										<span>{route.name}</span>
									</Ariakit.ComboboxItem>
								))}
							</div>
						)
					})}
				</Ariakit.ComboboxList>
			</Ariakit.ComboboxProvider>
		</Ariakit.Dialog>
	)
}
