import { useRouter } from 'next/router'
import { useEffect, useRef, useState } from 'react'
import { Icon } from '~/components/Icon'
import { pushShallowQuery } from '~/utils/routerQuery'

export function DashboardSearch({ defaultValue }: { defaultValue?: string }) {
	const router = useRouter()
	const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
	const inputRef = useRef<HTMLInputElement>(null)
	const [inputValue, setInputValue] = useState(defaultValue ?? '')

	useEffect(() => {
		return () => {
			if (timeoutRef.current) {
				clearTimeout(timeoutRef.current)
			}
		}
	}, [])

	const handleChange = (value: string) => {
		setInputValue(value)

		if (timeoutRef.current) {
			clearTimeout(timeoutRef.current)
		}
		timeoutRef.current = setTimeout(() => {
			pushShallowQuery(
				router,
				{
					page: undefined,
					query: value || undefined
				},
				'/pro'
			)
		}, 300)
	}

	const handleClear = () => {
		setInputValue('')
		if (inputRef.current) {
			inputRef.current.focus()
		}
		if (timeoutRef.current) {
			clearTimeout(timeoutRef.current)
		}
		pushShallowQuery(
			router,
			{
				page: undefined,
				query: undefined
			},
			'/pro'
		)
	}

	return (
		<div className="w-full flex-1 lg:max-w-3xl">
			<div className="relative flex-1">
				<Icon
					name="search"
					height={16}
					width={16}
					className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-(--text-tertiary)"
				/>
				<input
					ref={inputRef}
					type="text"
					value={inputValue}
					onChange={(e) => handleChange(e.target.value)}
					placeholder="Search dashboards…"
					className="w-full rounded-md border border-(--form-control-border) bg-(--cards-bg) py-2.5 pr-9 pl-9 text-sm transition-shadow duration-150 focus:border-(--primary) focus:shadow-[0_0_0_3px_rgba(var(--primary-rgb),0.15)] focus:outline-hidden"
				/>
				{inputValue && (
					<button
						onClick={handleClear}
						className="absolute top-1/2 right-3 -translate-y-1/2 rounded p-1 text-(--text-tertiary) transition-colors hover:bg-(--bg-hover) hover:text-(--text-primary)"
						type="button"
					>
						<Icon name="x" height={14} width={14} />
						<span className="sr-only">Clear search</span>
					</button>
				)}
			</div>
		</div>
	)
}
