import Image from 'next/image'
import lostLlama from '~/assets/404.png'
import Layout from '~/layout'

export default function HomePage() {
	return (
		<Layout title="DefiLlama - Page not found">
			<div className="flex flex-col items-center justify-center text-5xl">
				<Image src={lostLlama} width={350} height={350} alt="Want a ride?" />
				<p>404 - Page not found</p>
			</div>
		</Layout>
	)
}
