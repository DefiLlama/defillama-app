import { useRouter } from 'next/router'
import React from 'react'
import { Icon } from '~/components/Icon'

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
			<Icon name="search" height={16} width={16} className="absolute top-[10px] left-[6px] opacity-50" />
			<input
				placeholder={placeholder}
				onChange={onChange}
				type="number"
				ref={ref}
				className="p-2 pl-8 rounded-md text-sm bg-white text-black dark:bg-[#22242a] dark:text-white border border-black/10 dark:border-white/10"
			/>
		</div>
	)
}
