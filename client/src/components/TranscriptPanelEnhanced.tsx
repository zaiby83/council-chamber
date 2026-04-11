import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  Text,
  Button,
  makeStyles,
  mergeClasses,
  tokens,
  Badge,
  MessageBar,
  MessageBarBody,
  Menu,
  MenuTrigger,
  MenuPopover,
  MenuList,
  MenuItem,
  Input,
  Tooltip,
} from '@fluentui/react-components';
import {
  MicRegular,
  RecordStopRegular,
  PauseRegular,
  PlayRegular,
  CopyRegular,
  ArrowDownloadRegular,
  SearchRegular,
  DismissRegular,
  ArrowAutofitHeightRegular,
} from '@fluentui/react-icons';
import { LANGUAGES } from './setup/ConfigStep';
import { useSettings } from '../contexts/SettingsContext';
import { useToast } from '../contexts/ToastContext';
import { exportAsText, exportAsJSON, exportAsSRT, exportAsHTML } from '../utils/exportTranscript';

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
    flexWrap: 'wrap',
  },
  toolbarTitle: {
    fontWeight: '700',
    flex: '1 1 auto',
    minWidth: '120px',
  },
  toolbarActions: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    flexWrap: 'wrap',
  },
  langSelect: {
    padding: '4px 8px',
    borderRadius: tokens.borderRadiusMedium,
    border: `1px solid ${tokens.colorNeutralStroke1}`,
    background: tokens.colorNeutralBackground1,
    fontSize: '13px',
    color: tokens.colorNeutralForeground1,
    cursor: 'pointer',
  },
  searchBar: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '8px 16px',
    background: tokens.colorNeutralBackground3,
    borderBottom: `1px solid ${tokens.colorNeutralStroke1}`,
  },
  entries: {
    flex: 1,
    overflowY: 'auto',
    padding: '12px 16px',
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  entriesCompact: {
    gap: '6px',
  },
  entriesSpacious: {
    gap: '16px',
  },
  entry: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
    padding: '10px 12px',
    borderRadius: tokens.borderRadiusMedium,
    background: tokens.colorNeutralBackground1,
    borderLeft: `3px solid ${tokens.colorBrandForeground1}`,
    transition: 'all 0.2s ease',
  },
  entryHighlight: {
    background: tokens.colorBrandBackground2,
    boxShadow: `0 0 0 2px ${tokens.colorBrandForeground1}`,
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
    flexWrap: 'wrap',
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
  pausedBanner: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '6px',
    background: tokens.colorPaletteYellowBackground1,
    color: tokens.colorPaletteYellowForeground2,
    fontSize: '12px',
    fontWeight: '600',
    gap: '6px',
    flexShrink: 0,
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
  paused: boolean;
  language: string;
  supported: boolean;
  micError: string;
  cityName: string;
  chamberName: string;
  onStart: () => void;
  onPause: () => void;
  onResume: () => void;
  onStop: () => void;
  onLanguageChange: (lang: string) => void;
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
  paused,
  language,
  supported,
  micError,
  cityName,
  chamberName,
  onStart,
  onPause,
  onResume,
  onStop,
  onLanguageChange,
}) => {
  const styles = useStyles();
  const { settings } = useSettings();
  const { showSuccess, showError } = useToast();
  const bottomRef = useRef<HTMLDivElement>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);

  useEffect(() => {
    if (settings.autoScroll) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [entries, interimText, settings.autoScroll]);

  const handleCopy = useCallback(() => {
    const text = entries
      .map((e) => `[${formatTime(e.timestamp)}] ${e.speaker}: ${e.text}`)
      .join('\n');
    navigator.clipboard.writeText(text);
    showSuccess('Copied to clipboard');
  }, [entries, showSuccess]);

  const handleExport = useCallback((format: 'text' | 'json' | 'srt' | 'html') => {
    try {
      switch (format) {
        case 'text':
          exportAsText(entries);
          break;
        case 'json':
          exportAsJSON(entries);
          break;
        case 'srt':
          exportAsSRT(entries);
          break;
        case 'html':
          exportAsHTML(entries, cityName, chamberName);
          break;
      }
      showSuccess('Transcript exported');
    } catch (error) {
      showError('Export failed', (error as Error).message);
    }
  }, [entries, cityName, chamberName, showSuccess, showError]);

  const filteredEntries = searchQuery
    ? entries.filter(
        (e) =>
          e.text.toLowerCase().includes(searchQuery.toLowerCase()) ||
          e.speaker.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : entries;

  const densityClass =
    settings.transcriptDensity === 'compact'
      ? styles.entriesCompact
      : settings.transcriptDensity === 'spacious'
      ? styles.entriesSpacious
      : '';

  return (
    <div className={styles.panel}>
      <div className={styles.toolbar}>
        <Text className={styles.toolbarTitle} size={400}>
          Live Transcript
        </Text>

        <div className={styles.toolbarActions}>
          <Badge className={styles.adaBadge} appearance="tint" color="informative">
            ADA Compliant
          </Badge>

          <select
            className={styles.langSelect}
            value={language}
            disabled={running && !paused}
            onChange={(e) => onLanguageChange(e.target.value)}
            title="Transcription language"
            aria-label="Select transcription language"
          >
            {LANGUAGES.map((l) => (
              <option key={l.code} value={l.code}>
                {l.label}
              </option>
            ))}
          </select>

          <Tooltip content="Search transcript" relationship="label">
            <Button
              icon={<SearchRegular />}
              appearance="subtle"
              size="small"
              onClick={() => setShowSearch(!showSearch)}
              aria-label="Search transcript"
            />
          </Tooltip>

          <Tooltip content="Toggle auto-scroll" relationship="label">
            <Button
              icon={<ArrowAutofitHeightRegular />}
              appearance={settings.autoScroll ? 'primary' : 'subtle'}
              size="small"
              onClick={() => settings.autoScroll && bottomRef.current?.scrollIntoView({ behavior: 'smooth' })}
              aria-label="Scroll to bottom"
            />
          </Tooltip>

          <Tooltip content="Copy transcript" relationship="label">
            <Button
              icon={<CopyRegular />}
              appearance="subtle"
              size="small"
              onClick={handleCopy}
              disabled={entries.length === 0}
              aria-label="Copy transcript to clipboard"
            />
          </Tooltip>

          <Menu>
            <MenuTrigger disableButtonEnhancement>
              <Tooltip content="Export transcript" relationship="label">
                <Button
                  icon={<ArrowDownloadRegular />}
                  appearance="subtle"
                  size="small"
                  disabled={entries.length === 0}
                  aria-label="Export transcript"
                />
              </Tooltip>
            </MenuTrigger>
            <MenuPopover>
              <MenuList>
                <MenuItem onClick={() => handleExport('text')}>Export as Text (.txt)</MenuItem>
                <MenuItem onClick={() => handleExport('html')}>Export as HTML (.html)</MenuItem>
                <MenuItem onClick={() => handleExport('srt')}>Export as Subtitles (.srt)</MenuItem>
                <MenuItem onClick={() => handleExport('json')}>Export as JSON (.json)</MenuItem>
              </MenuList>
            </MenuPopover>
          </Menu>

          {!running && !paused && (
            <Button
              icon={<MicRegular />}
              appearance="primary"
              size="small"
              onClick={onStart}
              disabled={!supported}
              title={!supported ? 'Speech recognition not supported in this browser' : undefined}
              aria-label="Start transcription"
            >
              Start
            </Button>
          )}

          {running && !paused && (
            <Button
              icon={<PauseRegular />}
              appearance="primary"
              size="small"
              onClick={onPause}
              style={{ background: tokens.colorPaletteYellowBackground3, color: '#000' }}
              aria-label="Pause transcription"
            >
              Pause
            </Button>
          )}

          {paused && (
            <>
              <Button
                icon={<PlayRegular />}
                appearance="primary"
                size="small"
                onClick={onResume}
                style={{ background: tokens.colorPaletteGreenBackground3 }}
                aria-label="Resume transcription"
              >
                Resume
              </Button>
              <Button
                icon={<RecordStopRegular />}
                appearance="subtle"
                size="small"
                onClick={onStop}
                style={{ color: tokens.colorPaletteRedForeground1 }}
                aria-label="Stop transcription"
              >
                Stop
              </Button>
            </>
          )}
        </div>
      </div>

      {showSearch && (
        <div className={styles.searchBar}>
          <SearchRegular />
          <Input
            placeholder="Search transcript..."
            value={searchQuery}
            onChange={(_, data) => setSearchQuery(data.value)}
            style={{ flex: 1 }}
            aria-label="Search transcript"
          />
          {searchQuery && (
            <Button
              icon={<DismissRegular />}
              appearance="subtle"
              size="small"
              onClick={() => setSearchQuery('')}
              aria-label="Clear search"
            />
          )}
          <Text size={200}>
            {filteredEntries.length} of {entries.length}
          </Text>
        </div>
      )}

      {!supported && (
        <MessageBar intent="warning">
          <MessageBarBody>
            Speech recognition is not supported in this browser. Use Chrome or Edge for live
            transcription.
          </MessageBarBody>
        </MessageBar>
      )}
      {micError && (
        <MessageBar intent="error">
          <MessageBarBody>{micError}</MessageBarBody>
        </MessageBar>
      )}

      {paused && (
        <div className={styles.pausedBanner} role="status" aria-live="polite">
          <PauseRegular aria-hidden="true" />
          Transcription paused — press Resume to continue
        </div>
      )}

      <div className={mergeClasses(styles.entries, densityClass)} role="log" aria-live="polite" aria-atomic="false">
        {entries.length === 0 && !interimText && (
          <div className={styles.empty}>
            <MicRegular style={{ fontSize: '40px', opacity: 0.3 }} aria-hidden="true" />
            <Text>No transcript yet.</Text>
            <Text size={200}>Press "Start" to begin live captioning.</Text>
          </div>
        )}

        {filteredEntries.map((entry) => (
          <div
            key={entry.id}
            className={mergeClasses(
              styles.entry,
              searchQuery &&
                (entry.text.toLowerCase().includes(searchQuery.toLowerCase()) ||
                  entry.speaker.toLowerCase().includes(searchQuery.toLowerCase())) &&
                styles.entryHighlight
            )}
          >
            <div className={styles.entryHeader}>
              <span className={styles.speaker}>{entry.speaker}</span>
              {entry.speakerTitle && <span className={styles.speakerTitle}>{entry.speakerTitle}</span>}
              <span className={styles.time}>{formatTime(entry.timestamp)}</span>
            </div>
            <Text className={styles.text}>{entry.text}</Text>
          </div>
        ))}

        {interimText && (
          <div className={mergeClasses(styles.entry, styles.interimEntry)}>
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
