import React, { useState } from 'react';
import {
  View,
  TextInput,
  Text,
  StyleSheet,
  ViewStyle,
  TextStyle,
  StyleProp,
  TextInputProps,
  TouchableOpacity
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface InputProps extends Omit<TextInputProps, 'style'> {
  label?: string;
  error?: string;
  leftIcon?: keyof typeof Ionicons.glyphMap;
  rightIcon?: keyof typeof Ionicons.glyphMap;
  onRightIconPress?: () => void;
  containerStyle?: StyleProp<ViewStyle>;
  inputStyle?: StyleProp<TextStyle>;
  labelStyle?: StyleProp<TextStyle>;
  errorStyle?: StyleProp<TextStyle>;
}

export default function Input({
  label,
  error,
  leftIcon,
  rightIcon,
  onRightIconPress,
  containerStyle,
  inputStyle,
  labelStyle,
  errorStyle,
  ...props
}: InputProps) {
  const [isFocused, setIsFocused] = useState(false);

  const getInputContainerStyle = (): StyleProp<ViewStyle> => {
    const containerStyles: (ViewStyle | false)[] = [
      styles.inputContainer,
      isFocused && styles.inputContainerFocused,
      error && styles.inputContainerError
    ];

    if (containerStyle) {
      containerStyles.push(containerStyle as ViewStyle);
    }

    return containerStyles;
  };

  const getInputStyle = (): StyleProp<TextStyle> => {
    return [
      styles.input,
      leftIcon && styles.inputWithLeftIcon,
      rightIcon && styles.inputWithRightIcon,
      inputStyle
    ];
  };

  return (
    <View style={styles.container}>
      {label && <Text style={[styles.label, labelStyle]}>{label}</Text>}
      
      <View style={getInputContainerStyle()}>
        {leftIcon && (
          <Ionicons
            name={leftIcon}
            size={20}
            color={error ? '#ff3b30' : isFocused ? '#007AFF' : '#8e8e93'}
            style={styles.leftIcon}
          />
        )}

        <TextInput
          style={getInputStyle()}
          placeholderTextColor="#8e8e93"
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          {...props}
        />

        {rightIcon && (
          <TouchableOpacity
            onPress={onRightIconPress}
            style={styles.rightIcon}
            disabled={!onRightIconPress}
          >
            <Ionicons
              name={rightIcon}
              size={20}
              color={error ? '#ff3b30' : isFocused ? '#007AFF' : '#8e8e93'}
            />
          </TouchableOpacity>
        )}
      </View>

      {error && <Text style={[styles.error, errorStyle]}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#000',
    marginBottom: 8
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'transparent'
  },
  inputContainerFocused: {
    borderColor: '#007AFF',
    backgroundColor: '#fff'
  },
  inputContainerError: {
    borderColor: '#ff3b30',
    backgroundColor: '#fff'
  },
  input: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    color: '#000'
  },
  inputWithLeftIcon: {
    paddingLeft: 40
  },
  inputWithRightIcon: {
    paddingRight: 40
  },
  leftIcon: {
    position: 'absolute',
    left: 12,
    zIndex: 1
  },
  rightIcon: {
    position: 'absolute',
    right: 12,
    zIndex: 1,
    padding: 4
  },
  error: {
    color: '#ff3b30',
    fontSize: 12,
    marginTop: 4,
    marginLeft: 4
  }
}); 