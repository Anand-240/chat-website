import axios from "axios";
import { API_BASE_URL } from "../constants.js";

export const api = (token) => {
  return axios.create({
    baseURL: `${API_BASE_URL}/api`,
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
};
