import { useRouter } from 'next/router'
import { BasicLink } from '~/components/Link'
import { SubscribeModal } from '~/components/Modal/SubscribeModal'

interface ReturnModalProps {
	isOpen: boolean
	onClose: () => void
	returnUrl: string
}

export function ReturnModal({ isOpen, onClose, returnUrl }: ReturnModalProps) {
	const router = useRouter()

	const handleStayOnPage = () => {
		const { returnUrl, ...restQuery } = router.query
		router.replace(
			{
				pathname: router.pathname,
				query: restQuery
			},
			undefined,
			{ shallow: true }
		)
		onClose()
	}
	return (
		<SubscribeModal isOpen={isOpen} onClose={onClose}>
			<div className="p-8 max-w-[400px]">
				<h2 className="text-2xl font-bold mb-4 text-center">Welcome Back!</h2>
				<p className="text-gray-400 mb-6 text-center">
					Would you like to return to the page you were on before signing in?
				</p>
				<div className="flex flex-col gap-3">
					<BasicLink
						href={returnUrl}
						className="w-full px-4 py-3 bg-[#5C5CF9] hover:bg-[#4A4AF0] text-white rounded-lg transition-colors text-center font-medium"
					>
						Yes, take me back
					</BasicLink>
					<button
						onClick={handleStayOnPage}
						className="w-full px-4 py-3 bg-[#22242930] hover:bg-[#39393E] text-white rounded-lg transition-colors font-medium"
					>
						Stay on this page
					</button>
				</div>
			</div>
		</SubscribeModal>
	)
}
