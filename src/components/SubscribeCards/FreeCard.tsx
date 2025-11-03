import { Icon } from '~/components/Icon'

export function FreeCard() {
	return (
		<>
			<h2 className="text-center text-[2rem] font-extrabold whitespace-nowrap">Free</h2>
			<span className="h-8"></span>
			<span className="h-7"></span>
			<ul className="mx-auto mb-auto flex w-full flex-col gap-3 py-6 max-sm:text-sm">
				<li className="flex flex-nowrap items-start gap-2.5">
					<Icon name="check" height={16} width={16} className="relative top-1 shrink-0 text-green-400" />
					<span>Overview of chains & protocol metrics</span>
				</li>
				<li className="flex flex-nowrap items-start gap-2.5">
					<Icon name="check" height={16} width={16} className="relative top-1 shrink-0 text-green-400" />
					<span>Yields and stablecoins dashboards</span>
				</li>
				<li className="flex flex-nowrap items-start gap-2.5">
					<Icon name="check" height={16} width={16} className="relative top-1 shrink-0 text-green-400" />
					<span>Token unlock schedules</span>
				</li>
				<li className="flex flex-nowrap items-start gap-2.5">
					<Icon name="check" height={16} width={16} className="relative top-1 shrink-0 text-green-400" />
					<span>Funding rounds & raises</span>
				</li>
				<li className="flex flex-nowrap items-start gap-2.5">
					<Icon name="check" height={16} width={16} className="relative top-1 shrink-0 text-green-400" />
					<span>Access to all our data through the dashboard</span>
				</li>
				<li className="flex flex-nowrap items-start gap-2.5">
					<Icon name="x" height={16} width={16} className="relative top-1 shrink-0 text-red-400" />
					<span>Access to LlamaAI</span>
				</li>
				<li className="flex flex-nowrap items-start gap-2.5">
					<Icon name="x" height={16} width={16} className="relative top-1 shrink-0 text-red-400" />
					<span>Create Custom DefiLlama Pro Dashboards</span>
				</li>
				<li className="flex flex-nowrap items-start gap-2.5">
					<Icon name="x" height={16} width={16} className="relative top-1 shrink-0 text-red-400" />
					<span>CSV data downloads</span>
				</li>
				<li className="flex flex-nowrap items-start gap-2.5">
					<Icon name="x" height={16} width={16} className="relative top-1 shrink-0 text-red-400" />
					<span>Full access to LlamaFeed</span>
				</li>
			</ul>
		</>
	)
}
