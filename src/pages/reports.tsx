import Layout from '~/layout'

export default function Protocols() {
	return (
		<Layout
			title={`Reports - DefiLlama`}
			description={`Reports on DefiLlama. DefiLlama is committed to providing accurate data without ads or sponsored content, as well as transparency.`}
			keywords=""
			canonicalUrl={`/reports`}
		>
			<h1 className="text-center font-semibold">Reports</h1>
			<ul className="mx-auto my-6 list-none p-0">
				<li className="text-center text-base font-medium">
					29 December 2022:{' '}
					<a
						href="https://drive.google.com/file/d/1zfJgQEOA4QVKMUyVifBhybhxgkbFRWpG/view"
						target="_blank"
						rel="noopener noreferrer"
						className="underline"
					>
						2022 EOY Report
					</a>
				</li>
			</ul>
		</Layout>
	)
}
