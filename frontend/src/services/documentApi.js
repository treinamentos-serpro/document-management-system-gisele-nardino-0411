const API_BASE_URL = '/api';

export class ApiError extends Error {
  constructor(message, status, code) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
  }
}

async function request(path, options) {
  let response;

  try {
    response = await fetch(`${API_BASE_URL}${path}`, options);
  } catch {
    throw new ApiError('Não foi possível conectar ao servidor.', 0, 'NETWORK_ERROR');
  }

  if (!response.ok) {
    let payload;
    try {
      payload = await response.json();
    } catch {
      payload = null;
    }

    throw new ApiError(
      payload?.error?.message || 'Não foi possível concluir a solicitação.',
      response.status,
      payload?.error?.code || 'REQUEST_FAILED',
    );
  }

  return response;
}

export async function listDocuments() {
  const response = await request('/documents');
  const documents = await response.json();

  if (!Array.isArray(documents)) {
    throw new ApiError('A resposta do servidor está em formato inválido.', 502, 'INVALID_RESPONSE');
  }

  return documents;
}

export async function uploadDocument(file) {
  const formData = new FormData();
  formData.append('file', file);

  const response = await request('/upload', {
    method: 'POST',
    body: formData,
  });

  return response.json();
}

export async function downloadDocument(id) {
  const response = await request(`/documents/${encodeURIComponent(id)}/download`);
  return response.blob();
}