import { useContext, type FC } from 'react'
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
	const Organization = AllContext.Organization
	const Post = AllContext.Post
	const setFocusOrganization = AllContext.setFocusOrganization
	const FocusOrganization = AllContext.FocusOrganization
	const FocusPost = AllContext.FocusPost
	const setFocusPost = AllContext.setFocusPost

	const rotationCard = () => {
		if (FocusOrganization || FocusPost) {
			setFocusOrganization(false)
			setFocusPost(false)
		} else {
			setFocusOrganization(true)
			setFocusPost(true)
		}
	}

	return (
		<div className='MainCard--content' id={theme}>
			<h1>Удостоверение</h1>
			<div className='MainCard--content--Info' id={theme}>
				<FrontForm />
				<div className='MainCard--content--Info--Preview' id={theme}>
					<h2>Предпросмотр</h2>
					<div className='MainCard--content--Info--Preview--content'>
						<LayoutCardPassVip
							Number_Tabs={Number_Tabs}
							CurrentSingleOrganization={Organization}
							CurrentSinglePost={Post}
							LastName={LastName}
							FirstName={FirstName}
							Patronymic={Patronymic}
							NewDate={NewDate ? formatDate(NewDate) : ''}
							FilePhoto={FilePhoto}
							Print={false}
						/>
					</div>
					<button
						className='MainCard--content--Info--Preview--BTNRev'
						onClick={() => rotationCard()}
					>
						<span>{ICON.Revers}</span>
						<p>Повернуть</p>
					</button>
				</div>
			</div>
		</div>
	)
}

export default CardPassVip
