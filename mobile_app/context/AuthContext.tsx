import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { getToken, logout as authLogout } from '../services/authService';

interface AuthContextType {
    isAuthenticated: boolean;
    isLoading: boolean;
    userName: string;
    signIn: (token: string, name?: string) => void;
    signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
    isAuthenticated: false,
    isLoading: true,
    userName: '',
    signIn: () => { },
    signOut: async () => { },
});

export function AuthProvider({ children }: { children: ReactNode }) {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [userName, setUserName] = useState('');

    useEffect(() => {
        // On app start, check if a token exists
        getToken().then((token) => {
            setIsAuthenticated(!!token);
            setIsLoading(false);
        });
    }, []);

    function signIn(token: string, name = '') {
        setIsAuthenticated(true);
        setUserName(name);
    }

    async function signOut() {
        await authLogout();
        setIsAuthenticated(false);
        setUserName('');
    }

    return (
        <AuthContext.Provider value={{ isAuthenticated, isLoading, userName, signIn, signOut }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    return useContext(AuthContext);
}
