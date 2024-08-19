import { useRouter } from 'next/router'
import React from 'react'
import { Search } from 'react-feather'
import { Wrapper } from './LTV'

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
		<Wrapper data-alwaysdisplay>
			<Search size={16} />
			<input placeholder={placeholder} onChange={onChange} type="number" ref={ref} />
		</Wrapper>
	)
}
