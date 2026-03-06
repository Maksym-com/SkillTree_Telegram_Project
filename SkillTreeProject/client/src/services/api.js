// src/services/api.js
export const API_URL = 'https://skilltree-telegram-project.onrender.com';

export const initUser = async (tgId, username) => {
  const res = await fetch(`${API_URL}/user/init/${tgId}?username=${encodeURIComponent(username)}`);
  return res.json();
};

export const getSkills = async (userId) => {
  const res = await fetch(`${API_URL}/skills/${userId}`);
  return res.json();
};