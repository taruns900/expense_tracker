import type { PropsWithChildren } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { Button } from './Button';
import { colors, radius, spacing, typography } from './theme';

type Placement = 'sheet' | 'center';

type Props = PropsWithChildren<{
  visible: boolean;
  title: string;
  primaryLabel: string;
  onClose: () => void;
  onSubmit: () => void;
  submitDisabled?: boolean;
  placement?: Placement;
  size?: 'default' | 'tall';
}>;

export function FormModal({
  visible,
  title,
  primaryLabel,
  onClose,
  onSubmit,
  submitDisabled,
  placement = 'sheet',
  size = 'default',
  children,
}: Props) {
  const centered = placement === 'center';
  const tall = size === 'tall';

  return (
    <Modal
      visible={visible}
      transparent
      animationType={centered ? 'fade' : 'slide'}
      onRequestClose={onClose}>
      <View style={[styles.overlay, centered && styles.overlayCenter, tall && styles.overlayTall]}>
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={onClose}
          accessibilityLabel="Close"
        />
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={[styles.sheetWrap, tall && styles.sheetWrapTall]}>
          <View style={[styles.sheet, centered && styles.sheetCenter, tall && styles.sheetTall]}>
            <Text style={styles.title}>{title}</Text>
            <ScrollView
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={styles.body}
              style={tall ? styles.bodyScrollTall : undefined}>
              {children}
            </ScrollView>
            <View style={styles.actions}>
              <Button label="Cancel" variant="ghost" onPress={onClose} style={styles.action} />
              <Button
                label={primaryLabel}
                onPress={onSubmit}
                disabled={submitDisabled}
                style={styles.action}
              />
            </View>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'flex-end',
  },
  overlayCenter: {
    justifyContent: 'center',
    padding: spacing.lg,
  },
  overlayTall: {
    paddingVertical: spacing.sm,
  },
  sheetWrap: {
    width: '100%',
  },
  sheetWrapTall: {
    height: '100%',
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    padding: spacing.lg,
    maxHeight: '85%',
  },
  sheetCenter: {
    borderRadius: radius.lg,
    maxHeight: '80%',
  },
  sheetTall: {
    height: '94%',
    maxHeight: '94%',
  },
  title: {
    ...typography.heading,
    color: colors.text,
    marginBottom: spacing.md,
  },
  body: {
    gap: spacing.md,
    paddingBottom: spacing.md,
  },
  bodyScrollTall: {
    flex: 1,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  action: {
    flex: 1,
  },
});
