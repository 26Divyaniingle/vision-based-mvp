import { API_BASE_URL } from '../constants/theme';
import { getToken } from './authService';

export async function fetchSessions(): Promise<any[]> {
    const token = await getToken();
    const res = await fetch(`${API_BASE_URL}/session/list`, {
        headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return [];
    return res.json();
}

export async function fetchSessionById(sessionId: string): Promise<any> {
    const token = await getToken();
    const res = await fetch(`${API_BASE_URL}/session/${sessionId}`, {
        headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error('Session not found.');
    return res.json();
}

export async function generatePdfReport(sessionData: any, patientName: string): Promise<string> {
    const token = await getToken();
    const res = await fetch(`${API_BASE_URL}/report/generate_pdf`, {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ session_data: sessionData, patient_name: patientName }),
    });
    if (!res.ok) throw new Error('Failed to generate PDF.');
    const data = await res.json();
    return data.pdf_base64; // base64 string
}

export async function emailPdfReport(
    sessionData: any,
    patientName: string,
    email: string
): Promise<boolean> {
    const token = await getToken();
    const res = await fetch(`${API_BASE_URL}/report/email_pdf`, {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ session_data: sessionData, patient_name: patientName, email }),
    });
    if (!res.ok) return false;
    const data = await res.json();
    return data.success;
}
