import { Icon } from '~/components/Icon'
import { useDarkModeManager } from '~/contexts/LocalStorage'

interface FreeCardProps {
	context?: 'modal' | 'page' | 'account'
}

export function FreeCard({ context = 'page' }: FreeCardProps) {
	const [isDarkMode] = useDarkModeManager()
	const isModal = context === 'modal'
	const shouldShowLightMode = isModal && !isDarkMode
	return (
		<div
			className={`flex w-full shrink-0 snap-center flex-col px-4 py-8 md:w-auto md:max-w-[400px] md:flex-1 md:shrink md:snap-none md:px-5 ${
				shouldShowLightMode ? 'border-[#e5e7eb] bg-[#f8f9fa]' : 'border-[#4a4a50] bg-[#22242930]'
			} relative overflow-hidden rounded-xl border shadow-md backdrop-blur-md transition-all duration-300${
				isModal ? '' : 'hover:transform md:hover:scale-[1.02]'
			}`}
		>
			<div className="absolute top-0 left-0 h-1 w-full bg-linear-to-r from-transparent via-gray-500 to-transparent opacity-20"></div>
			<div className="absolute top-[-30px] right-[-30px] h-[80px] w-[80px] rounded-full bg-gray-600 opacity-5 blur-2xl"></div>
			<h2 className="relative z-10 text-center text-[2rem] font-extrabold whitespace-nowrap">Free</h2>
			<div className="relative z-10 mt-2 flex items-center justify-center">
				<span className="bg-linear-to-r from-gray-400 to-gray-500 bg-clip-text text-center text-3xl font-bold text-transparent">
					$0
				</span>
				<span className="ml-1 text-[#8a8c90]">/month</span>
			</div>
			<p className="relative z-10 mt-1 text-center text-sm text-transparent">-</p>
			<div className="relative z-10 mt-4 h-[52px]"></div>
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
			</ul>
		</div>
	)
}
