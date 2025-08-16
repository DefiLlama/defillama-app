import { Attribute } from './Attribute'
import { BackingType } from './BackingType'
import { PegType } from './PegType'
import { McapRange } from './McapRange'
import { ResetAllStablecoinFilters } from './ResetAll'
import { CSVDownloadButton } from '~/components/ButtonStyled/CsvButton'

export function PeggedFiltersDropdowns({
	pathname,
	nestedMenu,
	downloadCsv
}: {
	pathname: string
	nestedMenu?: boolean
	downloadCsv: () => void
}) {
	return (
		<>
			<Attribute pathname={pathname} nestedMenu={nestedMenu} />
			<BackingType pathname={pathname} nestedMenu={nestedMenu} />
			<PegType pathname={pathname} nestedMenu={nestedMenu} />
			<McapRange nestedMenu={nestedMenu} placement="bottom-start" />
			<ResetAllStablecoinFilters pathname={pathname} nestedMenu={nestedMenu} />
			<CSVDownloadButton
				onClick={downloadCsv}
				smol
				className="h-[30px] bg-transparent! border border-(--form-control-border) text-(--text-form)! hover:bg-(--link-hover-bg)! focus-visible:bg-(--link-hover-bg)! ml-auto"
			/>
		</>
	)
}
