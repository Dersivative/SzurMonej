export interface UserResponseDTO {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  fullName: string;
  admin: boolean;
  balance?: number;
  accountNumber?: string;
  bankAccountNumber?: string;
}

export interface LoginRequestDTO {
  email: string;
  password: string;
}
