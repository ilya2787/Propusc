export interface TListPrint {
	Id: string
	Number_Tabs: number
	LastName: string
	FirstName: string
	Patronymic: string
	NewDate: string
	Organization: string
	Post: string
	FilePhoto: string
	QrKey: string
	TemplateId?: string
	CustomFields?: Record<string, string>
}
export interface TDirector {
	Name: string
	Post: string
}
