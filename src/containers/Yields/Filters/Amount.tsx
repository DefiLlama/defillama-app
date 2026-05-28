import { useRouter } from 'next/router'
import * as React from 'react'
import { pushYieldsQuery } from '../queryUpdates.client'

export function InputFilter({ placeholder, filterKey }: { placeholder: string; filterKey: string }) {
	const router = useRouter()
	const ref = React.useRef(null)

	const set = (value) => {
		void pushYieldsQuery(router, { [filterKey]: value || undefined })
	}

	const rawFilterValue = router.query[filterKey]
	const filterValue = Array.isArray(rawFilterValue) ? rawFilterValue.join(',') : (rawFilterValue ?? '')

	React.useEffect(() => {
		if (filterValue) {
			ref.current.value = filterValue
		}
	}, [filterKey, filterValue])

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
