export interface SignupInput {
  email: string;
  password: string;
  name: string;
  tenantName: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface JwtPayload {
  userId: string;
  tenantId: string;
  role: string;
}
