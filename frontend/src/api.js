import axios from 'axios';

const API_URL = 'http://localhost:3001/api';

// In your frontend's api.js
export const summarizeTodos = () => {
    return axios.post(`${API_URL}/summarize`)
      .then(res => res.data.summary); // Now just returns the summary text
  };