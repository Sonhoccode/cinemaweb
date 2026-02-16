import { api } from './api';

const API_URL = `${import.meta.env.VITE_BACKEND_URL}/auth/`;

// Register user
const register = async (userData) => {
  const response = await fetch(API_URL + 'register', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(userData),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || 'Something went wrong');
  }

  if (data) {
    localStorage.setItem('user', JSON.stringify(data));
  }

  return data;
};

// Login user
const login = async (userData) => {
  const response = await fetch(API_URL + 'login', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(userData),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || 'Something went wrong');
  }

  if (data) {
    localStorage.setItem('user', JSON.stringify(data));
  }

  return data;
};

// Logout user
const logout = () => {
  localStorage.removeItem('user');
};

// Get all users
const getAllUsers = async () => {
  const user = JSON.parse(localStorage.getItem('user'));
  const token = user?.token;

  if (!token) {
      throw new Error('Not authorized, no token');
  }

  const response = await fetch(API_URL + 'users', {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || 'Something went wrong');
  }

  return data;
};

const authService = {
  register,
  login,
  logout,
  getAllUsers,
};

export default authService;
