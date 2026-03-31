import client from './client';
import { WS_BASE } from './client';

/**
 * Generate a PDF report for a completed session
 * Returns a URL or base64 blob depending on backend
 */
export const generatePDF = (sessionId) =>
  client.get(`/report/generate_pdf`, { params: { session_id: sessionId } });

/**
 * Get session data (transcript, diagnosis, vision)
 */
export const getSession = (sessionId) =>
  client.get(`/session/${sessionId}`);

/**
 * Build a WebSocket URL for the live consultation stream
 */
export const buildWsUrl = (sessionId) =>
  `${WS_BASE}/ws/stream/${sessionId}`;
