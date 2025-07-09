// src/app/models/user.model.ts
export interface User {
  id: number;
  email: string;
  password: string; // Add this line
  firstName: string;
  lastName: string;
  phoneNumber: string;
  role: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}