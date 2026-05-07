import client from './client';

export const chatWithAI = (messages) => {
  return client.post('/assistant/chat', { messages });
};

export const analyzeReport = (base64Image, filename = "report.jpg") => {
  return client.post('/assistant/analyze-report-base64', {
    image_base64: base64Image,
    filename: filename
  });
};
