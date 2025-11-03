import { useRouter } from 'next/router'

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
		<div className="relative flex flex-col rounded-md">
			<input
				placeholder={placeholder}
				onChange={onChange}
				type="number"
				className="rounded-md border border-(--cards-border) bg-(--app-bg) px-2 py-1 text-base"
			/>
		</div>
	)
}
