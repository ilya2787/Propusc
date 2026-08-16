import { notifications } from '@mantine/notifications'

export const warning = () => {
	notifications.show({
		title: 'Внимание!',
		message: 'Создание шаблонов пока недоступно',
		position: 'top-right',
		autoClose: 5000,
		color: 'orange',
	})
}

export const warningListPrint = () => {
	notifications.show({
		title: 'Внимание!',
		message: 'Список для печати пуст',
		position: 'top-right',
		autoClose: 5000,
		color: 'orange',
	})
}

export const ErrorAddCard = () => {
	notifications.show({
		title: 'Заполните обязательные поля',
		message: 'Заполните все необходимые поля',
		position: 'top-right',
		autoClose: 5000,
		color: 'red',
	})
}

export const AddCardPrint = () => {
	notifications.show({
		title: 'Добавление пропуска',
		message: 'Пропуск успешно добавлен на печать',
		color: 'green',
		position: 'top-right',
		autoClose: 5000,
	})
}

export const DeleteCard = () => {
	notifications.show({
		title: 'Удаление пропуска с печати',
		message: 'Пропуск успешно удалён',
		position: 'top-right',
		autoClose: 5000,
		color: 'red',
	})
}

export const DeleteListCardNatification = () => {
	notifications.show({
		title: 'Очистка списка',
		message: 'Список пропусков очищен',
		position: 'top-right',
		autoClose: 5000,
		color: 'red',
	})
}

export const AddOrganizationBD = () => {
	notifications.show({
		title: 'Добавление записи',
		message: 'Организация успешно добавлена',
		color: 'green',
		position: 'top-right',
		autoClose: 5000,
	})
}

export const AddPostBD = () => {
	notifications.show({
		title: 'Добавление записи',
		message: 'Должность успешно добавлена',
		color: 'green',
		position: 'top-right',
		autoClose: 5000,
	})
}

export const DeleteDirectoryItem = (itemName: 'Организация' | 'Должность') => {
	notifications.show({
		title: 'Удаление записи',
		message: `${itemName} успешно удалена`,
		color: 'green',
		position: 'top-right',
		autoClose: 5000,
	})
}

export const UpdateDirectorNatif = () => {
	notifications.show({
		title: 'Обновление данных',
		message: 'Данные успешно обновлены',
		color: 'green',
		position: 'top-right',
		autoClose: 5000,
	})
}

