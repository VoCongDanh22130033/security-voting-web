export interface User {
  id: number;
  fullName: string;
  email: string;
  roles: string[];
  image_url?: string;
  citizenId?: string;
  phone?: string;
}

export interface LoginResponse {
  token: string;
  id: number;
  email: string;
  roles: string[];
  image_url: string;
  fullName: string;
}