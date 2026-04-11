import React from 'react';
import {
  Card,
  Text,
  Badge,
  Button,
  Input,
  makeStyles,
  mergeClasses,
  tokens,
  Tooltip,
  Label,
} from '@fluentui/react-components';
import {
  MicRegular,
  MicOffRegular,
} from '@fluentui/react-icons';

const useStyles = makeStyles({
  card: {
    transition: 'all 0.2s ease',
    border: `2px solid transparent`,
    cursor: 'default',
    userSelect: 'none',
  },
  cardActive: {
    border: `2px solid ${tokens.colorBrandForeground1}`,
    boxShadow: `0 0 0 4px ${tokens.colorBrandBackground2}`,
    background: tokens.colorBrandBackground2,
  },
  cardMuted: {
    opacity: 0.55,
  },
  cardEdit: {
    border: `2px solid ${tokens.colorNeutralStroke1}`,
  },
  avatar: {
    width: '40px',
    height: '40px',
    borderRadius: '50%',
    background: tokens.colorBrandBackground,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#fff',
    fontSize: '18px',
    flexShrink: 0,
  },
  avatarActive: {
    background: tokens.colorBrandForeground1,
    boxShadow: `0 0 12px ${tokens.colorBrandForeground1}`,
  },
  info: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
    flex: 1,
    minWidth: 0,
  },
  name: {
    fontWeight: '600',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  title: {
    fontSize: '11px',
    color: tokens.colorNeutralForeground3,
    whiteSpace: 'nowrap',
  },
  footer: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: '8px',
  },
  level: {
    flex: 1,
    height: '4px',
    borderRadius: '2px',
    background: tokens.colorNeutralBackground4,
    overflow: 'hidden',
    marginRight: '8px',
  },
  levelBar: {
    height: '100%',
    borderRadius: '2px',
    background: tokens.colorBrandForeground1,
    transition: 'width 0.1s ease',
  },
  levelBarActive: {
    background: '#4caf50',
  },
  chBadge: {
    fontSize: '10px',
    minWidth: '20px',
  },
  editFields: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    marginTop: '8px',
  },
  fieldRow: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
  },
  fieldLabel: {
    fontSize: '11px',
    color: tokens.colorNeutralForeground3,
  },
});

interface ChannelState {
  channel: number;
  name: string;
  title: string;
  muted: boolean;
  gateOpen: boolean;
  level: number;
  active: boolean;
}

interface Props {
  state: ChannelState;
  onMuteToggle: (channel: number, muted: boolean) => void;
  editMode?: boolean;
  draft?: { name: string; title: string };
  onDraftChange?: (field: 'name' | 'title', value: string) => void;
}

export const CouncilMemberCard: React.FC<Props> = ({
  state,
  onMuteToggle,
  editMode = false,
  draft,
  onDraftChange,
}) => {
  const styles = useStyles();
  const displayName = editMode && draft ? draft.name : state.name;
  const initials = displayName
    .split(' ')
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('');

  const cardClass = mergeClasses(
    styles.card,
    editMode && styles.cardEdit,
    !editMode && state.active && styles.cardActive,
    !editMode && state.muted && styles.cardMuted,
  );

  return (
    <Card className={cardClass} style={{ padding: '12px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <div className={mergeClasses(styles.avatar, !editMode && state.active && styles.avatarActive)}>
          {initials}
        </div>
        <div className={styles.info}>
          <Text className={styles.name} size={300}>{displayName}</Text>
          <span className={styles.title}>{editMode && draft ? draft.title : state.title}</span>
        </div>
        {!editMode && (
          <Tooltip content={state.muted ? 'Unmute' : 'Mute'} relationship="label">
            <Button
              icon={state.muted ? <MicOffRegular /> : <MicRegular />}
              appearance="subtle"
              size="small"
              onClick={() => onMuteToggle(state.channel, !state.muted)}
              style={{ color: state.muted ? 'red' : undefined }}
            />
          </Tooltip>
        )}
        <Badge className={styles.chBadge} appearance="outline" size="small">
          CH {state.channel}
        </Badge>
      </div>

      {editMode && onDraftChange && (
        <div className={styles.editFields}>
          <div className={styles.fieldRow}>
            <Label className={styles.fieldLabel}>Name</Label>
            <Input
              size="small"
              value={draft?.name ?? state.name}
              onChange={(_, d) => onDraftChange('name', d.value)}
              placeholder="Full name"
            />
          </div>
          <div className={styles.fieldRow}>
            <Label className={styles.fieldLabel}>Title</Label>
            <Input
              size="small"
              value={draft?.title ?? state.title}
              onChange={(_, d) => onDraftChange('title', d.value)}
              placeholder="e.g. Mayor, Council Member"
            />
          </div>
        </div>
      )}

      {!editMode && (
        <div className={styles.footer}>
          <div className={styles.level}>
            <div
              className={mergeClasses(styles.levelBar, state.active && styles.levelBarActive)}
              style={{ width: `${Math.min(state.level, 100)}%` }}
            />
          </div>
        </div>
      )}

      {!editMode && state.active && (
        <Badge
          appearance="filled"
          color="success"
          size="small"
          style={{ marginTop: '6px', width: 'fit-content' }}
        >
          SPEAKING
        </Badge>
      )}
    </Card>
  );
};
