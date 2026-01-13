import { Icon } from '~/components/Icon'

export function SubscribeEnterpriseCard({ active = false, isButton = false }: { active?: boolean; isButton?: boolean }) {
	// When used as a button (in other contexts), just render the contact button
	if (isButton) {
		return (
			<>
				<a
					className="group mt-auto min-w-xs flex w-full flex-nowrap items-center justify-center gap-2 rounded-lg border border-[#5C5CF9] bg-[#5C5CF9] py-3.5 font-medium text-white shadow-xs transition-all duration-200 hover:bg-[#4A4AF0] hover:shadow-md disabled:cursor-not-allowed disabled:opacity-70 dark:border-[#5C5CF9] dark:bg-[#5C5CF9] dark:hover:bg-[#4A4AF0]"
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

	// Full card rendering
	return (
		<div>
			{/* Header Section */}
			<div className="mb-8">
				<h3 className="text-3xl md:text-4xl font-bold text-white mb-3">
					Enterprise
				</h3>
				<p className="text-[#8a8c90] text-sm leading-relaxed">
					For organizations demanding the highest level of data access, customization, and dedicated support
				</p>
			</div>

			{/* Features List - Two Columns */}
			<div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3 mb-8">
				<div className="flex items-start gap-3">
					<div className="flex-shrink-0 w-1.5 h-1.5 rounded-full bg-[#5C5CF9] mt-1.5" />
					<span className="text-sm text-white">All features included in Pro and API tiers</span>
				</div>
				<div className="flex items-start gap-3">
					<div className="flex-shrink-0 w-1.5 h-1.5 rounded-full bg-[#5C5CF9] mt-1.5" />
					<span className="text-sm text-white">Hourly data</span>
				</div>
				<div className="flex items-start gap-3">
					<div className="flex-shrink-0 w-1.5 h-1.5 rounded-full bg-[#5C5CF9] mt-1.5" />
					<span className="text-sm text-white">Direct raw access to our database</span>
				</div>
				<div className="flex items-start gap-3">
					<div className="flex-shrink-0 w-1.5 h-1.5 rounded-full bg-[#5C5CF9] mt-1.5" />
					<span className="text-sm text-white">Access to non-public data, such as TVL breakdowns by token address</span>
				</div>
				<div className="flex items-start gap-3">
					<div className="flex-shrink-0 w-1.5 h-1.5 rounded-full bg-[#5C5CF9] mt-1.5" />
					<span className="text-sm text-white">Custom bespoke solutions that fit your needs</span>
				</div>
				<div className="flex items-start gap-3">
					<div className="flex-shrink-0 w-1.5 h-1.5 rounded-full bg-[#5C5CF9] mt-1.5" />
					<span className="text-sm text-white">Custom data licensing agreements</span>
				</div>
			</div>

			{/* Pricing Section */}
			<div className="flex flex-col max-sm:items-stretch max-sm:gap-4 lg:flex-row lg:items-center lg:justify-between lg:gap-6 pt-6 border-t border-[#5C5CF9]/10">
				<div>
					<div className="text-xs text-[#8a8c90] uppercase tracking-wide font-semibold mb-1">Custom Pricing</div>
					<div className="text-2xl font-bold text-white">Talk to us</div>
				</div>
				<div className="flex-shrink-0 max-sm:w-full">
					<a
						className="group min-w-xs flex w-full flex-nowrap items-center justify-center gap-2 rounded-lg border border-[#5C5CF9] bg-[#5C5CF9] py-3.5 font-medium text-white shadow-xs transition-all duration-200 hover:bg-[#4A4AF0] hover:shadow-md disabled:cursor-not-allowed disabled:opacity-70"
						target="_blank"
						rel="noopener noreferrer"
						href="mailto:sales@defillama.com"
					>
						<Icon name="mail" height={16} width={16} />
						Contact Us
					</a>
				</div>
			</div>
		</div>
	)
}
