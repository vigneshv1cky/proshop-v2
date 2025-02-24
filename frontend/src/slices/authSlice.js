import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  userInfo: JSON.parse(localStorage.getItem('userInfo')) || null,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setCredentials: (state, action) => {
      state.userInfo = action.payload;
      localStorage.setItem('userInfo', JSON.stringify(action.payload));
    },
    logout: (state) => {
      state.userInfo = null;
      localStorage.removeItem('userInfo'); // Only remove user info, not everything
    },
  },
});

export const { setCredentials, logout } = authSlice.actions;
export default authSlice.reducer;
