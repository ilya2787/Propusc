import { useContext, useEffect, useRef, useState, type FC } from 'react'
import { AppContext } from '../../App'
import { formatDate } from '../../components/FormatDate/FormatDate'
import FrontForm from '../../components/FrontForm/FrontForm'
import LayoutCardPass from '../../components/LayoutCard/LayoutCardPass'
import { Context } from './CardAll'

const CardPass: FC = () => {
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
	const SelectedTemplate = AllContext.SelectedTemplate
	const previewRef = useRef<HTMLDivElement>(null)
	const [previewMaxWidth, setPreviewMaxWidth] = useState(514)

	useEffect(() => {
		const container = previewRef.current
		if (!container) return
		const updatePreviewWidth = () => setPreviewMaxWidth(Math.min(514, Math.max(240, container.clientWidth - 32)))
		updatePreviewWidth()
		const observer = new ResizeObserver(updatePreviewWidth)
		observer.observe(container)
		return () => observer.disconnect()
	}, [])

	return (
		<div className={`MainCard--content ${theme}`}>
			<h1>Пропуск</h1>
			<div className={`MainCard--content--Info ${theme}`}>
				<FrontForm />
				<div className={`MainCard--content--Info--Preview ${theme}`}>
					<h2>Предпросмотр</h2>
					<div ref={previewRef} className='MainCard--content--Info--Preview--content'>
						<LayoutCardPass
							Number_Tabs={Number_Tabs}
							CurrentSingleOrganization={Organization}
							CurrentSinglePost={Post}
							LastName={LastName}
							FirstName={FirstName}
							Patronymic={Patronymic}
							NewDate={NewDate ? formatDate(NewDate) : ''}
							FilePhoto={FilePhoto}
							QrKey={QrKey}
							Print={false}
							template={SelectedTemplate}
							previewMaxWidth={previewMaxWidth}
							previewMaxHeight={363}
						/>
					</div>
				</div>
			</div>
		</div>
	)
}

export default CardPass
