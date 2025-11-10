import axios from "axios";
import { API_BASE_URL } from "../constants.js";

export const api = (token) => {
  const instance = axios.create({
    baseURL: API_BASE_URL,
    withCredentials: true,
  });
  if (token) instance.defaults.headers.common.Authorization = `Bearer ${token}`;
  return instance;
};