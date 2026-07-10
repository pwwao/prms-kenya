/**
 * TextField Component
 */
import React, { useState, forwardRef } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TextInputProps,
  TouchableOpacity,
} from 'react-native';
import Feather from 'react-native-vector-icons/Feather';
import { Colors, Typography, Spacing, Radius, IconSize } from '@theme/tokens';

interface TextFieldProps extends TextInputProps {
  label?: string;
  error?: string;
  hint?: string;
  required?: boolean;
  isPassword?: boolean;
  leftIcon?: string;
  containerStyle?: object;
}

const TextField = forwardRef<TextInput, TextFieldProps>(
  (
    {
      label,
      error,
      hint,
      required,
      isPassword,
      leftIcon,
      containerStyle,
      style,
      ...inputProps
    },
    ref,
  ) => {
    const [isFocused, setIsFocused] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    return (
      <View style={[styles.container, containerStyle]}>
        {label && (
          <Text style={styles.label}>
            {label}
            {required && <Text style={styles.required}> *</Text>}
          </Text>
        )}

        <View
          style={[
            styles.inputWrapper,
            isFocused && styles.inputWrapperFocused,
            error && styles.inputWrapperError,
          ]}
        >
          {leftIcon && (
            <Feather
              name={leftIcon}
              size={IconSize.md}
              color={Colors.gray400}
              style={styles.leftIcon}
            />
          )}

          <TextInput
            ref={ref}
            style={[styles.input, style]}
            placeholderTextColor={Colors.textTertiary}
            secureTextEntry={isPassword && !showPassword}
            onFocus={(e) => {
              setIsFocused(true);
              inputProps.onFocus?.(e);
            }}
            onBlur={(e) => {
              setIsFocused(false);
              inputProps.onBlur?.(e);
            }}
            {...inputProps}
          />

          {isPassword && (
            <TouchableOpacity
              onPress={() => setShowPassword((v) => !v)}
              style={styles.rightIconButton}
            >
              <Feather
                name={showPassword ? 'eye-off' : 'eye'}
                size={IconSize.md}
                color={Colors.gray400}
              />
            </TouchableOpacity>
          )}
        </View>

        {error ? (
          <Text style={styles.errorText}>{error}</Text>
        ) : hint ? (
          <Text style={styles.hintText}>{hint}</Text>
        ) : null}
      </View>
    );
  },
);

TextField.displayName = 'TextField';
export default TextField;

const styles = StyleSheet.create({
  container: { marginBottom: Spacing.base },
  label: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.medium,
    color: Colors.textSecondary,
    marginBottom: Spacing.xs,
  },
  required: { color: Colors.error },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    backgroundColor: Colors.white,
    paddingHorizontal: Spacing.md,
  },
  inputWrapperFocused: { borderColor: Colors.borderFocus },
  inputWrapperError: { borderColor: Colors.error },
  leftIcon: { marginRight: Spacing.sm },
  input: {
    flex: 1,
    paddingVertical: Spacing.md,
    fontSize: Typography.fontSize.base,
    color: Colors.textPrimary,
  },
  rightIconButton: { padding: Spacing.xs },
  errorText: {
    fontSize: Typography.fontSize.xs,
    color: Colors.error,
    marginTop: Spacing.xs,
  },
  hintText: {
    fontSize: Typography.fontSize.xs,
    color: Colors.textTertiary,
    marginTop: Spacing.xs,
  },
});
