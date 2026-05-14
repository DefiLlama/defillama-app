import * as Ariakit from '@ariakit/react'
import { useQuery } from '@tanstack/react-query'
import { useEffect, useMemo, useState } from 'react'
import { Icon } from '~/components/Icon'
import { listArticles, type ArticleListResponse } from '~/containers/Articles/api'
import type { ArticleDocument } from '~/containers/Articles/types'
import { ARTICLE_SECTION_LABELS } from '~/containers/Articles/types'
import { useAuthContext } from '~/containers/Subscription/auth'

type ListArticlesParams = NonNullable<Parameters<typeof listArticles>[0]>

type Props = {
	value: string | null
	onChange: (article: ArticleDocument | null) => void
	hint?: string
	error?: string | null
	listArticlesParams?: Partial<ListArticlesParams>
}

export function ArticlePicker({ value, onChange, hint, error, listArticlesParams }: Props) {
	const { authorizedFetch } = useAuthContext()
	const [searchValue, setSearchValue] = useState('')
	const [open, setOpen] = useState(false)
	const [selectedLabel, setSelectedLabel] = useState<string>('')

	const trimmed = searchValue.trim()

	const { data: results, isFetching } = useQuery<ArticleListResponse>({
		queryKey: ['research', 'admin', 'article-picker', trimmed, listArticlesParams],
		queryFn: () =>
			listArticles({ query: trimmed || undefined, limit: 20, sort: 'newest', ...listArticlesParams }, authorizedFetch),
		retry: false,
		staleTime: 30_000,
		enabled: open
	})

	const items = useMemo<ArticleDocument[]>(() => results?.items ?? [], [results])

	const selectedQuery = useQuery<ArticleDocument | null>({
		queryKey: ['research', 'admin', 'article-picker', 'selected', value, listArticlesParams],
		queryFn: async () => {
			if (!value) return null
			const matched = items.find((item) => item.id === value)
			if (matched) return matched
			const fallback = await listArticles({ limit: 50, sort: 'newest', ...listArticlesParams }, authorizedFetch)
			return fallback.items.find((item) => item.id === value) ?? null
		},
		enabled: !!value && !selectedLabel,
		retry: false,
		staleTime: 60_000
	})

	useEffect(() => {
		if (!value) {
			setSelectedLabel('')
			return
		}
		const fromItems = items.find((item) => item.id === value)
		if (fromItems) {
			setSelectedLabel(fromItems.title)
			return
		}
		if (selectedQuery.data) {
			setSelectedLabel(selectedQuery.data.title)
		}
	}, [value, items, selectedQuery.data])

	return (
		<div className="grid gap-1.5">
			<Ariakit.ComboboxProvider
				open={open}
				setOpen={setOpen}
				setValue={(next) => setSearchValue(next)}
				resetValueOnHide
			>
				<div
					className={`relative flex items-center rounded-md border bg-(--app-bg) ${error ? 'border-red-500/60' : 'border-(--cards-border) focus-within:border-(--link-text)/60'}`}
				>
					<Icon name="search" height={14} width={14} className="absolute left-3 text-(--text-tertiary)" />
					<Ariakit.Combobox
						placeholder={selectedLabel ? selectedLabel : 'Search articles by title…'}
						autoSelect
						className="min-h-10 w-full rounded-md bg-transparent px-3 py-2 pr-9 pl-9 text-sm text-(--text-primary) outline-none placeholder:text-(--text-tertiary)"
					/>
					{value ? (
						<button
							type="button"
							onClick={() => {
								setSelectedLabel('')
								setSearchValue('')
								onChange(null)
							}}
							aria-label="Clear selection"
							className="absolute right-2 flex h-6 w-6 items-center justify-center rounded-md text-(--text-tertiary) transition-colors hover:bg-(--link-hover-bg) hover:text-(--text-primary)"
						>
							<Icon name="x" height={12} width={12} />
						</button>
					) : null}
				</div>
				<Ariakit.ComboboxPopover
					gutter={6}
					sameWidth
					portal
					unmountOnHide
					className="z-[90] flex max-h-72 flex-col overflow-auto overscroll-contain rounded-md border border-(--cards-border) bg-(--cards-bg) py-1 text-sm shadow-xl outline-none"
				>
					{isFetching && !items.length ? (
						<p className="px-3 py-3 text-center text-xs text-(--text-tertiary)">Searching…</p>
					) : null}
					{!isFetching && !items.length ? (
						<p className="px-3 py-3 text-center text-xs text-(--text-tertiary)">No results</p>
					) : null}
					{items.map((article) => (
						<Ariakit.ComboboxItem
							key={article.id}
							value={article.title}
							setValueOnClick={false}
							onClick={() => {
								setSelectedLabel(article.title)
								setSearchValue('')
								onChange(article)
								setOpen(false)
							}}
							className="flex cursor-pointer flex-col gap-0.5 px-3 py-2 text-(--text-secondary) data-active-item:bg-(--link-button) data-active-item:text-(--link-text)"
						>
							<span className="truncate text-sm text-(--text-primary)">{article.title}</span>
							<span className="font-jetbrains text-[10px] tracking-[0.16em] text-(--text-tertiary) uppercase">
								{article.section ? ARTICLE_SECTION_LABELS[article.section] : 'No section'} · /{article.slug}
							</span>
						</Ariakit.ComboboxItem>
					))}
				</Ariakit.ComboboxPopover>
			</Ariakit.ComboboxProvider>
			{value && selectedLabel ? (
				<p className="font-jetbrains text-[10px] tracking-[0.16em] text-(--text-tertiary) uppercase">
					Selected: <span className="tracking-normal text-(--text-secondary) normal-case">{selectedLabel}</span>
				</p>
			) : null}
			{hint ? <p className="text-xs text-(--text-tertiary)">{hint}</p> : null}
			{error ? <p className="text-xs text-red-500">{error}</p> : null}
		</div>
	)
}
