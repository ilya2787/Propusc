import axios from 'axios'
import {
	createContext,
	useContext,
	useEffect,
	useRef,
	useState,
	type Dispatch,
	type SetStateAction,
} from 'react'
import { useReactToPrint } from 'react-to-print'
import { AppContext } from '../../App'
import { deleteUploadedImage } from '../../api/images'
import { recordPassEvent } from '../../api/audit'
import { A4Sheet } from '../../components/A4Sheet/A4Sheet'
import { ICON } from '../../components/icon/Icon'
import ModalWindows from '../../components/ModalWindows/ModalWindows'
import {
	DeleteCard,
	DeleteListCardNatification,
	warningListPrint,
} from '../../components/natificationMesseg/natificationMessag'
import type { IOption } from '../../components/SelectItem/TypeSelect'
import type { TDirector, TListPrint } from '../../components/type/Type'
import CardPass from './CardPass'
import CardPassVip from './CardPassVip'
import './CardStyle.scss'
import { fetchTemplates, loadTemplates, TEMPLATE_CHANGE_EVENT, type PassTemplate } from '../../model/templates'
import { getA4PrintLayout } from '../../components/LayoutCard/cardDimensions'
import { apiUrl } from '../../api/server'

type TypeContext = {
	CurrentSingleOrganization: string
	setCurrentSingleOrganization: Dispatch<SetStateAction<string>>
	CurrentSinglePost: string
	setCurrentSinglePost: Dispatch<SetStateAction<string>>
	Number_Tabs: string
	setNumber_Tabs: Dispatch<SetStateAction<string>>
	LastName: string
	setLastName: Dispatch<SetStateAction<string>>
	FirstName: string
	setFirstName: Dispatch<SetStateAction<string>>
	Patronymic: string
	setPatronymic: Dispatch<SetStateAction<string>>
	NewDate: string
	setNewDate: Dispatch<SetStateAction<string>>
	FilePhoto: string
	setFilePhoto: Dispatch<SetStateAction<string>>
	FilePhotoName: string
	setFilePhotoName: Dispatch<SetStateAction<string>>
	QrKey: string
	setQrKey: Dispatch<SetStateAction<string>>
	ListPrint: TListPrint[]
	setListPrint: Dispatch<SetStateAction<TListPrint[]>>
	Organization: string
	Post: string
	CleaningForm: (preserveUploadedPhoto?: boolean) => void
	ListOrganization: IOption[]
	setListOrganization: Dispatch<SetStateAction<IOption[]>>
	ListPost: IOption[]
	setListPost: Dispatch<SetStateAction<IOption[]>>
	FocusOrganization: boolean
	setFocusOrganization: Dispatch<SetStateAction<boolean>>
	FocusPost: boolean
	setFocusPost: Dispatch<SetStateAction<boolean>>
	PostDirector: string
	setPostDirector: Dispatch<SetStateAction<string>>
	NameDirector: string
	setNameDirector: Dispatch<SetStateAction<string>>
	SelectedTemplate: PassTemplate
	EditingPrintId: string | null
	setEditingPrintId: Dispatch<SetStateAction<string | null>>
	CustomFields: Record<string, string>
	setCustomFields: Dispatch<SetStateAction<Record<string, string>>>
}
// eslint-disable-next-line react-refresh/only-export-components
export const Context = createContext<TypeContext>({
	CurrentSingleOrganization: '',
	setCurrentSingleOrganization: () => {},
	CurrentSinglePost: '',
	setCurrentSinglePost: () => {},
	Number_Tabs: '0',
	setNumber_Tabs: () => {},
	LastName: '',
	setLastName: () => {},
	FirstName: '',
	setFirstName: () => {},
	Patronymic: '',
	setPatronymic: () => {},
	NewDate: '',
	setNewDate: () => {},
	FilePhoto: '',
	setFilePhoto: () => {},
	FilePhotoName: '',
	setFilePhotoName: () => {},
	QrKey: '',
	setQrKey: () => {},
	ListPrint: [],
	setListPrint: () => {},
	Organization: '',
	Post: '',
	CleaningForm: () => {},
	ListOrganization: [],
	setListOrganization: () => [],
	ListPost: [],
	setListPost: () => [],
	FocusOrganization: false,
	setFocusOrganization: () => {},
	FocusPost: false,
	setFocusPost: () => {},
	PostDirector: '',
	setPostDirector: () => {},
	NameDirector: '',
	setNameDirector: () => {},
	SelectedTemplate: loadTemplates()[0],
	EditingPrintId: null,
	setEditingPrintId: () => {},
	CustomFields: {},
	setCustomFields: () => {},
})

