/**
 * SelectField — bottom-sheet style picker
 */
import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  FlatList,
} from 'react-native';
import Modal from 'react-native-modal';
import Feather from 'react-native-vector-icons/Feather';
import { Colors, Typography, Spacing, Radius, IconSize } from '@theme/tokens';

interface Option {
  label: string;
  value: string;
}

interface SelectFieldProps {
  label?: string;
  required?: boolean;
  placeholder?: string;
  value: string | null;
  options: Option[];
  onSelect: (value: string) => void;
  error?: string;
  searchable?: boolean;
}

export default function SelectField({
  label,
  required,
  placeholder = 'Select an option',
  value,
  options,
  onSelect,
  error,
  searchable = false,
}: SelectFieldProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');

  const selectedLabel = options.find((o) => o.value === value)?.label;

  const filteredOptions = searchable
    ? options.filter((o) => o.label.toLowerCase().includes(query.toLowerCase()))
    : options;

  return (
    <View style={styles.container}>
      {label && (
        <Text style={styles.label}>
          {label}
          {required && <Text style={styles.required}> *</Text>}
        </Text>
      )}

      <TouchableOpacity
        style={[styles.field, error && styles.fieldError]}
        onPress={() => setIsOpen(true)}
        activeOpacity={0.7}
      >
        <Text style={selectedLabel ? styles.valueText : styles.placeholderText}>
          {selectedLabel ?? placeholder}
        </Text>
        <Feather name="chevron-down" size={IconSize.md} color={Colors.gray400} />
      </TouchableOpacity>

      {error && <Text style={styles.errorText}>{error}</Text>}

      <Modal
        isVisible={isOpen}
        onBackdropPress={() => setIsOpen(false)}
        onBackButtonPress={() => setIsOpen(false)}
        style={styles.modal}
        propagateSwipe
      >
        <View style={styles.sheet}>
          <View style={styles.sheetHandle} />
          <Text style={styles.sheetTitle}>{label ?? 'Select'}</Text>

          {searchable && (
            <View style={styles.searchBox}>
              <Feather name="search" size={IconSize.sm} color={Colors.gray400} />
              <TextInput
                style={styles.searchInput}
                value={query}
                onChangeText={setQuery}
                placeholder="Search..."
                placeholderTextColor={Colors.gray400}
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>
          )}

          <FlatList
            data={filteredOptions}
            keyExtractor={(item) => item.value}
            style={styles.optionsList}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.option}
                onPress={() => {
                  onSelect(item.value);
                  setIsOpen(false);
                  setQuery('');
                }}
              >
                <Text
                  style={[
                    styles.optionText,
                    item.value === value && styles.optionTextSelected,
                  ]}
                >
                  {item.label}
                </Text>
                {item.value === value && (
                  <Feather name="check" size={IconSize.md} color={Colors.primary} />
                )}
              </TouchableOpacity>
            )}
            ItemSeparatorComponent={() => <View style={styles.separator} />}
          />
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginBottom: Spacing.base },
  label: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.medium,
    color: Colors.textSecondary,
    marginBottom: Spacing.xs,
  },
  required: { color: Colors.error },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    backgroundColor: Colors.white,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
  },
  fieldError: { borderColor: Colors.error },
  valueText: { fontSize: Typography.fontSize.base, color: Colors.textPrimary },
  placeholderText: { fontSize: Typography.fontSize.base, color: Colors.textTertiary },
  errorText: { fontSize: Typography.fontSize.xs, color: Colors.error, marginTop: Spacing.xs },
  modal: { justifyContent: 'flex-end', margin: 0 },
  sheet: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    paddingTop: Spacing.sm,
    paddingHorizontal: Spacing.base,
    maxHeight: '70%',
  },
  sheetHandle: {
    width: 40,
    height: 4,
    backgroundColor: Colors.gray300,
    borderRadius: Radius.full,
    alignSelf: 'center',
    marginBottom: Spacing.md,
  },
  sheetTitle: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.semiBold,
    color: Colors.textPrimary,
    marginBottom: Spacing.md,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.gray100,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  searchInput: { marginLeft: Spacing.sm, fontSize: Typography.fontSize.base, color: Colors.textTertiary },
  optionsList: { paddingBottom: Spacing.xl },
  option: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.md,
  },
  optionText: { fontSize: Typography.fontSize.base, color: Colors.textPrimary },
  optionTextSelected: { color: Colors.primary, fontWeight: Typography.fontWeight.semiBold },
  separator: { height: 1, backgroundColor: Colors.border },
});
