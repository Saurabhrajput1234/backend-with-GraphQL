import React from 'react';
import { create, StateCreator, SetState, GetState } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { gql, useMutation } from '@apollo/client';

interface User {
  id: string;
  username: string;
  email: string;
  fullName: string;
  bio?: string;
  avatar?: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (input: RegisterInput) => Promise<void>;
  logout: () => Promise<void>;
  updateProfile: (input: UpdateProfileInput) => Promise<void>;
}

interface RegisterInput {
  username: string;
  email: string;
  password: string;
  fullName: string;
  bio?: string;
  avatar?: string;
}

interface UpdateProfileInput {
  username?: string;
  email?: string;
  fullName?: string;
  bio?: string;
  avatar?: string;
  password?: string;
}

const LOGIN_MUTATION = gql`
  mutation Login($input: LoginInput!) {
    login(input: $input) {
      token
      user {
        id
        username
        email
        fullName
        bio
        avatar
      }
    }
  }
`;

const REGISTER_MUTATION = gql`
  mutation Register($input: CreateUserInput!) {
    register(input: $input) {
      token
      user {
        id
        username
        email
        fullName
        bio
        avatar
      }
    }
  }
`;

const UPDATE_PROFILE_MUTATION = gql`
  mutation UpdateProfile($input: UpdateUserInput!) {
    updateProfile(input: $input) {
      id
      username
      email
      fullName
      bio
      avatar
    }
  }
`;

type AuthStore = {
  set: SetState<AuthState>;
  get: GetState<AuthState>;
};

export const useAuthStore = create<AuthState>((set: AuthStore['set'], get: AuthStore['get']) => ({
  user: null,
  token: null,
  isLoading: false,
  error: null,

  login: async (email: string, password: string) => {
    try {
      set({ isLoading: true, error: null });
      const [loginMutation] = useMutation(LOGIN_MUTATION);
      
      const { data } = await loginMutation({
        variables: { input: { email, password } }
      });

      const { token, user } = data.login;
      await AsyncStorage.setItem('token', token);
      
      set({ user, token, isLoading: false });
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Login failed',
        isLoading: false 
      });
      throw error;
    }
  },

  register: async (input: RegisterInput) => {
    try {
      set({ isLoading: true, error: null });
      const [registerMutation] = useMutation(REGISTER_MUTATION);
      
      const { data } = await registerMutation({
        variables: { input }
      });

      const { token, user } = data.register;
      await AsyncStorage.setItem('token', token);
      
      set({ user, token, isLoading: false });
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Registration failed',
        isLoading: false 
      });
      throw error;
    }
  },

  logout: async () => {
    try {
      await AsyncStorage.removeItem('token');
      set({ user: null, token: null, error: null });
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Logout failed'
      });
      throw error;
    }
  },

  updateProfile: async (input: UpdateProfileInput) => {
    try {
      set({ isLoading: true, error: null });
      const [updateProfileMutation] = useMutation(UPDATE_PROFILE_MUTATION);
      
      const { data } = await updateProfileMutation({
        variables: { input }
      });

      set({ user: data.updateProfile, isLoading: false });
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Profile update failed',
        isLoading: false 
      });
      throw error;
    }
  }
}));

// Auth Provider component
export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, token } = useAuthStore();

  // Load token from storage on mount
  React.useEffect(() => {
    const loadToken = async () => {
      try {
        const storedToken = await AsyncStorage.getItem('token');
        if (storedToken) {
          useAuthStore.setState({ token: storedToken });
        }
      } catch (error) {
        console.error('Error loading token:', error);
      }
    };

    loadToken();
  }, []);

  return <>{children}</>;
}; 