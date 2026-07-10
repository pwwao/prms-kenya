/**
 * TabBarIcon — uses Feather icon set via @expo/vector-icons
 */
import React from 'react';
import Feather from 'react-native-vector-icons/Feather';
import { IconSize } from '@theme/tokens';

interface TabBarIconProps {
  name: string;
  color: string;
  focused: boolean;
}

export default function TabBarIcon({ name, color }: TabBarIconProps) {
  return <Feather name={name} size={IconSize.lg} color={color} />;
}
