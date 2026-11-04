import axios from 'axios'

const API = 'http://localhost:3000/api'

export const register = (data: { nombre: string; email: string; password: string }) =>
    axios.post(`${API}/auth/register`, data)

export const login = (data: { email: string; password: string }) =>
    axios.post(`${API}/auth/login`, data)

export const getProfile = (token: string) =>
    axios.get(`${API}/auth/me`, {
        headers: {
            Authorization: `Bearer ${token}`,
        },
    })