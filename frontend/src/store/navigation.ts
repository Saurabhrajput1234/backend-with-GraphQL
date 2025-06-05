import { create } from 'zustand';
import { createNavigationContainerRef } from '@react-navigation/native';
import { RootStackParamList } from '@navigation/types';

export const navigationRef = createNavigationContainerRef<RootStackParamList>();

interface NavigationState {
  currentRoute: keyof RootStackParamList | null;
  setCurrentRoute: (route: keyof RootStackParamList) => void;
  navigate: (name: keyof RootStackParamList, params?: any) => void;
  goBack: () => void;
}

export const useNavigationStore = create<NavigationState>((set) => ({
  currentRoute: null,
  
  setCurrentRoute: (route) => {
    set({ currentRoute: route });
  },

  navigate: (name, params) => {
    if (navigationRef.isReady()) {
      navigationRef.navigate(name, params);
      set({ currentRoute: name });
    }
  },

  goBack: () => {
    if (navigationRef.isReady() && navigationRef.canGoBack()) {
      navigationRef.goBack();
    }
  }
})); 