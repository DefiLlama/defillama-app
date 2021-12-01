function MenuSvg(stroke = '#000') {
  return (
    <svg width={24} height={24} fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M12 13a1 1 0 100-2 1 1 0 000 2zM19 13a1 1 0 100-2 1 1 0 000 2zM5 13a1 1 0 100-2 1 1 0 000 2z"
        stroke={stroke}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export default MenuSvg
