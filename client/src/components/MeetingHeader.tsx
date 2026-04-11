import React from 'react';
import {
  Button,
  makeStyles,
  mergeClasses,
} from '@fluentui/react-components';
import { MicRegular, ArrowResetRegular, WeatherMoonRegular, WeatherSunnyRegular, SettingsRegular } from '@fluentui/react-icons';
import { useTheme } from '../contexts/ThemeContext';

const useStyles = makeStyles({
  header: {
    background: `linear-gradient(135deg, #0f4c81 0%, #1565c0 100%)`,
    color: '#fff',
    padding: '16px 24px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    boxShadow: '0 2px 8px rgba(0,0,0,0.25)',
  },
  left: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
  },
  cityName: {
    fontSize: '13px',
    opacity: 0.85,
    fontWeight: '400',
    letterSpacing: '0.05em',
    textTransform: 'uppercase',
  },
  chamberName: {
    fontSize: '22px',
    fontWeight: '700',
    letterSpacing: '-0.01em',
  },
  right: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  statusBadge: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '6px 12px',
    borderRadius: '20px',
    fontSize: '13px',
    fontWeight: '600',
  },
  liveStatus: {
    background: 'rgba(255,255,255,0.15)',
    backdropFilter: 'blur(4px)',
  },
  dot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    display: 'inline-block',
  },
  dotLive: {
    background: '#4caf50',
    boxShadow: '0 0 6px #4caf50',
    animationName: {
      '0%': { opacity: 1 },
      '50%': { opacity: 0.5 },
      '100%': { opacity: 1 },
    },
    animationDuration: '1.5s',
    animationIterationCount: 'infinite',
  },
  dotOff: {
    background: '#999',
  },
  time: {
    fontSize: '13px',
    opacity: 0.8,
    fontVariantNumeric: 'tabular-nums',
  },
});

interface Props {
  cityName: string;
  chamberName: string;
  transcriptionRunning: boolean;
  mixerConnected: boolean;
  onNewMeeting: () => void;
  onSettingsClick: () => void;
}

export const MeetingHeader: React.FC<Props> = ({
  cityName,
  chamberName,
  transcriptionRunning,
  mixerConnected,
  onNewMeeting,
  onSettingsClick,
}) => {
  const styles = useStyles();
  const { mode, toggleTheme } = useTheme();
  const [time, setTime] = React.useState(new Date());

  React.useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  return (
    <header className={styles.header} role="banner">
      <div className={styles.left}>
        <span className={styles.cityName}>{cityName}</span>
        <span className={styles.chamberName}>{chamberName}</span>
      </div>
      <div className={styles.right}>
        <span className={styles.time} aria-live="off">
          {time.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
        </span>
        <div 
          className={mergeClasses(styles.statusBadge, styles.liveStatus)}
          role="status"
          aria-label={mixerConnected ? 'Mixer connected' : 'Mixer offline'}
        >
          <span 
            className={mergeClasses(styles.dot, mixerConnected ? styles.dotLive : styles.dotOff)}
            aria-hidden="true"
          />
          {mixerConnected ? 'Mixer Connected' : 'Mixer Offline'}
        </div>
        {transcriptionRunning && (
          <div 
            className={mergeClasses(styles.statusBadge, styles.liveStatus)}
            role="status"
            aria-label="Live transcription active"
          >
            <MicRegular style={{ fontSize: '16px' }} aria-hidden="true" />
            Live Transcript
          </div>
        )}
        <Button
          icon={mode === 'dark' ? <WeatherSunnyRegular /> : <WeatherMoonRegular />}
          appearance="subtle"
          size="small"
          onClick={toggleTheme}
          style={{ color: 'rgba(255,255,255,0.75)' }}
          title={mode === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          aria-label={mode === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
        />
        <Button
          icon={<SettingsRegular />}
          appearance="subtle"
          size="small"
          onClick={onSettingsClick}
          style={{ color: 'rgba(255,255,255,0.75)' }}
          title="Settings"
          aria-label="Open settings"
        />
        <Button
          icon={<ArrowResetRegular />}
          appearance="subtle"
          size="small"
          onClick={onNewMeeting}
          style={{ color: 'rgba(255,255,255,0.75)' }}
          title="New meeting"
          aria-label="Start new meeting"
        />
      </div>
    </header>
  );
};
