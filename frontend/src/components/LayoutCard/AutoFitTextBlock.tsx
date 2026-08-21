import { type CSSProperties, type HTMLAttributes } from 'react'
import { useAutoFitText } from './useAutoFitText'

type AutoFitTextBlockProps = HTMLAttributes<HTMLDivElement> & {
	fontSize: number
	minimumFontSize?: number
	text: string
}

const AutoFitTextBlock = ({
	fontSize,
	minimumFontSize = 8,
	text,
	style,
	...props
}: AutoFitTextBlockProps) => {
	const ref = useAutoFitText('--auto-fit-font-size', fontSize, [text], minimumFontSize, true)

	return <div
		ref={ref}
		style={{
			...style,
			'--auto-fit-font-size': `${fontSize}px`,
			fontSize: 'var(--auto-fit-font-size)',
		} as CSSProperties}
		{...props}
	>{text}</div>
}

export default AutoFitTextBlock
