import { useRouter } from 'next/router'
import { Input, SearchIcon, SearchWrapper } from './v2/IncludeExcludeTokens'

export function LTV({ placeholder }: { placeholder: string }) {
	const router = useRouter()

	const setLTV = (value) => {
		router.push(
			{
				pathname: router.pathname,
				query: {
					...router.query,
					customLTV: value
				}
			},
			undefined,
			{
				shallow: true
			}
		)
	}

	const onChange = (e) => {
		let timer

		if (timer) {
			clearTimeout(timer)
		}

		timer = setTimeout(() => setLTV(e.target.value), 1000)
	}

	return (
		<SearchWrapper style={{ padding: '8px' }}>
			<SearchIcon size={16} />
			<Input placeholder={placeholder} onChange={onChange} />
		</SearchWrapper>
	)
}
