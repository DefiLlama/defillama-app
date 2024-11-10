import { useRouter } from 'next/router'
import { Icon } from '~/components/Icon'

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
			<Icon name="search" height={16} width={16} className="absolute top-[10px] left-[6px] opacity-50" />
			<input
				placeholder={placeholder}
				onChange={onChange}
				type="number"
				className="p-2 pl-8 rounded-md text-sm bg-white text-black dark:bg-[#22242a] dark:text-white border border-black/10 dark:border-white/10"
			/>
		</div>
	)
}
