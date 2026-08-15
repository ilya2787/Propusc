import { useEffect, useState } from 'react'
import QRCode from 'qrcode'

type QrCodeImageProps = {
	value: string
	darkColor?: string
	lightColor?: string
}

const QrCodeImage = ({ value, darkColor = '#111111', lightColor = '#ffffff' }: QrCodeImageProps) => {
	const [source, setSource] = useState('')

	useEffect(() => {
		let active = true
		QRCode.toDataURL(value, {
			errorCorrectionLevel: 'M',
			margin: 1,
			width: 512,
			color: { dark: darkColor, light: lightColor },
		}).then(result => {
			if (active) setSource(result)
		}).catch(() => {
			if (active) setSource('')
		})
		return () => { active = false }
	}, [darkColor, lightColor, value])

	return source ? <img src={source} alt={`QR-код с ключом ${value}`} /> : null
}

export default QrCodeImage
