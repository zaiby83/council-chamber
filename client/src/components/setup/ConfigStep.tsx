import React from 'react';
import {
  Text,
  Input,
  Label,
  makeStyles,
  tokens,
  MessageBar,
  MessageBarBody,
  Divider,
} from '@fluentui/react-components';
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
  select: {
    width: '100%',
    padding: '6px 8px',
    borderRadius: tokens.borderRadiusMedium,
    border: `1px solid ${tokens.colorNeutralStroke1}`,
    background: tokens.colorNeutralBackground1,
    fontSize: '14px',
    color: tokens.colorNeutralForeground1,
  },
  sectionTitle: {
    fontWeight: '600',
    fontSize: '13px',
    color: tokens.colorNeutralForeground2,
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
  },
});

export const LANGUAGES = [
  { code: 'en-US', label: 'English (US)' },
  { code: 'en-GB', label: 'English (UK)' },
  { code: 'ur-IN', label: 'Urdu (Azure only — use ur-IN locale)' },
  { code: 'es-US', label: 'Spanish (US)' },
  { code: 'es-MX', label: 'Spanish (Mexico)' },
  { code: 'ar-SA', label: 'Arabic' },
  { code: 'zh-CN', label: 'Mandarin (Simplified)' },
  { code: 'fr-FR', label: 'French' },
  { code: 'fil-PH', label: 'Filipino / Tagalog' },
  { code: 'vi-VN', label: 'Vietnamese' },
  { code: 'ko-KR', label: 'Korean' },
  { code: 'ja-JP', label: 'Japanese' },
  { code: 'hi-IN', label: 'Hindi' },
  { code: 'pt-BR', label: 'Portuguese (Brazil)' },
];

export type TranscriptionProvider = 'browser' | 'azure';

export interface SourceConfig {
  ip: string;
  port: string;
  meetingId: string;
  language: string;
  transcriptionProvider: TranscriptionProvider;
  azureKey: string;
  azureRegion: string;
}

interface Props {
  source: SourceType;
  config: SourceConfig;
  onChange: (config: SourceConfig) => void;
}

export const ConfigStep: React.FC<Props> = ({ source, config, onChange }) => {
  const styles = useStyles();
  const set = (key: keyof SourceConfig) => (val: string) =>
    onChange({ ...config, [key]: val });
  const setInput = (key: keyof SourceConfig) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    set(key)(e.target.value);

  const transcriptionSection = (
    <>
      <Divider />
      <Text className={styles.sectionTitle}>Transcription</Text>

      <div className={styles.fieldGroup}>
        <Label htmlFor="t-provider">Provider</Label>
        <select
          id="t-provider"
          className={styles.select}
          value={config.transcriptionProvider}
          onChange={setInput('transcriptionProvider')}
        >
          <option value="browser">Browser — free, no key needed (Chrome / Edge)</option>
          <option value="azure">Azure Cognitive Speech</option>
        </select>
      </div>

      {config.transcriptionProvider === 'azure' && (
        <>
          <div className={styles.fieldGroup}>
            <Label htmlFor="az-key" required>Azure Speech Key</Label>
            <Input
              id="az-key"
              type="password"
              value={config.azureKey}
              onChange={setInput('azureKey')}
              placeholder="Paste your Azure Speech key"
            />
          </div>
          <div className={styles.fieldGroup}>
            <Label htmlFor="az-region">Region</Label>
            <Input
              id="az-region"
              value={config.azureRegion}
              onChange={setInput('azureRegion')}
              placeholder="e.g. westus2"
            />
          </div>
        </>
      )}

      <div className={styles.fieldGroup}>
        <Label htmlFor="t-lang">Language</Label>
        <select
          id="t-lang"
          className={styles.select}
          value={config.language}
          onChange={setInput('language')}
        >
          {LANGUAGES.map((l) => (
            <option key={l.code} value={l.code}>{l.label}</option>
          ))}
        </select>
      </div>

      {config.transcriptionProvider === 'browser' && config.language !== 'en-US' && config.language !== 'en-GB' && (
        <MessageBar intent="warning">
          <MessageBarBody>
            Chrome's built-in speech engine has limited support for non-English languages. For reliable Urdu, Arabic, or other language transcription, switch the provider to <strong>Azure Cognitive Speech</strong>.
          </MessageBarBody>
        </MessageBar>
      )}
    </>
  );

  if (source === 'simulation') {
    return (
      <div className={styles.root}>
        <MessageBar intent="info">
          <MessageBarBody>
            Simulation mode rotates speakers automatically — no mixer needed.
          </MessageBarBody>
        </MessageBar>
        {transcriptionSection}
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
              onChange={setInput('ip')}
              placeholder="192.168.1.100"
            />
          </div>
          <div className={`${styles.fieldGroup} ${styles.portField}`}>
            <Label htmlFor="mixer-port">TCP port</Label>
            <Input
              id="mixer-port"
              value={config.port}
              onChange={setInput('port')}
              placeholder="2202"
            />
          </div>
        </div>
        {transcriptionSection}
      </div>
    );
  }

  if (source === 'zoom') {
    const webhookUrl = `${window.location.protocol}//${window.location.hostname}:3001/webhooks/zoom`;
    return (
      <div className={styles.root}>
        <div className={styles.infoBox}>
          <Text weight="semibold" size={200}>Webhook URL — paste into your Zoom App</Text>
          <div className={styles.urlBox}>{webhookUrl}</div>
          <Text className={styles.hint}>
            Zoom App → Features → Webhooks: subscribe to participant_joined, participant_left, active_speaker
          </Text>
        </div>
        <div className={styles.fieldGroup}>
          <Label htmlFor="meeting-id">
            Meeting ID{' '}
            <span style={{ color: tokens.colorNeutralForeground3, fontSize: '12px' }}>
              (optional)
            </span>
          </Label>
          <Input
            id="meeting-id"
            value={config.meetingId}
            onChange={setInput('meetingId')}
            placeholder="123 456 7890"
          />
        </div>
        {transcriptionSection}
      </div>
    );
  }

  return null;
};
