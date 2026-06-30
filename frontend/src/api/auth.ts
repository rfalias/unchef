import axios from "axios";

interface LoginResponse {
  access_token: string;
  token_type: string;
}

interface User {
  id: number;
  email: string;
  role: string;
  has_claude_key: boolean;
  is_active: boolean;
  is_superuser: boolean;
}

const LOCAL_SUFFIX = "@users.unchef";

const toEmail = (username: string) =>
  username.includes("@") ? username : `${username}${LOCAL_SUFFIX}`;

export const usernameFromEmail = (email: string) =>
  email.endsWith(LOCAL_SUFFIX) ? email.slice(0, -LOCAL_SUFFIX.length) : email;

export const login = async (username: string, password: string): Promise<LoginResponse> => {
  const params = new URLSearchParams();
  params.append("username", toEmail(username));
  params.append("password", password);
  const { data } = await axios.post("/api/v1/auth/jwt/login", params, {
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
  });
  return data;
};

export const register = async (username: string, password: string): Promise<User> => {
  const { data } = await axios.post("/api/v1/auth/register", {
    email: toEmail(username),
    password,
  });
  return data;
};

export const getMe = async (token: string): Promise<User> => {
  const { data } = await axios.get("/api/v1/users/me", {
    headers: { Authorization: `Bearer ${token}` },
  });
  return data;
};

export const logout = async (): Promise<void> => {
  const token = localStorage.getItem("token");
  if (token) {
    await axios.post("/api/v1/auth/jwt/logout", {}, {
      headers: { Authorization: `Bearer ${token}` },
    }).catch(() => {});
  }
};
