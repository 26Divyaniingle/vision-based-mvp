import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Use EXPO_PUBLIC_API_URL from .env file. If not set, fallback to previous IP for development.
const envBaseUrl = process.env.EXPO_PUBLIC_API_URL || 'http://10.17.228.29:8000';
export const BASE_URL = envBaseUrl;
export const WS_BASE = envBaseUrl.replace('http', 'ws');


const client = axios.create({
  baseURL: BASE_URL,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

// Attach stored auth token (patient_id / name) on every request if present
client.interceptors.request.use(async (config) => {
  const raw = await AsyncStorage.getItem('@medisense_user');
  if (raw) {
    const user = JSON.parse(raw);
    if (user?.token) {
      config.headers['X-Patient-Token'] = user.token;
    }
  }
  return config;
});

export default client;
