import { Icon } from '~/components/Icon'

export function SubscribeEnterpriseCard({ active = false }: { active?: boolean }) {
	return (
		<>
			<ul className="mx-auto mb-auto flex w-full flex-col gap-3 py-6 max-sm:text-sm">
				<li className="flex flex-nowrap items-start gap-2.5">
					<Icon name="check" height={16} width={16} className="relative top-1 shrink-0 text-green-400" />
					<span>All features included in Pro and API tiers</span>
				</li>
				<li className="flex flex-nowrap items-start gap-2.5">
					<Icon name="check" height={16} width={16} className="relative top-1 shrink-0 text-green-400" />
					<span>Direct raw access to our database</span>
				</li>
				<li className="flex flex-nowrap items-start gap-2.5">
					<Icon name="check" height={16} width={16} className="relative top-1 shrink-0 text-green-400" />
					<span>Custom bespoke solutions that fit your needs</span>
				</li>
				<li className="flex flex-nowrap items-start gap-2.5">
					<Icon name="check" height={16} width={16} className="relative top-1 shrink-0 text-green-400" />
					<span>Hourly data</span>
				</li>
				<li className="flex flex-nowrap items-start gap-2.5">
					<Icon name="check" height={16} width={16} className="relative top-1 shrink-0 text-green-400" />
					<span>Access to non-public data, such as TVL breakdowns by token address</span>
				</li>
				<li className="flex flex-nowrap items-start gap-2.5">
					<Icon name="check" height={16} width={16} className="relative top-1 shrink-0 text-green-400" />
					<span>Custom data licensing agreements</span>
				</li>
			</ul>
			<a
				className="group mt-auto flex w-full flex-nowrap items-center justify-center gap-2 rounded-lg border border-[#5C5CF9] bg-[#5C5CF9] py-3.5 font-medium text-white shadow-xs transition-all duration-200 hover:bg-[#4A4AF0] hover:shadow-md disabled:cursor-not-allowed disabled:opacity-70 dark:border-[#5C5CF9] dark:bg-[#5C5CF9] dark:hover:bg-[#4A4AF0]"
				target="_blank"
				rel="noopener noreferrer"
				href="mailto:sales@defillama.com"
			>
				<Icon name="mail" height={16} width={16} />
				Contact Us
			</a>
			{active && (
				<div className="mt-2 flex flex-col gap-2">
					<span className="text-center font-bold text-green-400">Current Plan</span>
				</div>
			)}
		</>
	)
}
