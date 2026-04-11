import React from 'react';
import {
  Text,
  Card,
  makeStyles,
  tokens,
} from '@fluentui/react-components';
import {
  PlugConnectedRegular,
  VideoRegular,
  PlayRegular,
} from '@fluentui/react-icons';

const useStyles = makeStyles({
  root: {
    display: 'flex',
    flexDirection: 'column',
    gap: '24px',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '16px',
  },
  card: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '12px',
    padding: '28px 20px',
    cursor: 'pointer',
    border: `2px solid transparent`,
    transition: 'all 0.15s ease',
    ':hover': {
      border: `2px solid ${tokens.colorNeutralStroke1Hover}`,
      background: tokens.colorNeutralBackground1Hover,
    },
  },
  cardSelected: {
    border: `2px solid ${tokens.colorBrandForeground1}`,
    background: tokens.colorBrandBackground2,
  },
  iconWrap: {
    width: '56px',
    height: '56px',
    borderRadius: '50%',
    background: tokens.colorNeutralBackground4,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '26px',
    color: tokens.colorNeutralForeground2,
  },
  iconWrapSelected: {
    background: tokens.colorBrandBackground,
    color: '#fff',
  },
  label: {
    fontWeight: '700',
    fontSize: '15px',
  },
  desc: {
    fontSize: '12px',
    color: tokens.colorNeutralForeground3,
    textAlign: 'center',
    lineHeight: '1.5',
  },
});

const SOURCES = [
  {
    id: 'scm820' as const,
    label: 'Shure SCM820',
    icon: <PlugConnectedRegular />,
    desc: 'Hardware automatic mixer over TCP. Used in physical council chambers.',
  },
  {
    id: 'zoom' as const,
    label: 'Zoom Meeting',
    icon: <VideoRegular />,
    desc: 'Remote or hybrid meeting. Tracks speakers via Zoom webhooks.',
  },
  {
    id: 'simulation' as const,
    label: 'Simulation',
    icon: <PlayRegular />,
    desc: 'No hardware needed. Rotates speakers automatically for demos and testing.',
  },
];

export type SourceType = 'scm820' | 'zoom' | 'simulation';

interface Props {
  selected: SourceType;
  onChange: (src: SourceType) => void;
}

export const SourceSelectStep: React.FC<Props> = ({ selected, onChange }) => {
  const styles = useStyles();
  
  const handleKeyDown = (e: React.KeyboardEvent, sourceId: SourceType) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onChange(sourceId);
    }
  };

  return (
    <div className={styles.root}>
      <Text size={300} style={{ color: tokens.colorNeutralForeground2 }}>
        Choose how this session will capture audio and track speakers.
      </Text>
      <div className={styles.grid} role="radiogroup" aria-label="Audio source selection">
        {SOURCES.map((s) => (
          <Card
            key={s.id}
            className={`${styles.card} ${selected === s.id ? styles.cardSelected : ''}`}
            onClick={() => onChange(s.id)}
            onKeyDown={(e) => handleKeyDown(e, s.id)}
            tabIndex={0}
            role="radio"
            aria-checked={selected === s.id}
            aria-label={`${s.label}: ${s.desc}`}
          >
            <div className={`${styles.iconWrap} ${selected === s.id ? styles.iconWrapSelected : ''}`} aria-hidden="true">
              {s.icon}
            </div>
            <Text className={styles.label}>{s.label}</Text>
            <Text className={styles.desc}>{s.desc}</Text>
          </Card>
        ))}
      </div>
    </div>
  );
};
