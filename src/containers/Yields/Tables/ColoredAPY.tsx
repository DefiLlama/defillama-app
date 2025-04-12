export const ColoredAPY = ({ children, ...props }) => {
	return (
		<span
			{...props}
			className="data-[variant=positive]:text-[#30c338] data-[variant=borrow]:text-[#e59421] data-[variant=supply]:text-[#4f8fea] font-[var(--weight)]"
		>
			{children}
		</span>
	)
}
