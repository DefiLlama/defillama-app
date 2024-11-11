import Layout from '~/layout'

export default function Protocols() {
	return (
		<Layout title={`Reports - DefiLlama`} defaultSEO>
			<h1 className="text-center font-semibold">Reports</h1>
			<ul className="list-none my-6 mx-auto p-0">
				<li className="text-base font-medium text-center">
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
