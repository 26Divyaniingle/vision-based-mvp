import client from './client';
import { WS_BASE } from './client';

/**
 * Generate a PDF report for a completed session
 * Returns a URL or base64 blob depending on backend
 */
export const generatePDF = (sessionId) =>
  client.get(`/report/generate_pdf`, { params: { session_id: sessionId }, responseType: 'blob' });

export const emailPDF = (sessionId, email) =>
  client.post(`/report/email_pdf`, null, { params: { session_id: sessionId, email } });

/**
 * Get session data (transcript, diagnosis, vision)
 */
export const getSession = (sessionId) =>
  client.get(`/session/${sessionId}`);

/**
 * Get session history for a specific patient
 */
export const getHistory = (patientId) =>
  client.get(`/session/list`, { params: { patient_id: patientId } });

/**
 * Build a WebSocket URL for the live consultation stream
 */
export const buildWsUrl = (sessionId) =>
  `${WS_BASE}/ws/stream/${sessionId}`;

/**
 * Transcriber Endpoints
 */
export const startConsultation = (patientId, language = 'English') =>
  client.post(`/transcriber/start`, null, { params: { patient_id: patientId, language } });

export const stopConsultation = (consultationId) =>
  client.post(`/transcriber/${consultationId}/stop`);

export const getTranscriberHistory = (patientId) =>
  client.get(`/transcriber/history/${patientId}`);

export const buildTranscriberWsUrl = (consultationId) =>
  `${WS_BASE}/transcriber/ws/${consultationId}`;
