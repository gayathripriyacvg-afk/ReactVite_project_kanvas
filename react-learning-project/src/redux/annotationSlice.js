import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api/annotations';

// Redux Thunk for saving annotations
export const saveAnnotationsThunk = createAsyncThunk(
  'annotations/save',
  async ({ documentId, pageNumber, lines, pdfUrl }, { rejectWithValue }) => {
    try {
      const { data } = await axios.post(API_URL, { documentId, pageNumber, lines, pdfUrl });
      return data;
    } catch (err) {
      return rejectWithValue(err.response.data);
    }
  }
);

const annotationSlice = createSlice({
  name: 'annotations',
  initialState: {
    pageAnnotations: {}, // { [pageNumber]: lines[] }
    status: 'idle', // 'idle' | 'loading' | 'succeeded' | 'failed'
    error: null,
  },
  reducers: {
    setLocalAnnotations: (state, action) => {
      const { pageNumber, lines } = action.payload;
      state.pageAnnotations[pageNumber] = lines;
    },
    updateAllAnnotations: (state, action) => {
      state.pageAnnotations = action.payload;
    },
    clearPageAnnotations: (state, action) => {
      const pageNumber = action.payload;
      state.pageAnnotations[pageNumber] = [];
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(saveAnnotationsThunk.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(saveAnnotationsThunk.fulfilled, (state) => {
        state.status = 'succeeded';
      })
      .addCase(saveAnnotationsThunk.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      });
  },
});

export const { setLocalAnnotations, updateAllAnnotations, clearPageAnnotations } = annotationSlice.actions;
export default annotationSlice.reducer;
