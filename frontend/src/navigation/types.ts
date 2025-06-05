export type RootStackParamList = {
  // Auth Stack
  Login: undefined;
  Register: undefined;
  ForgotPassword: undefined;
  
  // Main Stack
  Home: undefined;
  Profile: { userId: string };
  EditProfile: undefined;
  Post: { postId: string };
  CreatePost: undefined;
  Search: undefined;
  Notifications: undefined;
  Chat: { chatId: string };
  ChatList: undefined;
  Settings: undefined;
};

// Auth Stack Navigator
export type AuthStackParamList = Pick<
  RootStackParamList,
  'Login' | 'Register' | 'ForgotPassword'
>;

// Main Stack Navigator
export type MainStackParamList = Pick<
  RootStackParamList,
  | 'Home'
  | 'Profile'
  | 'EditProfile'
  | 'Post'
  | 'CreatePost'
  | 'Search'
  | 'Notifications'
  | 'Chat'
  | 'ChatList'
  | 'Settings'
>;

// Tab Navigator
export type TabParamList = {
  HomeTab: undefined;
  SearchTab: undefined;
  CreatePostTab: undefined;
  NotificationsTab: undefined;
  ProfileTab: undefined;
}; 