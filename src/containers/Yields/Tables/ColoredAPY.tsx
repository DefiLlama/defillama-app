export const ColoredAPY = ({ children, ...props }) => {
	return (
		<span
			{...props}
			className="font-(--weight) data-[variant=borrow]:text-[#e59421] data-[variant=positive]:text-[#30c338] data-[variant=supply]:text-[#4f8fea]"
		>
			{children}
		</span>
	)
}
