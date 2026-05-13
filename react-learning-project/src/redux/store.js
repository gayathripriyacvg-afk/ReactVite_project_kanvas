import { configureStore } from '@reduxjs/toolkit';
import toolReducer from './toolSlice';
import annotationReducer from './annotationSlice';
import authReducer from './authSlice';

export const store = configureStore({
  reducer: {
    tool: toolReducer,
    annotations: annotationReducer,
    auth: authReducer,
  },
  // Enable Redux DevTools only in development mode
  devTools: import.meta.env.MODE !== 'production',
});
