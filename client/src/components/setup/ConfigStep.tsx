import React from 'react';
import {
  Text,
  Input,
  Label,
  makeStyles,
  tokens,
  MessageBar,
  MessageBarBody,
} from '@fluentui/react-components';
import { InfoRegular } from '@fluentui/react-icons';
import type { SourceType } from './SourceSelectStep';

const useStyles = makeStyles({
  root: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
  },
  fieldGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  row: {
    display: 'flex',
    gap: '12px',
  },
  ipField: { flex: 3 },
  portField: { flex: 1 },
  infoBox: {
    padding: '16px',
    background: tokens.colorNeutralBackground3,
    borderRadius: tokens.borderRadiusMedium,
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  urlBox: {
    fontFamily: 'monospace',
    fontSize: '13px',
    padding: '8px 12px',
    background: tokens.colorNeutralBackground1,
    borderRadius: tokens.borderRadiusSmall,
    border: `1px solid ${tokens.colorNeutralStroke1}`,
    color: tokens.colorBrandForeground1,
    wordBreak: 'break-all',
  },
  hint: {
    fontSize: '12px',
    color: tokens.colorNeutralForeground3,
  },
});

export interface SourceConfig {
  ip: string;
  port: string;
  meetingId: string;
}

interface Props {
  source: SourceType;
  config: SourceConfig;
  onChange: (config: SourceConfig) => void;
}

export const ConfigStep: React.FC<Props> = ({ source, config, onChange }) => {
  const styles = useStyles();
  const set = (key: keyof SourceConfig) => (e: React.ChangeEvent<HTMLInputElement>) =>
    onChange({ ...config, [key]: e.target.value });

  if (source === 'simulation') {
    return (
      <div className={styles.root}>
        <MessageBar intent="info">
          <MessageBarBody>
            Simulation mode requires no configuration. Channels will rotate automatically every 3 seconds.
          </MessageBarBody>
        </MessageBar>
      </div>
    );
  }

  if (source === 'scm820') {
    return (
      <div className={styles.root}>
        <Text size={300} style={{ color: tokens.colorNeutralForeground2 }}>
          Enter the network address of your Shure SCM820 mixer.
        </Text>
        <div className={styles.row}>
          <div className={`${styles.fieldGroup} ${styles.ipField}`}>
            <Label htmlFor="mixer-ip" required>Mixer IP address</Label>
            <Input
              id="mixer-ip"
              value={config.ip}
              onChange={set('ip')}
              placeholder="192.168.1.100"
            />
          </div>
          <div className={`${styles.fieldGroup} ${styles.portField}`}>
            <Label htmlFor="mixer-port">TCP port</Label>
            <Input
              id="mixer-port"
              value={config.port}
              onChange={set('port')}
              placeholder="2202"
            />
          </div>
        </div>
        <Text className={styles.hint}>
          The mixer must be on the same network. Default port is 2202.
        </Text>
      </div>
    );
  }

  if (source === 'zoom') {
    const webhookUrl = `${window.location.protocol}//${window.location.hostname}:3001/webhooks/zoom`;
    return (
      <div className={styles.root}>
        <Text size={300} style={{ color: tokens.colorNeutralForeground2 }}>
          Configure your Zoom App to send webhook events to this server.
        </Text>
        <div className={styles.infoBox}>
          <Text weight="semibold" size={200}>Webhook URL — paste this into your Zoom App</Text>
          <div className={styles.urlBox}>{webhookUrl}</div>
          <Text className={styles.hint}>
            In your Zoom App → Features → Webhooks, add this URL and subscribe to:
            meeting.participant_joined, meeting.participant_left, meeting.active_speaker
          </Text>
        </div>
        <div className={styles.fieldGroup}>
          <Label htmlFor="meeting-id">Meeting ID <span style={{ color: tokens.colorNeutralForeground3, fontSize: '12px' }}>(optional — leave blank to handle any meeting)</span></Label>
          <Input
            id="meeting-id"
            value={config.meetingId}
            onChange={set('meetingId')}
            placeholder="123 456 7890"
          />
        </div>
      </div>
    );
  }

  return null;
};
