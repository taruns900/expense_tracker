import DateTimePicker from '@react-native-community/datetimepicker';
import { useState } from 'react';
import { Platform, View } from 'react-native';

import { Button } from './Button';
import { SelectField } from './SelectField';
import { spacing } from './theme';
import { formatDisplayDate, parseIsoDate, toIsoDate } from '@/utils/dates';

type Props = {
  label: string;
  value?: string;
  placeholder: string;
  onChange: (isoDate: string) => void;
  maximumDate?: Date;
};

export function DateField({ label, value, placeholder, onChange, maximumDate }: Props) {
  const [open, setOpen] = useState(false);
  const pickerValue = value ? parseIsoDate(value) : new Date();

  return (
    <View style={{ gap: spacing.sm }}>
      <SelectField
        label={label}
        value={value ? formatDisplayDate(value) : undefined}
        placeholder={placeholder}
        onPress={() => setOpen(true)}
      />
      {open && Platform.OS !== 'web' ? (
        <DateTimePicker
          value={pickerValue}
          mode="date"
          maximumDate={maximumDate}
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onValueChange={(_event, selected) => {
            if (selected) {
              const cap = maximumDate && selected > maximumDate ? maximumDate : selected;
              onChange(toIsoDate(cap));
            }
            if (Platform.OS !== 'ios') {
              setOpen(false);
            }
          }}
          onDismiss={() => setOpen(false)}
          onNeutralButtonPress={() => setOpen(false)}
        />
      ) : null}
      {Platform.OS === 'ios' && open ? (
        <Button label="Done" variant="secondary" onPress={() => setOpen(false)} />
      ) : null}
    </View>
  );
}
