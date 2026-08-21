import { useContext, useEffect, useRef, useState, type FC } from 'react'
import { AppContext } from '../../App'
import { formatDate } from '../../components/FormatDate/FormatDate'
import FrontForm from '../../components/FrontForm/FrontForm'
import { ICON } from '../../components/icon/Icon'
import LayoutCardPassVip from '../../components/LayoutCard/LayoutCardPassVip'
import { Context } from './CardAll'

const CardPassVip: FC = () => {
	const MainContext = useContext(AppContext)
	const theme = MainContext.theme

	const AllContext = useContext(Context)
	const LastName = AllContext.LastName
	const FirstName = AllContext.FirstName
	const Patronymic = AllContext.Patronymic
	const NewDate = AllContext.NewDate
	const Number_Tabs = AllContext.Number_Tabs
	const FilePhoto = AllContext.FilePhoto
	const QrKey = AllContext.QrKey
	const Organization = AllContext.Organization
	const Post = AllContext.Post
	const setFocusOrganization = AllContext.setFocusOrganization
	const setFocusPost = AllContext.setFocusPost
	const SelectedTemplate = AllContext.SelectedTemplate
	const CustomFields = AllContext.CustomFields
	const [isBackVisible, setIsBackVisible] = useState(false)
	const previewRef = useRef<HTMLDivElement>(null)
	const [previewMaxWidth, setPreviewMaxWidth] = useState(514)
	const backVisible = isBackVisible

	useEffect(() => {
		const container = previewRef.current
		if (!container) return
		const updatePreviewWidth = () => setPreviewMaxWidth(Math.min(514, Math.max(240, container.clientWidth - 32)))
		updatePreviewWidth()
		const observer = new ResizeObserver(updatePreviewWidth)
		observer.observe(container)
		return () => observer.disconnect()
	}, [])

	const rotationCard = () => {
		setIsBackVisible(value => !value)
		setFocusOrganization(false)
		setFocusPost(false)
	}

	return (
		<div className={`MainCard--content ${theme}`}>
				<h1>Двухсторонний пропуск</h1>
			<div className={`MainCard--content--Info ${theme}`}>
				<FrontForm />
				<div className={`MainCard--content--Info--Preview ${theme}`}>
					<h2>Предпросмотр</h2>
					<div ref={previewRef} className='MainCard--content--Info--Preview--content'>
						<LayoutCardPassVip
							Number_Tabs={Number_Tabs}
							CurrentSingleOrganization={Organization}
							CurrentSinglePost={Post}
							LastName={LastName}
							FirstName={FirstName}
							Patronymic={Patronymic}
							NewDate={NewDate ? formatDate(NewDate, SelectedTemplate.design.dateFormat) : ''}
							FilePhoto={FilePhoto}
							QrKey={QrKey}
							CustomFields={CustomFields}
							Print={false}
							template={SelectedTemplate}
							previewMaxWidth={previewMaxWidth}
							previewMaxHeight={363}
							flipped={backVisible}
						/>
					</div>
					<button
						className='MainCard--content--Info--Preview--BTNRev'
						onClick={() => rotationCard()}
						aria-pressed={backVisible}
						aria-label={backVisible ? 'Показать лицевую сторону удостоверения' : 'Показать оборотную сторону удостоверения'}
					>
						<span>{ICON.Revers}</span>
						<p>{backVisible ? 'Лицевая сторона' : 'Оборотная сторона'}</p>
					</button>
				</div>
			</div>
		</div>
	)
}

export default CardPassVip
