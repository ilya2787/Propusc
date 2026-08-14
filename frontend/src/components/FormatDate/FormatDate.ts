export const formatDate = (date: string) => {
	const DateFormat = new Date(date).toLocaleDateString()
	return DateFormat
}
