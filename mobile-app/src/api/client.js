import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ── Change this to your machine's LAN IP when testing on a physical device ──
export const BASE_URL = 'http://10.17.228.29:8000'; // Machine LAN IP
export const WS_BASE = 'ws://10.17.228.29:8000';

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
