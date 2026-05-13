import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';

// Dynamically determine the Auth API URL based on the VITE_API_URL environment variable
const BASE_API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api/annotations';
const AUTH_API_URL = BASE_API_URL.replace('/annotations', '/auth');

const initialState = {
  user: JSON.parse(localStorage.getItem('user')) || null,
  token: localStorage.getItem('token') || null,
  status: 'idle', // 'idle' | 'loading' | 'succeeded' | 'failed'
  error: null,
};

export const loginThunk = createAsyncThunk(
  'auth/login',
  async ({ email, password }, { rejectWithValue }) => {
    try {
      const response = await axios.post(`${AUTH_API_URL}/login`, { email, password });
      localStorage.setItem('token', response.data.token);
      localStorage.setItem('user', JSON.stringify(response.data.user));
      return response.data;
    } catch (err) {
      return rejectWithValue(err.response?.data || { error: 'Connection failed' });
    }
  }
);

export const registerThunk = createAsyncThunk(
  'auth/register',
  async ({ email, password, name }, { rejectWithValue }) => {
    try {
      const response = await axios.post(`${AUTH_API_URL}/register`, { email, password, name });
      return response.data;
    } catch (err) {
      return rejectWithValue(err.response?.data || { error: 'Registration failed' });
    }
  }
);

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    logout: (state) => {
      state.user = null;
      state.token = null;
      state.status = 'idle';
      state.error = null;
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    },
    clearError: (state) => {
      state.error = null;
    }
  },
  extraReducers: (builder) => {
    builder
      // Login logic
      .addCase(loginThunk.pending, (state) => { 
        state.status = 'loading'; 
        state.error = null; 
      })
      .addCase(loginThunk.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.user = action.payload.user;
        state.token = action.payload.token;
      })
      .addCase(loginThunk.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload?.error || 'Login failed';
      })
      // Register logic
      .addCase(registerThunk.pending, (state) => { 
        state.status = 'loading'; 
        state.error = null; 
      })
      .addCase(registerThunk.fulfilled, (state) => {
        state.status = 'succeeded';
        // Registration successful - user can now log in
      })
      .addCase(registerThunk.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload?.error || 'Registration failed';
      });
  }
});

export const { logout, clearError } = authSlice.actions;
export default authSlice.reducer;
