import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  TextStyle
} from 'react-native';
import { useNavigationStore } from '@store/navigation';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AuthStackParamList } from '@navigation/types';
import { gql, useMutation } from '@apollo/client';

type Props = NativeStackScreenProps<AuthStackParamList, 'ForgotPassword'>;
type InputStyle = TextStyle | TextStyle[];

const FORGOT_PASSWORD_MUTATION = gql`
  mutation ForgotPassword($email: String!) {
    forgotPassword(email: $email)
  }
`;

export default function ForgotPasswordScreen({ navigation }: Props) {
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const { navigate } = useNavigationStore();
  const [forgotPassword, { loading }] = useMutation(FORGOT_PASSWORD_MUTATION);

  const validateEmail = (email: string) => {
    return /\S+@\S+\.\S+/.test(email);
  };

  const handleSubmit = async () => {
    setError(null);

    if (!email) {
      setError('Email is required');
      return;
    }

    if (!validateEmail(email)) {
      setError('Please enter a valid email address');
      return;
    }

    try {
      await forgotPassword({ variables: { email } });
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send reset email');
    }
  };

  const getInputStyle = (hasError: boolean): InputStyle => {
    return hasError ? [styles.input, styles.inputError] : styles.input;
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <Text style={styles.title}>Reset Password</Text>
          <Text style={styles.subtitle}>
            Enter your email address and we'll send you instructions to reset your password
          </Text>
        </View>

        <View style={styles.form}>
          {!success ? (
            <>
              <TextInput
                style={getInputStyle(!!error)}
                placeholder="Email"
                value={email}
                onChangeText={(value) => {
                  setEmail(value);
                  setError(null);
                }}
                autoCapitalize="none"
                keyboardType="email-address"
                autoComplete="email"
                editable={!loading}
              />
              {error && <Text style={styles.errorText}>{error}</Text>}

              <TouchableOpacity
                style={styles.submitButton}
                onPress={handleSubmit}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.submitButtonText}>Send Reset Link</Text>
                )}
              </TouchableOpacity>
            </>
          ) : (
            <View style={styles.successContainer}>
              <Text style={styles.successText}>
                Password reset instructions have been sent to your email address.
              </Text>
              <TouchableOpacity
                style={styles.backButton}
                onPress={() => navigate('Login')}
              >
                <Text style={styles.backButtonText}>Back to Login</Text>
              </TouchableOpacity>
            </View>
          )}

          {!success && (
            <TouchableOpacity
              style={styles.backToLogin}
              onPress={() => navigate('Login')}
            >
              <Text style={styles.backToLoginText}>Back to Login</Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff'
  },
  scrollContent: {
    flexGrow: 1,
    padding: 20
  },
  header: {
    marginTop: 60,
    marginBottom: 40
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 8
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    lineHeight: 24
  },
  form: {
    width: '100%'
  },
  input: {
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    padding: 16,
    marginBottom: 8,
    fontSize: 16
  },
  inputError: {
    borderColor: '#ff3b30',
    borderWidth: 1
  },
  errorText: {
    color: '#ff3b30',
    marginBottom: 16,
    fontSize: 14
  },
  submitButton: {
    backgroundColor: '#007AFF',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 24
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600'
  },
  backToLogin: {
    alignItems: 'center'
  },
  backToLoginText: {
    color: '#007AFF',
    fontSize: 14,
    fontWeight: '600'
  },
  successContainer: {
    alignItems: 'center',
    padding: 20
  },
  successText: {
    fontSize: 16,
    color: '#34C759',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 24
  },
  backButton: {
    backgroundColor: '#007AFF',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    width: '100%'
  },
  backButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600'
  }
}); 