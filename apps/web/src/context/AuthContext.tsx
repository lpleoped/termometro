import { createContext, useContext, useEffect, useState } from 'react'
import api from '../services/api'

interface AuthContextType {
    isAuthenticated: boolean
    /** True cuando ya se leyó el token guardado. Hasta entonces no se decide el login. */
    lista: boolean
    login: (token: string) => void
    logout: () => void
}



const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [isAuthenticated, setIsAuthenticated] = useState(false)
    const [lista, setLista] = useState(false)

    const logout = () => {
        localStorage.removeItem('token')
        setIsAuthenticated(false)
    }

    const login = (token: string) => {
        localStorage.setItem('token', token)
        setIsAuthenticated(true)
    }

    useEffect(() => {
        let active = true;
        const token = localStorage.getItem('token');
        if (!token) { setLista(true); return; }
        api.get('/auth/me').then(() => { if (active) setIsAuthenticated(true); })
            .catch((error) => {
                if (!active) return;
                if ([400, 401, 403].includes(error?.response?.status)) localStorage.removeItem('token');
                setIsAuthenticated(false);
            }).finally(() => { if (active) setLista(true); });
        return () => { active = false; };
    }, [])

    return (
        <AuthContext.Provider value={{ isAuthenticated, lista, login, logout }}>
            {children}
        </AuthContext.Provider>
    )
}

export function useAuth() {
    const context = useContext(AuthContext)
    if (!context) throw new Error('useAuth debe estar dentro de AuthProvider')
    return context
}
