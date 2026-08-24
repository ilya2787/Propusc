export interface TListPrint {
	Id: string
	Number_Tabs: string
	LastName: string
	FirstName: string
	Patronymic: string
	NewDate: string
	Organization: string
	Post: string
	FilePhoto: string
	PhotoBrightness?: number
	PhotoContrast?: number
	QrKey: string
	TemplateId?: string
	CustomFields?: Record<string, string>
}
export interface TDirector {
	Name: string
	Post: string
}