const PRINT_QUEUE_KEY = 'propusk-print-queue-v1'
const loadPrintQueue = (): TListPrint[] => {
	try {
		const value = JSON.parse(localStorage.getItem(PRINT_QUEUE_KEY) ?? '[]')
		return Array.isArray(value)
			? value.map(item => ({ ...item, Number_Tabs: String(item.Number_Tabs ?? '') }))
			: []
	} catch {
		return []
	}
}

const CardAll = () => {
	const ContextMain = useContext(AppContext)
	const theme = ContextMain.theme

	const [OpenModal, setOpenModal] = useState<boolean>(false)
	const [PrintDialogClosed, setPrintDialogClosed] = useState<boolean>(false)
	const [Templates, setTemplates] = useState(loadTemplates)
	const [SelectedTemplate, setSelectedTemplate] = useState(Templates[0])
	const printRef = useRef<HTMLDivElement>(null)

	useEffect(() => {
		const refresh = () => setTemplates(loadTemplates())
		window.addEventListener(TEMPLATE_CHANGE_EVENT, refresh)
		void fetchTemplates().then(items => {
			setTemplates(items)
			setSelectedTemplate(current => items.find(item => item.id === current.id) ?? items[0])
		})
		return () => window.removeEventListener(TEMPLATE_CHANGE_EVENT, refresh)
	}, [])

	//Данные на пропуск
	const [CurrentSingleOrganization, setCurrentSingleOrganization] =
		useState<string>('')
	const [CurrentSinglePost, setCurrentSinglePost] = useState<string>('')
	const [Number_Tabs, setNumber_Tabs] = useState<string>('0')
	const [LastName, setLastName] = useState<string>('')
	const [FirstName, setFirstName] = useState<string>('')
	const [Patronymic, setPatronymic] = useState<string>('')
	const [NewDate, setNewDate] = useState<string>('')
	const [FilePhoto, setFilePhoto] = useState<string>('')
	const [FilePhotoName, setFilePhotoName] = useState<string>('')
	const [QrKey, setQrKey] = useState<string>('')
	const [CustomFields, setCustomFields] = useState<Record<string, string>>({})
	////////////

	//Фокус объектов
	const [FocusOrganization, setFocusOrganization] = useState<boolean>(false)
	const [FocusPost, setFocusPost] = useState<boolean>(false)

	////////////

	const [ListOrganization, setListOrganization] = useState<IOption[]>([])
	const [ListPost, setListPost] = useState<IOption[]>([])
	const Organization =
		ListOrganization.find(data => data.value === CurrentSingleOrganization)?.label ?? ''
	const Post = ListPost.find(data => data.value === CurrentSinglePost)?.label ?? ''

	const ListBDOrganization = async () => {
		await axios
			.get<IOption[]>(apiUrl('/AllListOrganization'))
			.then(res => setListOrganization(res.data))
			.catch(err => console.log(err))
	}
	useEffect(() => {
		ListBDOrganization()
	}, [setListOrganization])

	const ListBDPost = async () => {
		await axios
			.get<IOption[]>(apiUrl('/AllListPost'))
			.then(res => setListPost(res.data))
			.catch(err => console.log(err))
	}
	useEffect(() => {
		ListBDPost()
	}, [setListPost])

	//Общий список на печать
	const [ListPrint, setListPrint] = useState<TListPrint[]>(loadPrintQueue)
	const [EditingPrintId, setEditingPrintId] = useState<string | null>(null)
	useEffect(() => localStorage.setItem(PRINT_QUEUE_KEY, JSON.stringify(ListPrint)), [ListPrint])
	const ActivePrintVip = SelectedTemplate.kind === 'certificate'
	const printLayout = getA4PrintLayout(SelectedTemplate, SelectedTemplate.kind)
	const NumberObjectPage = printLayout.cardsPerPage
	const templateIconKey = (template: PassTemplate) => {
		if (template.design.icon) return template.design.icon
		if (/авто|транспорт|машин/i.test(`${template.name} ${template.description}`)) return 'vehicle'
		return template.kind === 'certificate' ? 'double' : 'single'
	}
	const templateIcon = (template: PassTemplate) => {
		const icon = templateIconKey(template)
		if (icon === 'vehicle') return ICON.CarPass
		if (icon === 'double') return ICON.CardPassDouble
		return ICON.CardPass
	}
	const queueColumns = [
		{
			key: 'number',
			label: 'Таб. №',
			value: (item: TListPrint) => item.Number_Tabs ? String(item.Number_Tabs) : '',
		},
		{
			key: 'name',
			label: 'ФИО',
			value: (item: TListPrint) => [item.LastName, item.FirstName, item.Patronymic].filter(Boolean).join(' '),
		},
		{ key: 'post', label: 'Должность', value: (item: TListPrint) => String(item.Post ?? '').trim() },
		{ key: 'organization', label: 'Организация', value: (item: TListPrint) => String(item.Organization ?? '').trim() },
		{ key: 'date', label: 'Дата', value: (item: TListPrint) => String(item.NewDate ?? '').trim() },
	].filter(column => ListPrint.some(item => column.value(item) !== ''))
	const customQueueColumns = Templates.flatMap(template => template.design.customTexts ?? [])
		.filter(field => field.contentType === 'field')
		.filter((field, index, fields) => fields.findIndex(item => item.id === field.id) === index)
		.filter(field => ListPrint.some(item => String(item.CustomFields?.[field.id] ?? '').trim() !== ''))
		.map(field => ({
			key: `custom-${field.id}`,
			label: field.fieldLabel?.trim() || 'Доп. поле',
			value: (item: TListPrint) => String(item.CustomFields?.[field.id] ?? '').trim(),
		}))
	const visibleQueueColumns = [...queueColumns, ...customQueueColumns]

	//Удаление строки
	const deleteLineCard = (Id: string) => {
		const deletedItems = ListPrint.filter(item => item.Id === Id)
		void Promise.allSettled(deletedItems.map(item => deleteUploadedImage(item.FilePhoto)))
		setListPrint(items => items.filter(item => item.Id !== Id))
		DeleteCard()
	}

	const DeleteListCard = () => {
		if (ListPrint.length > 0) {
			void Promise.allSettled([...new Set(ListPrint.map(item => item.FilePhoto))].map(deleteUploadedImage))
			setListPrint([])
			DeleteListCardNatification()
		}
	}

	const CleaningForm = (preserveUploadedPhoto = false) => {
		if (!preserveUploadedPhoto) void deleteUploadedImage(FilePhoto)
		setCurrentSingleOrganization('')
		setCurrentSinglePost('')
		setLastName('')
		setFirstName('')
		setPatronymic('')
		setNewDate('')
		setNumber_Tabs('0')
		setFilePhoto('')
		setFilePhotoName('')
		setQrKey('')
		setCustomFields({})
		setEditingPrintId(null)
	}

	const editPrintItem = (item: TListPrint) => {
		setNumber_Tabs(item.Number_Tabs)
		setLastName(item.LastName)
		setFirstName(item.FirstName)
		setPatronymic(item.Patronymic)
		setNewDate(/^\d{4}-\d{2}-\d{2}$/.test(item.NewDate) ? item.NewDate : '')
		setCurrentSingleOrganization(ListOrganization.find(option => option.label === item.Organization)?.value ?? '')
		setCurrentSinglePost(ListPost.find(option => option.label === item.Post)?.value ?? '')
		setFilePhoto(item.FilePhoto)
		setFilePhotoName(item.FilePhoto ? 'Текущая фотография' : '')
		setQrKey(item.QrKey)
		setCustomFields(item.CustomFields ?? {})
		setEditingPrintId(item.Id)
		window.scrollTo({ top: 300, behavior: 'smooth' })
	}

	// Печать
	const handlePrint = useReactToPrint({
		content: () => printRef.current,
		onAfterPrint: () => {
			void recordPassEvent('pass.printed', SelectedTemplate.id, ListPrint.length)
			setPrintDialogClosed(true)
		},
	})
	const finishPrintAndCleanup = async () => {
		await Promise.allSettled([...new Set(ListPrint.map(item => item.FilePhoto))].map(deleteUploadedImage))
		setListPrint([])
		setPrintDialogClosed(false)
		setOpenModal(false)
		DeleteListCardNatification()
	}

	//Выгрузка руководителя
	const [PostDirector, setPostDirector] = useState<string>('')
	const [NameDirector, setNameDirector] = useState<string>('')

	useEffect(() => {
		axios
			.get<TDirector[]>(apiUrl('/Director'))
			.then(res => {
				setNameDirector(res.data[0].Name)
				setPostDirector(res.data[0].Post)
			})
	}, [setNameDirector, setPostDirector])

	return (
		<Context.Provider
			value={{
				CurrentSingleOrganization,
				setCurrentSingleOrganization,
				CurrentSinglePost,
				setCurrentSinglePost,
				Number_Tabs,
				setNumber_Tabs,
				LastName,
				setLastName,
				FirstName,
				setFirstName,
				Patronymic,
				setPatronymic,
				NewDate,
				setNewDate,
				FilePhoto,
				setFilePhoto,
				FilePhotoName,
				setFilePhotoName,
				QrKey,
				setQrKey,
				ListPrint,
				setListPrint,
				Organization,
				Post,
				CleaningForm,
				ListOrganization,
				setListOrganization,
				ListPost,
				setListPost,
				FocusOrganization,
				setFocusOrganization,
				FocusPost,
				setFocusPost,
				PostDirector,
				setPostDirector,
				NameDirector,
				setNameDirector,
				SelectedTemplate,
				EditingPrintId,
				setEditingPrintId,
				CustomFields,
				setCustomFields,
			}}
		>
			<div className={`MainCard ${theme}`}>
				<header className='MainCard__pageHeader'>
					<div>
						<span className='MainCard__eyebrow'>Оформление</span>
						<h1>Новый пропуск</h1>
						<p>Выберите шаблон, заполните данные сотрудника и добавьте готовый пропуск в очередь печати.</p>
					</div>
					<div className='MainCard__queueBadge' aria-label={`В очереди ${ListPrint.length}`}>
						<span>{ICON.Print}</span>
						<div><strong>{ListPrint.length}</strong><small>в очереди</small></div>
					</div>
				</header>
				<div className='MainCard--headerInfo'>
					<div className={`MainCard--headerInfo--TypePassCard ${theme}`}>
						<div className='MainCard__sectionTitle'>
							<span>1</span>
							<div><h2>Выберите шаблон</h2><p>Поля формы подстроятся автоматически</p></div>
						</div>
						<div
							className={`MainCard--headerInfo--TypePassCard--content ${theme}`}
						>
							{Templates.map(template => (
								<button
									type='button'
									key={template.id}
									className={`MainCard--headerInfo--TypePassCard--content--Item ${theme} ${SelectedTemplate.id === template.id ? 'Active' : ''}`}
									onClick={() => {
										setSelectedTemplate(template)
									}}
									aria-pressed={SelectedTemplate.id === template.id}
								>
									<span className={`MainCard__templateIcon MainCard__templateIcon--${templateIconKey(template)}`} aria-hidden='true'>{templateIcon(template)}</span>
									<div className='MainCard--headerInfo--TypePassCard--content--Item--text'>
										<h2>{template.name}</h2><p>{template.description}</p>
									</div>
								</button>
							))}
						</div>
					</div>
				</div>
					<div className='MainCard__workspace'>
					<div className='MainCard__sectionTitle'>
						<span>2</span>
						<div><h2>Заполните данные</h2><p>Изменения сразу отображаются в предпросмотре</p></div>
					</div>
					{SelectedTemplate.kind === 'pass' ? <CardPass /> : <CardPassVip />}
				</div>
				<div className={`MainCard--headerInfo--ListPrintCard ${theme}`}>
					<div className='MainCard__queueHeader'>
						<div className='MainCard__sectionTitle'>
							<span>3</span>
							<div><h2>Очередь печати</h2><p>{ListPrint.length ? `Добавлено: ${ListPrint.length}` : 'Добавленные пропуска появятся здесь'}</p></div>
						</div>
						<div className='MainCard--headerInfo--ListPrintCard--BTN'>
							<button className={`MainCard--headerInfo--ListPrintCard--BTN--Clear ${theme}`} onClick={() => DeleteListCard()} disabled={!ListPrint.length}>
								<span>{ICON.DeleteCard}</span>Очистить
							</button>
							<button className='MainCard--headerInfo--ListPrintCard--BTN--View' onClick={() => ListPrint.length > 0 ? setOpenModal(true) : warningListPrint()}>
								<span>{ICON.Doc}</span>Предпросмотр и печать
							</button>
						</div>
					</div>
						<div
							className={`MainCard--headerInfo--ListPrintCard--tables ${theme}`}
						>
							<table className={`table ${theme}`}>
								<thead>
									<tr>
										{visibleQueueColumns.map(column => <th key={column.key}>{column.label}</th>)}
										<th>Действия</th>
									</tr>
								</thead>
								<tbody>
									{ListPrint.length === 0 && <tr className='MainCard__emptyRow'><td colSpan={Math.max(visibleQueueColumns.length + 1, 1)}>Очередь пока пуста — заполните форму и нажмите «Добавить»</td></tr>}
									{ListPrint.map(data => (
										<tr key={data.Id}>
											{visibleQueueColumns.map(column => <td key={column.key}>
												<div className='MainCard__queueValue'>{column.value(data) || '—'}</div>
											</td>)}
											<td className='DeleteListUserCard'>
												<button type='button' aria-label={`Редактировать пропуск: ${data.LastName} ${data.FirstName}`} onClick={() => editPrintItem(data)}>{ICON.Edit}</button>
												<button
																type='button'
																aria-label={`Удалить пропуск: ${data.LastName} ${data.FirstName}`}
																onClick={() => {
																	deleteLineCard(data.Id)
																}}
															>
																{ICON.DeleteUser}
															</button>
											</td>
										</tr>
									))}
								</tbody>
							</table>
						</div>
				</div>
			</div>
			<ModalWindows
				Title={'Предварительный просмотр'}
				size='xl'
				modalIsOpen={OpenModal}
				onClose={() => setOpenModal(false)}
			>
				<div className='Print'>
					{!printLayout.fits && <div className='Print_SizeWarning' role='alert'>
						Этот шаблон имеет размер {printLayout.itemWidthMm} × {printLayout.itemHeightMm} мм с учётом двух сторон удостоверения и не помещается в печатную область A4. Уменьшите размер шаблона в редакторе.
					</div>}
					<div className='Print--content'>
						<A4Sheet
							ref={printRef}
							ActivePrintVip={ActivePrintVip}
							NumberObject={NumberObjectPage}
						/>
					</div>
					<button type='button' className='Print_BTN' disabled={!printLayout.fits} onClick={() => { setPrintDialogClosed(false); handlePrint() }}>
						<span>{ICON.Print}</span>Печать
					</button>
					{PrintDialogClosed && <div className='PrintConfirm_Backdrop' role='dialog' aria-modal='true' aria-labelledby='photo-cleanup-title'>
						<div className='PrintConfirm'>
							<h2 id='photo-cleanup-title'>Удалить фотографии?</h2>
							<p>Печать завершена. Удалить временные фотографии сотрудников с сервера и очистить список печати?</p>
							<div className='PrintConfirm_Actions'>
								<button type='button' className='PrintConfirm_Keep' onClick={() => setPrintDialogClosed(false)}>Нет, оставить</button>
								<button type='button' className='PrintConfirm_Delete' onClick={finishPrintAndCleanup}>Да, удалить</button>
							</div>
						</div>
					</div>}
				</div>
			</ModalWindows>
		</Context.Provider>
	)
}
export default CardAll
