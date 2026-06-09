export const formatDate = (date: string) => {
	let DateFormat = new Date(date).toLocaleDateString()
	return DateFormat
}
