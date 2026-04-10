import React from 'react';
import {
  Text,
  makeStyles,
  tokens,
  Divider,
} from '@fluentui/react-components';
import { CouncilMemberCard } from './CouncilMemberCard';

const useStyles = makeStyles({
  panel: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    padding: '16px',
    background: tokens.colorNeutralBackground2,
    borderRadius: tokens.borderRadiusLarge,
    height: '100%',
    overflowY: 'auto',
  },
  sectionTitle: {
    fontWeight: '600',
    color: tokens.colorNeutralForeground2,
    fontSize: '12px',
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
    gap: '10px',
  },
  noMixer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '40px',
    color: tokens.colorNeutralForeground3,
    gap: '8px',
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
  channels: ChannelState[];
  mixerConnected: boolean;
  onMuteToggle: (channel: number, muted: boolean) => void;
}

export const MixerPanel: React.FC<Props> = ({ channels, mixerConnected, onMuteToggle }) => {
  const styles = useStyles();

  const council = channels.filter((c) => c.channel <= 5);
  const staff = channels.filter((c) => c.channel > 5);

  return (
    <div className={styles.panel}>
      <Text className={styles.sectionTitle}>Council Members</Text>
      <div className={styles.grid}>
        {council.map((ch) => (
          <CouncilMemberCard key={ch.channel} state={ch} onMuteToggle={onMuteToggle} />
        ))}
      </div>

      <Divider />

      <Text className={styles.sectionTitle}>Staff</Text>
      <div className={styles.grid}>
        {staff.map((ch) => (
          <CouncilMemberCard key={ch.channel} state={ch} onMuteToggle={onMuteToggle} />
        ))}
      </div>
    </div>
  );
};
