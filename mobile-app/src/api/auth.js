import client from './client';

/**
 * Register a new patient with face embedding
 */
export const registerFace = (name, age, phone, email, imageBase64) =>
  client.post('/auth/register/face', {
    name,
    age: parseInt(age, 10),
    phone,
    email,
    image_base64: imageBase64,
  });

/**
 * Login via face photo
 */
export const loginFace = (imageBase64) =>
  client.post('/auth/login/face', { image_base64: imageBase64 });

/**
 * Login via alphanumeric token
 */
export const loginToken = (token) =>
  client.post('/auth/login/token', { token });

/**
 * Forgot token → send OTP to email
 */
export const sendOTP = (email) =>
  client.post('/auth/recovery/forgot-token', { email });

/**
 * Verify OTP
 */
export const verifyOTP = (email, otp) =>
  client.post('/auth/recovery/verify-otp', { email, otp });

export const reRegisterFace = (email, imageBase64, newToken) =>
  client.post('/auth/recovery/reset-token', {
    email,
    new_token: newToken,
    image_base64: imageBase64,
  });
