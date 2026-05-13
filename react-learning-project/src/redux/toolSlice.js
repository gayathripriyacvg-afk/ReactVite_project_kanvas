import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  activeTool: 'pencil', // pencil, eraser, rect, circle, arrow, text
  brushColor: '#2563eb', // Default to a nice blue
  brushSize: 5,
};


export const toolSlice = createSlice({
  name: 'tool',
  initialState,
  reducers: {
    setTool: (state, action) => {
      state.activeTool = action.payload;
    },
    setColor: (state, action) => {
      state.brushColor = action.payload;
    },
    setSize: (state, action) => {
      state.brushSize = action.payload;
    },
  },
});

export const { setTool, setColor, setSize } = toolSlice.actions;
export default toolSlice.reducer;
