import { Icon } from '~/components/Icon'
import { useDarkModeManager } from '~/contexts/LocalStorage'

export function SubscribeEnterpriseCard({ active = false }: { active?: boolean }) {
	return (
		<div
			className={`price-card py-8 px-5 flex flex-col w-[92vw] snap-center shrink-0 md:w-auto md:flex-1 md:max-w-[400px] md:px-5 md:snap-none md:shrink relative transition-all duration-300 hover:transform md:hover:scale-[1.02] bg-[#22242930] border-[#4a4a50] backdrop-blur-md rounded-xl border shadow-md overflow-hidden`}
		>
			<div className="absolute top-0 left-0 w-full h-1 bg-linear-to-r from-transparent via-gray-500 to-transparent opacity-20"></div>
			<div className="absolute top-[-30px] right-[-30px] w-[80px] h-[80px] rounded-full bg-gray-600 opacity-5 blur-2xl"></div>
			<h2 className="whitespace-nowrap text-[2rem] font-extrabold text-center">Enterprise</h2>
			<span className="h-8"></span>
			<span className="h-7"></span>
			<ul className="flex flex-col mx-auto gap-3 py-6 mb-auto w-full max-sm:text-sm">
				<li className="flex flex-nowrap gap-[10px] items-start">
					<Icon name="check" height={16} width={16} className="relative top-1 text-green-400 shrink-0" />
					<span>All features included in Llama+ and Pro tiers</span>
				</li>
				<li className="flex flex-nowrap gap-[10px] items-start">
					<Icon name="check" height={16} width={16} className="relative top-1 text-green-400 shrink-0" />
					<span>Direct raw access to our database</span>
				</li>
				<li className="flex flex-nowrap gap-[10px] items-start">
					<Icon name="check" height={16} width={16} className="relative top-1 text-green-400 shrink-0" />
					<span>Custom bespoke solutions that fit your needs</span>
				</li>
				<li className="flex flex-nowrap gap-[10px] items-start">
					<Icon name="check" height={16} width={16} className="relative top-1 text-green-400 shrink-0" />
					<span>Hourly data</span>
				</li>
				<li className="flex flex-nowrap gap-[10px] items-start">
					<Icon name="check" height={16} width={16} className="relative top-1 text-green-400 shrink-0" />
					<span>Access to non-public data, such as TVL breakdowns by token address</span>
				</li>
				<li className="flex flex-nowrap gap-[10px] items-start">
					<Icon name="check" height={16} width={16} className="relative top-1 text-green-400 shrink-0" />
					<span>Custom data licensing agreements</span>
				</li>
			</ul>
			<a
				className="mt-auto font-medium rounded-lg border border-[#5C5CF9] dark:border-[#5C5CF9] bg-[#5C5CF9] dark:bg-[#5C5CF9] hover:bg-[#4A4AF0] dark:hover:bg-[#4A4AF0] text-white transition-all duration-200 py-[14px] shadow-xs hover:shadow-md group flex items-center gap-2 justify-center w-full disabled:cursor-not-allowed disabled:opacity-70 flex-nowrap"
				target="_blank"
				rel="noopener noreferrer"
				href="mailto:sales@defillama.com"
			>
				<Icon name="mail" height={16} width={16} />
				Contact Us
			</a>
			{active && (
				<div className="flex flex-col gap-2 mt-2">
					<span className="text-center text-green-400 font-bold">Current Plan</span>
				</div>
			)}
		</div>
	)
}
