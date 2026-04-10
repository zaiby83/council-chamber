import React from 'react';
import {
  Card,
  CardHeader,
  Text,
  Badge,
  Button,
  makeStyles,
  tokens,
  Tooltip,
} from '@fluentui/react-components';
import {
  MicRegular,
  MicOffRegular,
  PersonRegular,
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
  avatar: {
    width: '40px',
    height: '40px',
    borderRadius: '50%',
    background: tokens.colorBrandBackground1,
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
}

export const CouncilMemberCard: React.FC<Props> = ({ state, onMuteToggle }) => {
  const styles = useStyles();
  const initials = state.name
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('');

  return (
    <Card
      className={[
        styles.card,
        state.active ? styles.cardActive : '',
        state.muted ? styles.cardMuted : '',
      ].join(' ')}
      style={{ padding: '12px' }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <div className={`${styles.avatar} ${state.active ? styles.avatarActive : ''}`}>
          {initials}
        </div>
        <div className={styles.info}>
          <Text className={styles.name} size={300}>{state.name}</Text>
          <span className={styles.title}>{state.title}</span>
        </div>
        <Tooltip content={state.muted ? 'Unmute' : 'Mute'} relationship="label">
          <Button
            icon={state.muted ? <MicOffRegular /> : <MicRegular />}
            appearance="subtle"
            size="small"
            onClick={() => onMuteToggle(state.channel, !state.muted)}
            style={{ color: state.muted ? 'red' : undefined }}
          />
        </Tooltip>
      </div>

      <div className={styles.footer}>
        <div className={styles.level}>
          <div
            className={`${styles.levelBar} ${state.active ? styles.levelBarActive : ''}`}
            style={{ width: `${Math.min(state.level, 100)}%` }}
          />
        </div>
        <Badge
          className={styles.chBadge}
          appearance="outline"
          size="small"
        >
          CH {state.channel}
        </Badge>
      </div>

      {state.active && (
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
