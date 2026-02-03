import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';

interface AuthContextType {
    isAuthenticated: boolean;
    login: (username: string, password: string) => boolean;
    logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
    const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
        // Initialize from sessionStorage
        return sessionStorage.getItem('isAuthenticated') === 'true';
    });

    useEffect(() => {
        // Persist authentication state to sessionStorage
        sessionStorage.setItem('isAuthenticated', String(isAuthenticated));
    }, [isAuthenticated]);

    const login = (username: string, password: string): boolean => {
        const validUsername = import.meta.env.VITE_APP_LOGIN_USER;
        const validPassword = import.meta.env.VITE_APP_LOGIN_PASS;

        if (username === validUsername && password === validPassword) {
            setIsAuthenticated(true);
            return true;
        }
        return false;
    };

    const logout = () => {
        setIsAuthenticated(false);
        sessionStorage.removeItem('isAuthenticated');
    };

    return (
        <AuthContext.Provider value={{ isAuthenticated, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
