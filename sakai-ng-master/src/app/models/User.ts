export interface User {
  id: number
  email: string
  password?: string
  firstName: string
  lastName: string
  phoneNumber: string
  role: string
  isActive: boolean
  createdAt: string
  updatedAt: string
  profilePhotoPath?: string
}
