import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  activeTool: 'pencil', // pencil, eraser, rect, circle, arrow, text, cube
  brushColor: '#2563eb', // Default to a nice blue
  brushSize: 5,
  is3DMode: false,
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
    toggle3DMode: (state) => {
      state.is3DMode = !state.is3DMode;
    }
  },
});

export const { setTool, setColor, setSize, toggle3DMode } = toolSlice.actions;
export default toolSlice.reducer;
