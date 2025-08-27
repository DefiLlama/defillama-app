import Image from 'next/image'
import lostLlama from '~/assets/404.png'
import { BasicLink } from '~/components/Link'
import Layout from '~/layout'

export default function HomePage() {
	return (
		<Layout title="DefiLlama - Page not found">
			<div className="isolate flex flex-1 flex-col items-center justify-center rounded-md border border-(--cards-border) bg-(--cards-bg) p-4">
				<Image src={lostLlama} width={350} height={350} alt="Want a ride?" />
				<p className="text-base font-medium">
					This page doesn&apos;t exist. Check out{' '}
					<BasicLink href="/metrics" className="underline">
						other dashboards
					</BasicLink>
					.
				</p>
			</div>
		</Layout>
	)
}
