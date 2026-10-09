import axios from 'axios';

const api = axios.create({ baseURL: '/api' });

export const aiApi = {
  getModels: () => api.get('/ai/models').then((r) => r.data),
  generate: (payload) => api.post('/ai/generate', payload).then((r) => r.data),
  iterate: (gameId, payload) => api.post(`/ai/iterate/${gameId}`, payload).then((r) => r.data),
  chat: (payload) => api.post('/ai/chat', payload).then((r) => r.data),
  vision: (payload) => api.post('/ai/vision', payload).then((r) => r.data),
  testKey: () => api.get('/ai/test-key').then((r) => r.data),
};

export const gamesApi = {
  list: () => api.get('/games').then((r) => r.data),
  get: (gameId) => api.get(`/games/${gameId}`).then((r) => r.data),
  remove: (gameId) => api.delete(`/games/${gameId}`).then((r) => r.data),
};

export const filesApi = {
  save: (gameId, filePath, content) =>
    api.put(`/files/${gameId}/${filePath}`, { content }).then((r) => r.data),
  uploadImage: (file) => {
    const form = new FormData();
    form.append('image', file);
    return api.post('/files/upload-image', form).then((r) => r.data);
  },
};
