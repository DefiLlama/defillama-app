import Router from 'next/router'

export function LTV({ placeholder }: { placeholder: string }) {
	const setLTV = (value) => {
		const params = new URLSearchParams(window.location.search)
		params.set('customLTV', value)
		Router.push(`${window.location.pathname}?${params.toString()}`, undefined, { shallow: true })
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
