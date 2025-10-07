import { Icon } from '~/components/Icon'
import { useDarkModeManager } from '~/contexts/LocalStorage'

export function SubscribeEnterpriseCard({ active = false, context = 'page' }: { active?: boolean; context?: 'page' | 'account' }) {
	const [isDarkMode] = useDarkModeManager()
	const isModal = false
	const shouldShowLightMode = isModal && !isDarkMode
	return (
		<div
			className={`flex w-full shrink-0 snap-center flex-col px-4 py-8 md:w-auto md:flex-1 md:shrink md:snap-none md:px-5 ${
				shouldShowLightMode ? 'border-[#e5e7eb] bg-[#f8f9fa]' : 'border-[#4a4a50] bg-[#22242930]'
			} relative overflow-hidden rounded-xl border shadow-md backdrop-blur-md transition-all duration-300 hover:transform md:hover:scale-[1.02]`}
		>
			<div className="absolute top-0 left-0 h-1 w-full bg-linear-to-r from-transparent via-gray-500 to-transparent opacity-20"></div>
			<div className="absolute top-[-30px] right-[-30px] h-[80px] w-[80px] rounded-full bg-gray-600 opacity-5 blur-2xl"></div>
			<h2 className="relative z-10 text-center text-[2rem] font-extrabold whitespace-nowrap">Enterprise</h2>
			<div className="relative z-10 mt-2 flex min-h-[36px] items-center justify-center">
				<span className="text-center text-xl font-medium text-[#8a8c90]">
					Custom pricing
				</span>
			</div>
			<p className="relative z-10 mt-1 min-h-[20px] text-center text-sm text-transparent">-</p>
			<div className="relative z-10 mx-auto mt-4 flex w-full flex-col gap-3">
				<a
					className="group flex w-full flex-nowrap items-center justify-center gap-2 rounded-lg bg-linear-to-r from-[#5C5CF9] to-[#6E6EFA] px-4 py-3 font-medium text-white shadow-lg transition-all duration-200 hover:from-[#4A4AF0] hover:to-[#5A5AF5] hover:shadow-[#5C5CF9]/20"
					target="_blank"
					rel="noopener noreferrer"
					href="mailto:sales@defillama.com"
				>
					<Icon name="mail" height={16} width={16} />
					Contact Us
				</a>
			</div>
			<EnterpriseCardContent active={active} />
		</div>
	)
}

export function EnterpriseCardContent({ active = false }: { active?: boolean }) {
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
			{active && (
				<div className="mt-2 flex flex-col gap-2">
					<span className="text-center font-bold text-green-400">Current Plan</span>
				</div>
			)}
		</>
	)
}
