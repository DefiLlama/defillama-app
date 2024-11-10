import Layout from '~/layout'
import Image from 'next/future/image'
import lostLlama from '~/assets/404.png'

export default function HomePage(props) {
	return (
		<Layout title="DefiLlama - Page not found">
			<div className="text-5xl flex flex-col items-center justify-center">
				<Image src={lostLlama} width="350" height="350" alt="Want a ride?" />
				<p>404 - Page not found</p>
			</div>
		</Layout>
	)
}
