import { User } from './User';
import { Document } from './document';

export interface Appointment {
  idAppointment?: number;
  user: User;
  appointmentDateTime: string;
  durationMinutes: number;
  status: string;
  notes?: string;
  isNotified?: boolean;
  createdAt?: string;
  updatedAt?: string;
  documents?: Document[];
}