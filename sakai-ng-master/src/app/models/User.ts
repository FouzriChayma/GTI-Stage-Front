export interface User {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  phoneNumber: string;
  role: string; // Maps to UserRole enum (e.g., 'ADMINISTRATOR', 'CLIENT', 'CHARGE_CLIENTELE')
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  profilePhotoPath?: string;
  token?: string;
  refreshToken?: string;
  password?: string; // Optional for request payloads
}