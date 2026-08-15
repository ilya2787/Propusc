import axios from 'axios'
import {
	useContext,
	useEffect,
	useRef,
	useState,
	type FC,
	type FocusEvent,
} from 'react'
import { AppContext } from '../../App'
import { deleteUploadedImage, uploadImage } from '../../api/images'
import { Context } from '../../Page/Card/CardAll'
import { DEFAULT_PHOTO_SETTINGS, type TemplateElementKey } from '../../model/templates'
import { formatDate } from '../FormatDate/FormatDate'
import { ICON } from '../icon/Icon'
import ModalWindows from '../ModalWindows/ModalWindows'
import {
	AddCardPrint,
	AddOrganizationBD,
	AddPostBD,
	ErrorAddCard,
	UpdateDirectorNatif,
} from '../natificationMesseg/natificationMessag'
import SelectItem from '../SelectItem/Select'
import { transliterateToLatin } from '../Translit/TranslitFunction'
import DateField from '../DateField/DateField'

const FrontForm: FC = () => {
	const MainContext = useContext(AppContext)
	const theme = MainContext.theme

	const AllContext = useContext(Context)
	const CurrentSingleOrganization = AllContext.CurrentSingleOrganization
	const setCurrentSingleOrganization = AllContext.setCurrentSingleOrganization
	const CurrentSinglePost = AllContext.CurrentSinglePost
	const setCurrentSinglePost = AllContext.setCurrentSinglePost
	const LastName = AllContext.LastName
	const setLastName = AllContext.setLastName
	const FirstName = AllContext.FirstName
	const setFirstName = AllContext.setFirstName
	const Patronymic = AllContext.Patronymic
	const setPatronymic = AllContext.setPatronymic
	const NewDate = AllContext.NewDate
	const setNewDate = AllContext.setNewDate
	const Number_Tabs = AllContext.Number_Tabs
	const setNumber_Tabs = AllContext.setNumber_Tabs
	const FilePhoto = AllContext.FilePhoto
	const setFilePhoto = AllContext.setFilePhoto
	const FilePhotoName = AllContext.FilePhotoName
	const setFilePhotoName = AllContext.setFilePhotoName
	const QrKey = AllContext.QrKey
	const setQrKey = AllContext.setQrKey
	const setListPrint = AllContext.setListPrint
	const CleaningForm = AllContext.CleaningForm
	const Organization = AllContext.Organization
	const setFocusOrganization = AllContext.setFocusOrganization
	const setFocusPost = AllContext.setFocusPost
	const Post = AllContext.Post
	const ListOrganization = AllContext.ListOrganization
	const setListOrganization = AllContext.setListOrganization
	const ListPost = AllContext.ListPost
	const setListPost = AllContext.setListPost
	const PostDirector = AllContext.PostDirector
	const setPostDirector = AllContext.setPostDirector
	const NameDirector = AllContext.NameDirector
	const setNameDirector = AllContext.setNameDirector
	const SelectedTemplate = AllContext.SelectedTemplate
	const hiddenElements = SelectedTemplate.design.hiddenElements ?? []
	const elementKey = (passKey: TemplateElementKey, certificateKey: TemplateElementKey) =>
		SelectedTemplate.kind === 'pass' ? passKey : certificateKey
	const fieldVisible = (passKey: TemplateElementKey, certificateKey: TemplateElementKey) =>
		!hiddenElements.includes(elementKey(passKey, certificateKey))
	const showNumber = fieldVisible('passNumber', 'certificateNumber')
	const showOrganization = fieldVisible('passOrganization', 'certificateOrganization')
	const showPost = fieldVisible('passPost', 'certificatePost')
	const showName = fieldVisible('passName', 'certificateName')
	const showDate = fieldVisible('passDate', 'certificateDate')
	const showPhoto = fieldVisible('passPhoto', 'certificatePhoto')
	const photoElementKey = SelectedTemplate.kind === 'pass' ? 'passPhoto' : 'certificatePhoto'
	const photoSettings = { ...DEFAULT_PHOTO_SETTINGS, ...SelectedTemplate.design.photos?.[photoElementKey] }
	const usesQr = showPhoto && photoSettings.mode === 'qr'
	const showDirectorPost = SelectedTemplate.design.showDirector && fieldVisible('passDirectorPost', 'certificateDirectorPost')
	const showDirectorName = SelectedTemplate.design.showDirector && fieldVisible('passDirectorName', 'certificateDirectorName')

	const RefOrganization = useRef(null)
	const RefPost = useRef<HTMLDivElement>(null)

	const ActivePhotoFile = useRef<HTMLDivElement>(null)
	const selectPhoto = async (file?: File) => {
		if (!file) {
			setFilePhoto('')
			setFilePhotoName('')
			return
		}
		if (!file.type.startsWith('image/')) return
		setFilePhotoName('Загрузка…')
		try {
			await deleteUploadedImage(FilePhoto)
			setFilePhoto('')
			const uploaded = await uploadImage(file, 'photo')
			setFilePhoto(uploaded.url)
			setFilePhotoName(uploaded.name)
		} catch (error) {
			console.error(error)
			setFilePhoto('')
			setFilePhotoName('Ошибка загрузки')
		}
	}

	const AddListPrint = () => {
		if (
			(!showNumber || Number_Tabs !== 0) &&
			(!showName || (LastName !== '' && FirstName !== '')) &&
			(!showDate || NewDate !== '') &&
			(!showOrganization || Organization !== '') &&
			(!showPost || Post !== '') &&
			(!showPhoto || (usesQr ? QrKey.trim() !== '' : FilePhoto !== ''))
		) {
			const value = {
				Id: crypto.randomUUID(),
				Number_Tabs: Number_Tabs,
				LastName: LastName,
				FirstName: FirstName,
				Patronymic: Patronymic,
				NewDate: showDate && NewDate ? formatDate(NewDate) : '',
				Organization: Organization,
				Post: Post,
				FilePhoto: showPhoto && !usesQr ? FilePhoto : '',
				QrKey: usesQr ? QrKey.trim() : '',
			}
			setListPrint(ListPrint => [...ListPrint, value])
			CleaningForm(showPhoto && !usesQr)
			AddCardPrint()
		} else {
			ErrorAddCard()
		}
	}

	useEffect(() => {
		ActivePhotoFile.current?.classList.toggle('Active', Boolean(FilePhoto))
	}, [FilePhoto])

	//Фокус на объекты
	const FocusO = (ev: FocusEvent<HTMLElement>) => {
		setFocusOrganization(ev.nativeEvent.bubbles)
	}
	const FocusP = (ev: FocusEvent<HTMLElement>) => {
		setFocusPost(ev.nativeEvent.bubbles)
	}
	const FocusN = () => {
		setFocusPost(false)
		setFocusOrganization(false)
	}
	const FocusL = () => {
		setFocusPost(false)
		setFocusOrganization(false)
	}
	const FocusF = () => {
		setFocusPost(false)
		setFocusOrganization(false)
	}
	const FocusPat = () => {
		setFocusPost(false)
		setFocusOrganization(false)
	}
	const FocusD = () => {
		setFocusPost(false)
		setFocusOrganization(false)
	}
	const FocusPhotoF = () => {
		setFocusPost(false)
		setFocusOrganization(false)
	}

	const [OpenModalOrganization, setOpenModalOrganization] =
		useState<boolean>(false)

	const [AddTextOrganization, setAddTextOrganization] = useState<string>('')
	const AddListBDOrganization = () => {
		const latinText = transliterateToLatin(AddTextOrganization)
		const value = {
			value: latinText.replace(/\s+/g, ''),
			label: AddTextOrganization,
		}
		if (AddTextOrganization !== '') {
			axios
				.post(`${import.meta.env.VITE_APP_SERVER}/AddOrganization`, value)
				.then(() => {
					setListOrganization(ListOrganization => [...ListOrganization, value])
					setAddTextOrganization('')
					AddOrganizationBD()
				})
				.catch(err => console.log(err))
		}
	}

	const [OpenModalPost, setOpenModalPost] = useState<boolean>(false)

	const [AddTextPost, setAddTextPost] = useState<string>('')
	const AddListBDPost = () => {
		const latinText = transliterateToLatin(AddTextPost)
		const value = {
			value: latinText.replace(/\s+/g, ''),
			label: AddTextPost,
		}
		if (AddTextPost !== '') {
			axios
				.post(`${import.meta.env.VITE_APP_SERVER}/AddPost`, value)
				.then(() => {
					setListPost(ListPost => [...ListPost, value])
					AddPostBD()
					setAddTextPost('')
				})
				.catch(err => console.log(err))
		}
	}

	const [OpenModalSetting, setOpenModalSetting] = useState<boolean>(false)
	const [NewPostDirector, setNewPostDirector] = useState<string>(PostDirector)
	const [NewNameDirector, setNewNameDirector] = useState<string>(NameDirector)
	const [UpdatingDirector, setUpdatingDirector] = useState(false)

	const OpenDirectorSettings = () => {
		setNewPostDirector(PostDirector)
		setNewNameDirector(NameDirector)
		setOpenModalSetting(true)
	}
	const UpdateDirector = async () => {
		if (NewNameDirector === NameDirector && NewPostDirector === PostDirector) {
			setOpenModalSetting(false)
			return
		}
		setUpdatingDirector(true)
		const value = { Name: NewNameDirector, Post: NewPostDirector, id: 1 }
		try {
			await axios.post(`${import.meta.env.VITE_APP_SERVER}/DirectorUpdate`, value)
			setPostDirector(NewPostDirector)
			setNameDirector(NewNameDirector)
			setOpenModalSetting(false)
			UpdateDirectorNatif()
		} catch (err) {
			console.log(err)
		} finally {
			setUpdatingDirector(false)
		}
	}

	return (
		<div className='FormFront' id={theme}>
			<h2>Данные пропуска</h2>
			{(showDirectorPost || showDirectorName) && <button
				type='button'
				onClick={OpenDirectorSettings}
				className='FormFront--DirectorCard'
				id={theme}
				aria-label='Изменить данные руководителя'
			>
				<span className='FormFront--DirectorCard--Icon'>{ICON.Edit}</span>
				<span className='FormFront--DirectorCard--Info'>
					<strong>Руководитель</strong>
					{showDirectorName && <span>{NameDirector || 'ФИО не указано'}</span>}
					{showDirectorPost && <small>{PostDirector || 'Должность не указана'}</small>}
				</span>
				<span className='FormFront--DirectorCard--Action'>Изменить</span>
			</button>}
			{showNumber && <div className='FormFront--Number' id={theme}>
				<h3>Номер пропуска</h3>
				<input
					type='number'
					name=''
					id=''
					value={Number_Tabs}
					onChange={e => setNumber_Tabs(Number(e.target.value))}
					onFocus={FocusN}
				/>
			</div>}

			{showOrganization && <div
				className='FormFront--Organization'
				tabIndex={0}
				ref={RefOrganization}
				onFocus={FocusO}
				id={theme}
			>
				<h3>Организация / Подразделение</h3>
				<div className='FormFront--Organization--Content' id={theme}>
					<SelectItem
						Placeholder='Выберите организацию...'
						option={ListOrganization}
						CurrentSingle={CurrentSingleOrganization}
						setCurrentSingle={setCurrentSingleOrganization}
					/>
					<button
						onClick={() => setOpenModalOrganization(true)}
						className='FormFront--Organization--Content--BTN'
						id={theme}
					>
						{ICON.AddList}
					</button>
				</div>
			</div>}

			{showPost && <div
				className='FormFront--Post'
				tabIndex={0}
				ref={RefPost}
				onFocus={FocusP}
				id={theme}
			>
				<h3>Должность</h3>
				<div className='FormFront--Post--Content' id={theme}>
					<SelectItem
						Placeholder='Выберите должность...'
						option={ListPost}
						CurrentSingle={CurrentSinglePost}
						setCurrentSingle={setCurrentSinglePost}
					/>
					<button
						onClick={() => setOpenModalPost(true)}
						className='FormFront--Post--Content--BTN'
						id={theme}
					>
						{ICON.AddList}
					</button>
				</div>
			</div>}
			{showName && <div className='FormFront--Name'>
				<div className='FormFront--Name--LastName' id={theme}>
					<h3>Фамилия</h3>
					<input
						type='text'
						name='	'
						id=''
						value={LastName}
						onChange={e => setLastName(e.target.value)}
						onFocus={FocusL}
					/>
				</div>
				<div className='FormFront--Name--FirstName' id={theme}>
					<h3>Имя</h3>
					<input
						type='text'
						name='	'
						id=''
						value={FirstName}
						onChange={e => setFirstName(e.target.value)}
						onFocus={FocusF}
					/>
				</div>
				<div className='FormFront--Name--Patronymic' id={theme}>
					<h3>Отчеcтво</h3>
					<input
						type='text'
						name='	'
						id=''
						value={Patronymic}
						onChange={e => setPatronymic(e.target.value)}
						onFocus={FocusPat}
					/>
				</div>
			</div>}
			{(showDate || showPhoto) && <div className='FormFront--DateAndPhoto'>
				{showDate && <div className='FormFront--DateAndPhoto--Date' id={theme}>
					<h3>Дата изготовления</h3>
					<DateField
						value={NewDate}
						onChange={setNewDate}
						onFocus={FocusD}
					/>
				</div>}
				{showPhoto && (usesQr ? <div className='FormFront--DateAndPhoto--Qr' id={theme}>
					<h3>Ключ QR-кода</h3>
					<input type='text' value={QrKey} placeholder='Введите ключ' onChange={e => setQrKey(e.target.value)} onFocus={FocusPhotoF} />
					<small>QR-код обновляется в предпросмотре автоматически</small>
				</div> : <div className='FormFront--DateAndPhoto--Photo' ref={ActivePhotoFile}>
					<input
						type='file'
						name=''
						id=''
						accept='image/png,image/jpeg,image/webp'
						onChange={e => selectPhoto(e.target.files?.[0])}
						onFocus={FocusPhotoF}
					/>
					<span>{ICON.Upload}</span>
					<p>{FilePhotoName || 'Выберите фотографию'}</p>
				</div>)}
			</div>}
			<div className='FormFront--BTN'>
				<button
					className='FormFront--BTN--Delete'
					onClick={() => {
						CleaningForm()
					}}
					id={theme}
				>
					<span>{ICON.DeleteCard}</span>Стереть
				</button>
				<button
					className='FormFront--BTN--Add'
					onClick={() => {
						AddListPrint()
					}}
				>
					<span>{ICON.AddCard}</span> Добавить
				</button>
			</div>
			<ModalWindows
				Title={'Добавление новой организации'}
				size='sm'
				modalIsOpen={OpenModalOrganization}
				onClose={() => setOpenModalOrganization(false)}
			>
				<div className='ModalAddList'>
					<h3>Организация:</h3>
					<textarea
						value={AddTextOrganization}
						onChange={e => setAddTextOrganization(e.target.value)}
						placeholder='Введите название организации...'
						maxLength={95}
						rows={4}
					/>
					<button onClick={() => AddListBDOrganization()}>Добавить</button>
				</div>
			</ModalWindows>
			<ModalWindows
				Title={'Добавление новой должности'}
				size='sm'
				modalIsOpen={OpenModalPost}
				onClose={() => setOpenModalPost(false)}
			>
				<div className='ModalAddList'>
					<h3>Должность:</h3>
					<textarea
						value={AddTextPost}
						onChange={e => setAddTextPost(e.target.value)}
						placeholder='Введите должность...'
						maxLength={255}
						rows={4}
					/>
					<button onClick={() => AddListBDPost()}>Добавить</button>
				</div>
			</ModalWindows>
			<ModalWindows
				Title={'Данные руководителя'}
				size='sm'
				modalIsOpen={OpenModalSetting}
				onClose={() => setOpenModalSetting(false)}
			>
				<div className='ModalAddList DirectorSettings'>
					<p className='DirectorSettings__hint'>Эти данные будут использоваться во всех новых пропусках, созданных с полями руководителя.</p>
					{showDirectorPost && <label>
						<span>Должность руководителя</span>
					<textarea
						value={NewPostDirector}
						onChange={e => setNewPostDirector(e.target.value)}
						placeholder='Введите должность...'
						maxLength={255}
						rows={4}
					/></label>}
					{showDirectorName && <label>
						<span>ФИО руководителя</span>
					<input
						type='text'
						placeholder='ФИО'
						value={NewNameDirector}
						onChange={e => setNewNameDirector(e.target.value)}
					/></label>}
					<div className='DirectorSettings__actions'>
						<button type='button' className='DirectorSettings__cancel' onClick={() => setOpenModalSetting(false)}>Отмена</button>
						<button type='button' className='DirectorSettings__save' onClick={UpdateDirector} disabled={UpdatingDirector}>{UpdatingDirector ? 'Сохранение…' : 'Сохранить изменения'}</button>
					</div>
				</div>
			</ModalWindows>
		</div>
	)
}

export default FrontForm
