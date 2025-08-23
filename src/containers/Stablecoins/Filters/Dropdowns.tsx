import { CSVDownloadButton } from '~/components/ButtonStyled/CsvButton'
import { Attribute } from './Attribute'
import { BackingType } from './BackingType'
import { McapRange } from './McapRange'
import { PegType } from './PegType'
import { ResetAllStablecoinFilters } from './ResetAll'

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
				replaceClassName
				className="ml-auto flex items-center justify-center gap-1 rounded-md border border-(--form-control-border) px-2 py-[6px] text-xs text-(--text-form) hover:bg-(--link-hover-bg) focus-visible:bg-(--link-hover-bg)"
			/>
		</>
	)
}
