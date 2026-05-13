import { configureStore } from '@reduxjs/toolkit';
import toolReducer from './toolSlice';
import annotationReducer from './annotationSlice';

export const store = configureStore({
  reducer: {
    tool: toolReducer,
    annotations: annotationReducer,
  },
});
