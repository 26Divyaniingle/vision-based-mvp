import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL } from '../constants/theme';

export interface AuthTokens {
    access_token: string;
    token_type: string;
}

export interface User {
    id: number;
    username: string;
    email: string;
}

// Login
export async function loginUser(username: string, password: string): Promise<AuthTokens> {
    const form = new URLSearchParams();
    form.append('username', username);
    form.append('password', password);

    const res = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: form.toString(),
    });
    if (!res.ok) throw new Error('Invalid credentials. Please try again.');
    const data = await res.json();
    await AsyncStorage.setItem('access_token', data.access_token);
    return data;
}

// Register
export async function registerUser(username: string, email: string, password: string): Promise<any> {
    const res = await fetch(`${API_BASE_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, email, password }),
    });
    if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || 'Registration failed.');
    }
    return res.json();
}

// Get saved token
export async function getToken(): Promise<string | null> {
    return AsyncStorage.getItem('access_token');
}

// Logout
export async function logout(): Promise<void> {
    await AsyncStorage.removeItem('access_token');
}
