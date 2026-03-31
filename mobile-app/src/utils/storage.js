import AsyncStorage from '@react-native-async-storage/async-storage';

const USER_KEY = '@medisense_user';

export const saveUser = async (userData) => {
  await AsyncStorage.setItem(USER_KEY, JSON.stringify(userData));
};

export const getUser = async () => {
  const raw = await AsyncStorage.getItem(USER_KEY);
  return raw ? JSON.parse(raw) : null;
};

export const clearUser = async () => {
  await AsyncStorage.removeItem(USER_KEY);
};
