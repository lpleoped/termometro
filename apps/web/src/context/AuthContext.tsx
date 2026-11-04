import { createContext, useContext, useEffect, useState } from 'react'
// @ts-ignore
import { jwtDecode } from 'jwt-decode'

interface AuthContextType {
    isAuthenticated: boolean
    /** True cuando ya se leyó el token guardado. Hasta entonces no se decide el login. */
    lista: boolean
    login: (token: string) => void
    logout: () => void
}

interface DecodedToken {
    exp: number;
    // podés agregar más campos si los usás (ej. nombre, email)
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
        const token = localStorage.getItem('token')
        if (token) {
            try {
                const decoded = jwtDecode<DecodedToken>(token)
                const exp = decoded.exp * 1000

                if (Date.now() >= exp) {
                    localStorage.removeItem('token')
                    setIsAuthenticated(false)
                } else {
                    setIsAuthenticated(true)
                }
            } catch (e) {
                console.error('Token inválido', e)
                localStorage.removeItem('token')
                setIsAuthenticated(false)
            }
        }
        setLista(true)
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
