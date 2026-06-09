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
import { Context } from '../../Page/Card/CardAll'
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

	const RefOrganization = useRef(null)
	const RefPost = useRef<HTMLDivElement>(null)

	const ActivePhotoFile = useRef<HTMLDivElement>(null)

	const AddListPrint = () => {
		if (
			Number_Tabs !== 0 &&
			LastName !== '' &&
			FirstName !== '' &&
			NewDate !== '' &&
			Organization !== '' &&
			Post !== '' &&
			FilePhoto !== ''
		) {
			const value = {
				Number_Tabs: Number_Tabs,
				LastName: LastName,
				FirstName: FirstName,
				Patronymic: Patronymic,
				NewDate: formatDate(NewDate),
				Organization: Organization,
				Post: Post,
				FilePhoto: FilePhoto,
			}
			setListPrint(ListPrint => [...ListPrint, value])
			CleaningForm()
			AddCardPrint()
		} else {
			ErrorAddCard()
		}
	}

	useEffect(() => {
		FilePhoto
			? ActivePhotoFile.current?.classList.add('Active')
			: ActivePhotoFile.current?.classList.remove('Active')
	}, [FilePhoto])

	//Фокус на объекты
	const FocusO = (ev: FocusEvent<any>) => {
		setFocusOrganization(ev.nativeEvent.bubbles)
	}
	const FocusP = (ev: FocusEvent<any>) => {
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
				.then(res => {
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
				.then(res => {
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

	const UpdateDirector = () => {
		if (NewNameDirector !== NameDirector || NewPostDirector !== PostDirector) {
			const value = { Name: NewNameDirector, Post: NewPostDirector, id: 1 }
			axios
				.post(`${import.meta.env.VITE_APP_SERVER}/DirectorUpdate`, value)
				.then(res => {
					setPostDirector(NewPostDirector)
					setNameDirector(NewNameDirector)
					UpdateDirectorNatif()
				})
				.catch(err => console.log(err))
		}
	}

	return (
		<div className='FormFront' id={theme}>
			<h2>Данные пропуска</h2>
			<button
				onClick={() => setOpenModalSetting(true)}
				className='FormFront--Setting'
				id={theme}
			>
				{ICON.Setting}
			</button>
			<div className='FormFront--Number' id={theme}>
				<h3>Номер пропуска</h3>
				<input
					type='number'
					name=''
					id=''
					value={Number_Tabs}
					onChange={e => setNumber_Tabs(Number(e.target.value))}
					onFocus={FocusN}
				/>
			</div>

			<div
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
			</div>

			<div
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
			</div>
			<div className='FormFront--Name'>
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
			</div>
			<div className='FormFront--DateAndPhoto'>
				<div className='FormFront--DateAndPhoto--Date' id={theme}>
					<h3>Дата изготовления</h3>
					<input
						type='date'
						name='	'
						id=''
						value={NewDate}
						onChange={e => {
							setNewDate(e.target.value)
						}}
						onFocus={FocusD}
					/>
				</div>
				<div className='FormFront--DateAndPhoto--Photo' ref={ActivePhotoFile}>
					<input
						type='file'
						name=''
						id=''
						onChange={e => {
							setFilePhoto(e.target.files[0].name)
						}}
						onFocus={FocusPhotoF}
					/>
					<span>{ICON.Upload}</span>
					<p>{FilePhoto ? FilePhoto : 'Выберите фотографию'}</p>
				</div>
			</div>
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
				modalIsOpen={OpenModalOrganization}
				onClose={() => setOpenModalOrganization(false)}
			>
				<div className='ModalAddList'>
					<h3>Организация:</h3>
					<input
						type='text'
						value={AddTextOrganization}
						onChange={e => setAddTextOrganization(e.target.value)}
						placeholder='Введите название организации...'
					/>
					<button onClick={() => AddListBDOrganization()}>Добавить</button>
				</div>
			</ModalWindows>
			<ModalWindows
				Title={'Добавление новой должности'}
				modalIsOpen={OpenModalPost}
				onClose={() => setOpenModalPost(false)}
			>
				<div className='ModalAddList'>
					<h3>Должность:</h3>
					<input
						type='text'
						value={AddTextPost}
						onChange={e => setAddTextPost(e.target.value)}
						placeholder='Введите должность...'
					/>
					<button onClick={() => AddListBDPost()}>Добавить</button>
				</div>
			</ModalWindows>
			<ModalWindows
				Title={'Изменение данных'}
				modalIsOpen={OpenModalSetting}
				onClose={() => setOpenModalSetting(false)}
			>
				<div className='ModalAddList'>
					<h3>Руководитель:</h3>
					<p>
						<b>Должность</b>
					</p>
					<input
						type='text'
						value={NewPostDirector}
						onChange={e => setNewPostDirector(e.target.value)}
						placeholder='Введите должность...'
					/>
					<p>
						<b>Фамилия и инициалы</b>
					</p>
					<input
						type='text'
						placeholder='ФИО'
						value={NewNameDirector}
						onChange={e => setNewNameDirector(e.target.value)}
					/>
					<button onClick={() => UpdateDirector()}>Обновить</button>
				</div>
			</ModalWindows>
		</div>
	)
}

export default FrontForm
