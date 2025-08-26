import { Icon } from '~/components/Icon'
import { useDarkModeManager } from '~/contexts/LocalStorage'

export function SubscribeEnterpriseCard({ active = false }: { active?: boolean }) {
	return (
		<div
			className={`price-card relative flex w-[92vw] shrink-0 snap-center flex-col overflow-hidden rounded-xl border border-[#4a4a50] bg-[#22242930] px-5 py-8 shadow-md backdrop-blur-md transition-all duration-300 hover:transform md:w-auto md:max-w-[400px] md:flex-1 md:shrink md:snap-none md:px-5 md:hover:scale-[1.02]`}
		>
			<div className="absolute top-0 left-0 h-1 w-full bg-linear-to-r from-transparent via-gray-500 to-transparent opacity-20"></div>
			<div className="absolute top-[-30px] right-[-30px] h-[80px] w-[80px] rounded-full bg-gray-600 opacity-5 blur-2xl"></div>
			<h2 className="text-center text-[2rem] font-extrabold whitespace-nowrap">Enterprise</h2>
			<span className="h-8"></span>
			<span className="h-7"></span>
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
		</div>
	)
}
