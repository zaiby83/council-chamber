import React, { useEffect, useRef } from 'react';
import {
  Text,
  Button,
  makeStyles,
  tokens,
  Badge,
  Divider,
} from '@fluentui/react-components';
import {
  MicRegular,
  RecordStopRegular,
  CopyRegular,
  ArrowDownRegular,
} from '@fluentui/react-icons';

const useStyles = makeStyles({
  panel: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    background: tokens.colorNeutralBackground2,
    borderRadius: tokens.borderRadiusLarge,
    overflow: 'hidden',
  },
  toolbar: {
    display: 'flex',
    alignItems: 'center',
    padding: '10px 16px',
    gap: '8px',
    borderBottom: `1px solid ${tokens.colorNeutralStroke1}`,
    background: tokens.colorNeutralBackground1,
    flexShrink: 0,
  },
  toolbarTitle: {
    fontWeight: '700',
    flex: 1,
  },
  entries: {
    flex: 1,
    overflowY: 'auto',
    padding: '12px 16px',
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  entry: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
    padding: '10px 12px',
    borderRadius: tokens.borderRadiusMedium,
    background: tokens.colorNeutralBackground1,
    borderLeft: `3px solid ${tokens.colorBrandForeground1}`,
    animation: 'fadeIn 0.2s ease',
  },
  interimEntry: {
    borderLeft: `3px solid ${tokens.colorNeutralStroke1}`,
    opacity: 0.7,
    fontStyle: 'italic',
  },
  entryHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  speaker: {
    fontWeight: '600',
    fontSize: '13px',
    color: tokens.colorBrandForeground1,
  },
  speakerTitle: {
    fontSize: '11px',
    color: tokens.colorNeutralForeground3,
  },
  time: {
    marginLeft: 'auto',
    fontSize: '11px',
    color: tokens.colorNeutralForeground3,
    fontVariantNumeric: 'tabular-nums',
  },
  text: {
    fontSize: '14px',
    lineHeight: '1.5',
    color: tokens.colorNeutralForeground1,
  },
  empty: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    color: tokens.colorNeutralForeground3,
    gap: '8px',
    textAlign: 'center',
    padding: '40px',
  },
  adaBadge: {
    fontSize: '10px',
  },
});

export interface TranscriptEntry {
  id: string;
  text: string;
  speaker: string;
  speakerTitle: string;
  timestamp: string;
  isFinal: boolean;
}

interface Props {
  entries: TranscriptEntry[];
  interimText: string;
  interimSpeaker: string;
  running: boolean;
  onStart: () => void;
  onStop: () => void;
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

export const TranscriptPanel: React.FC<Props> = ({
  entries,
  interimText,
  interimSpeaker,
  running,
  onStart,
  onStop,
}) => {
  const styles = useStyles();
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [entries, interimText]);

  const handleCopy = () => {
    const text = entries
      .map((e) => `[${formatTime(e.timestamp)}] ${e.speaker}: ${e.text}`)
      .join('\n');
    navigator.clipboard.writeText(text);
  };

  return (
    <div className={styles.panel}>
      <div className={styles.toolbar}>
        <Text className={styles.toolbarTitle} size={400}>
          Live Transcript
        </Text>
        <Badge className={styles.adaBadge} appearance="tint" color="informative">
          ADA Compliant
        </Badge>
        <Button
          icon={<CopyRegular />}
          appearance="subtle"
          size="small"
          onClick={handleCopy}
          disabled={entries.length === 0}
          title="Copy transcript"
        />
        {running ? (
          <Button
            icon={<RecordStopRegular />}
            appearance="primary"
            size="small"
            onClick={onStop}
            style={{ background: '#d32f2f' }}
          >
            Stop
          </Button>
        ) : (
          <Button
            icon={<MicRegular />}
            appearance="primary"
            size="small"
            onClick={onStart}
          >
            Start Transcription
          </Button>
        )}
      </div>

      <div className={styles.entries}>
        {entries.length === 0 && !interimText && (
          <div className={styles.empty}>
            <MicRegular style={{ fontSize: '40px', opacity: 0.3 }} />
            <Text>No transcript yet.</Text>
            <Text size={200}>Press "Start Transcription" to begin live captioning.</Text>
          </div>
        )}

        {entries.map((entry) => (
          <div key={entry.id} className={styles.entry}>
            <div className={styles.entryHeader}>
              <span className={styles.speaker}>{entry.speaker}</span>
              {entry.speakerTitle && (
                <span className={styles.speakerTitle}>{entry.speakerTitle}</span>
              )}
              <span className={styles.time}>{formatTime(entry.timestamp)}</span>
            </div>
            <Text className={styles.text}>{entry.text}</Text>
          </div>
        ))}

        {interimText && (
          <div className={`${styles.entry} ${styles.interimEntry}`}>
            <div className={styles.entryHeader}>
              <span className={styles.speaker}>{interimSpeaker || 'Speaking...'}</span>
            </div>
            <Text className={styles.text}>{interimText}</Text>
          </div>
        )}

        <div ref={bottomRef} />
      </div>
    </div>
  );
};
