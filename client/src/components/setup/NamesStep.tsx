import React from 'react';
import {
  Text,
  Input,
  Label,
  makeStyles,
  tokens,
  Badge,
} from '@fluentui/react-components';

const useStyles = makeStyles({
  root: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  table: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  row: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '10px 12px',
    background: tokens.colorNeutralBackground3,
    borderRadius: tokens.borderRadiusMedium,
  },
  chBadge: {
    flexShrink: 0,
    width: '44px',
    justifyContent: 'center',
  },
  nameField: { flex: 2 },
  titleField: { flex: 1 },
  colHeaders: {
    display: 'flex',
    gap: '12px',
    paddingLeft: '56px',
    paddingRight: '12px',
  },
  colLabel: {
    fontSize: '11px',
    fontWeight: '600',
    color: tokens.colorNeutralForeground3,
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
  },
});

export interface MemberEntry {
  name: string;
  title: string;
}

interface Props {
  members: Record<number, MemberEntry>;
  onChange: (members: Record<number, MemberEntry>) => void;
}

export const NamesStep: React.FC<Props> = ({ members, onChange }) => {
  const styles = useStyles();

  const setField = (ch: number, field: keyof MemberEntry, value: string) => {
    onChange({ ...members, [ch]: { ...members[ch], [field]: value } });
  };

  return (
    <div className={styles.root}>
      <Text size={300} style={{ color: tokens.colorNeutralForeground2 }}>
        Set a name and role for each channel. These will be shown on the live dashboard
        and attributed in the transcript.
      </Text>

      <div className={styles.colHeaders}>
        <Text className={`${styles.colLabel} ${styles.nameField}`}>Name</Text>
        <Text className={`${styles.colLabel} ${styles.titleField}`}>Role / Title</Text>
      </div>

      <div className={styles.table}>
        {Array.from({ length: 8 }, (_, i) => i + 1).map((ch) => (
          <div key={ch} className={styles.row}>
            <Badge className={styles.chBadge} appearance="outline" size="medium">
              CH {ch}
            </Badge>
            <div className={styles.nameField}>
              <Input
                size="small"
                value={members[ch]?.name ?? ''}
                onChange={(_, d) => setField(ch, 'name', d.value)}
                placeholder={`Channel ${ch}`}
              />
            </div>
            <div className={styles.titleField}>
              <Input
                size="small"
                value={members[ch]?.title ?? ''}
                onChange={(_, d) => setField(ch, 'title', d.value)}
                placeholder="e.g. Mayor"
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
