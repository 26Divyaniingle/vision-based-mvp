/**
 * Security API Client
 * Isolated module for all security-alert related API calls.
 * Does not modify existing api modules.
 */

import client from './client';

/**
 * Fetch all security alerts for a specific consultation session.
 * @param {string} sessionId - The session ID to look up
 */
export const getSessionAlerts = (sessionId) =>
  client.get(`/security/alerts/session/${sessionId}`);

/**
 * Fetch recent security alerts for a patient across all sessions.
 * Used by the Dashboard security panel.
 * @param {number} patientId - The patient's database ID
 * @param {number} limit - Max number of alerts to return (default 20)
 */
export const getPatientAlerts = (patientId, limit = 20) =>
  client.get(`/security/alerts/patient/${patientId}?limit=${limit}`);

/**
 * Get unresolved alert count for a session.
 * @param {string} sessionId
 */
export const getUnresolvedCount = (sessionId) =>
  client.get(`/security/alerts/session/${sessionId}/count`);

/**
 * Attempt re-verification using a selfie taken during consultation.
 * If successful, the backend resolves all pending alerts for the session.
 *
 * @param {number} patientId
 * @param {string} sessionId
 * @param {string} imageBase64 - Base64 encoded selfie (no data: prefix)
 */
export const reVerifyIdentity = (patientId, sessionId, imageBase64) =>
  client.post('/security/re-verify', {
    patient_id: patientId,
    session_id: sessionId,
    image_base64: imageBase64,
  });

/**
 * Resolve all alerts for a session after successful verification.
 * @param {string} sessionId
 */
export const resolveAlerts = (sessionId) =>
  client.post(`/security/alerts/resolve/${sessionId}`);
