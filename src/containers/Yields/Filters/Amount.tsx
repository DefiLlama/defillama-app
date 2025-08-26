import * as React from 'react'
import { useRouter } from 'next/router'

export function InputFilter({ placeholder, filterKey }: { placeholder: string; filterKey: string }) {
	const router = useRouter()
	const ref = React.useRef(null)

	const set = (value) => {
		router.push(
			{
				pathname: router.pathname,
				query: {
					...router.query,
					[filterKey]: value
				}
			},
			undefined,
			{
				shallow: true
			}
		)
	}

	React.useEffect(() => {
		if (router.query[filterKey]) {
			ref.current.value = router.query[filterKey]
		}
	}, [filterKey, router.query])

	const onChange = (e) => {
		let timer

		if (timer) {
			clearTimeout(timer)
		}

		timer = setTimeout(() => set(e.target.value), 1000)
	}

	return (
		<div className="relative flex flex-col rounded-md">
			<input
				placeholder={placeholder}
				onChange={onChange}
				type="number"
				ref={ref}
				className="rounded-md border border-(--cards-border) bg-(--app-bg) px-2 py-1 text-base"
			/>
		</div>
	)
}
