import React, { useCallback, useEffect, useState } from 'react';
import {
  Text,
  Button,
  Spinner,
  makeStyles,
  tokens,
  Divider,
} from '@fluentui/react-components';
import {
  ArrowRightRegular,
  ArrowLeftRegular,
  CheckmarkCircleRegular,
} from '@fluentui/react-icons';
import { SourceSelectStep, SourceType } from './SourceSelectStep';
import { ConfigStep, SourceConfig } from './ConfigStep';
import { NamesStep, MemberEntry } from './NamesStep';
import { useWebSocket } from '../../hooks/useWebSocket';

const WS_URL = `ws://${window.location.hostname}:3001`;
const API_URL = '';

const useStyles = makeStyles({
  overlay: {
    position: 'fixed',
    inset: 0,
    background: tokens.colorNeutralBackground2,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 100,
  },
  card: {
    background: tokens.colorNeutralBackground1,
    borderRadius: tokens.borderRadiusXLarge,
    boxShadow: tokens.shadow64,
    width: '680px',
    maxWidth: '95vw',
    maxHeight: '90vh',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  },
  header: {
    padding: '28px 32px 20px',
    background: `linear-gradient(135deg, #0f4c81 0%, #1565c0 100%)`,
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  headerSub: {
    fontSize: '13px',
    color: 'rgba(255,255,255,0.7)',
  },
  headerTitle: {
    fontSize: '22px',
    fontWeight: '700',
    color: '#fff',
  },
  steps: {
    display: 'flex',
    alignItems: 'center',
    gap: '0',
    padding: '0 32px',
    background: tokens.colorNeutralBackground1,
    borderBottom: `1px solid ${tokens.colorNeutralStroke2}`,
  },
  step: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '14px 0',
    flex: 1,
  },
  stepDot: {
    width: '24px',
    height: '24px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '12px',
    fontWeight: '700',
    flexShrink: 0,
    background: tokens.colorNeutralBackground4,
    color: tokens.colorNeutralForeground3,
  },
  stepDotActive: {
    background: tokens.colorBrandBackground,
    color: '#fff',
  },
  stepDotDone: {
    background: tokens.colorPaletteGreenBackground3,
    color: '#fff',
  },
  stepLabel: {
    fontSize: '13px',
    color: tokens.colorNeutralForeground3,
  },
  stepLabelActive: {
    color: tokens.colorNeutralForeground1,
    fontWeight: '600',
  },
  stepDivider: {
    flex: 0,
    width: '24px',
    height: '1px',
    background: tokens.colorNeutralStroke1,
  },
  body: {
    flex: 1,
    overflowY: 'auto',
    padding: '28px 32px',
  },
  footer: {
    padding: '16px 32px',
    borderTop: `1px solid ${tokens.colorNeutralStroke2}`,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '12px',
  },
  connecting: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '16px',
    padding: '24px 0',
  },
  connectedMsg: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    color: tokens.colorPaletteGreenForeground3,
    fontWeight: '600',
  },
});

type Step = 'source' | 'config' | 'names' | 'connecting';

const STEP_ORDER: Step[] = ['source', 'config', 'names', 'connecting'];
const STEP_LABELS = ['Source', 'Configure', 'Names', 'Connect'];

interface Props {
  onComplete: () => void;
}

export const SetupWizard: React.FC<Props> = ({ onComplete }) => {
  const styles = useStyles();
  const { lastMessage } = useWebSocket(WS_URL);

  const [step, setStep] = useState<Step>('source');
  const [source, setSource] = useState<SourceType>('scm820');
  const [sourceConfig, setSourceConfig] = useState<SourceConfig>({
    ip: '192.168.1.100',
    port: '2202',
    meetingId: '',
  });
  const [members, setMembers] = useState<Record<number, MemberEntry>>(() => {
    const defaults: Record<number, MemberEntry> = {};
    for (let ch = 1; ch <= 8; ch++) defaults[ch] = { name: `Channel ${ch}`, title: '' };
    return defaults;
  });
  const [supportsMembers, setSupportsMembers] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState('');

  // Pre-load existing member names from server
  useEffect(() => {
    fetch(`${API_URL}/api/members`)
      .then((r) => r.json())
      .then((data) => {
        if (data && Object.keys(data).length > 0) {
          const mapped: Record<number, MemberEntry> = {};
          for (const [k, v] of Object.entries(data)) {
            mapped[Number(k)] = v as MemberEntry;
          }
          setMembers(mapped);
        }
      })
      .catch(() => {});
  }, []);

  // Listen for mixer:connected over WS to advance from connecting step
  useEffect(() => {
    if (!lastMessage) return;
    if (lastMessage.type === 'mixer:connected' && step === 'connecting') {
      setConnected(true);
      setTimeout(onComplete, 900);
    }
  }, [lastMessage, step, onComplete]);

  const stepIndex = STEP_ORDER.indexOf(step);

  const sendConfigure = useCallback(async () => {
    setConnecting(true);
    setError('');
    try {
      const res = await fetch(`${API_URL}/api/configure`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          source,
          ip: sourceConfig.ip,
          port: sourceConfig.port ? parseInt(sourceConfig.port, 10) : undefined,
          meetingId: sourceConfig.meetingId || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Configure failed');
      setSupportsMembers(data.supportsMembers);

      // Simulation connects instantly — check if we should skip names
      if (source === 'simulation' && !data.supportsMembers) {
        setTimeout(onComplete, 500);
        return;
      }
      // Simulation with names, or other sources: advance to connecting
      setStep('connecting');
    } catch (e: any) {
      setError(e.message);
      setConnecting(false);
    }
  }, [source, sourceConfig, onComplete]);

  const saveNamesAndConnect = useCallback(async () => {
    setConnecting(true);
    setError('');
    try {
      await fetch(`${API_URL}/api/members`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(members),
      });
      setStep('connecting');
    } catch (e: any) {
      setError(e.message);
      setConnecting(false);
    }
  }, [members]);

  const handleNext = () => {
    if (step === 'source') {
      // Simulation has no config — jump straight to names or connect
      if (source === 'simulation') {
        setStep('names');
      } else {
        setStep('config');
      }
      return;
    }
    if (step === 'config') {
      sendConfigure();
      return;
    }
    if (step === 'names') {
      saveNamesAndConnect();
      return;
    }
  };

  const handleBack = () => {
    if (step === 'config') setStep('source');
    if (step === 'names') setStep(source === 'simulation' ? 'source' : 'config');
  };

  const canGoNext = () => {
    if (step === 'source') return true;
    if (step === 'config' && source === 'scm820') return sourceConfig.ip.trim().length > 0;
    return true;
  };

  const nextLabel = () => {
    if (step === 'config') return 'Connect';
    if (step === 'names') return 'Start Meeting';
    return 'Continue';
  };

  const visibleSteps: { key: Step; label: string }[] = [
    { key: 'source', label: 'Source' },
    ...(source !== 'simulation' ? [{ key: 'config' as Step, label: 'Configure' }] : []),
    { key: 'names', label: 'Names' },
    { key: 'connecting', label: 'Connect' },
  ];

  return (
    <div className={styles.overlay}>
      <div className={styles.card}>
        {/* Header */}
        <div className={styles.header}>
          <Text className={styles.headerSub}>Council Chamber</Text>
          <Text className={styles.headerTitle}>New Meeting Setup</Text>
        </div>

        {/* Step indicator */}
        <div className={styles.steps}>
          {visibleSteps.map((s, i) => {
            const idx = visibleSteps.findIndex((x) => x.key === step);
            const isDone = i < idx;
            const isActive = s.key === step;
            return (
              <React.Fragment key={s.key}>
                {i > 0 && <div className={styles.stepDivider} />}
                <div className={styles.step}>
                  <div className={`${styles.stepDot} ${isDone ? styles.stepDotDone : ''} ${isActive ? styles.stepDotActive : ''}`}>
                    {isDone ? '✓' : i + 1}
                  </div>
                  <Text className={`${styles.stepLabel} ${isActive ? styles.stepLabelActive : ''}`}>
                    {s.label}
                  </Text>
                </div>
              </React.Fragment>
            );
          })}
        </div>

        {/* Body */}
        <div className={styles.body}>
          {step === 'source' && (
            <SourceSelectStep selected={source} onChange={setSource} />
          )}
          {step === 'config' && (
            <ConfigStep source={source} config={sourceConfig} onChange={setSourceConfig} />
          )}
          {step === 'names' && (
            <NamesStep members={members} onChange={setMembers} />
          )}
          {step === 'connecting' && (
            <div className={styles.connecting}>
              {connected ? (
                <div className={styles.connectedMsg}>
                  <CheckmarkCircleRegular style={{ fontSize: '28px' }} />
                  <Text size={500} weight="semibold">Connected — starting session…</Text>
                </div>
              ) : (
                <>
                  <Spinner size="large" label="Connecting to audio source…" />
                  {source === 'scm820' && (
                    <Text size={200} style={{ color: tokens.colorNeutralForeground3 }}>
                      Trying {sourceConfig.ip}:{sourceConfig.port || '2202'} — will fall back to simulation after 5s if unreachable.
                    </Text>
                  )}
                </>
              )}
            </div>
          )}
          {error && (
            <Text style={{ color: tokens.colorPaletteRedForeground1, marginTop: '12px', display: 'block' }}>
              {error}
            </Text>
          )}
        </div>

        {/* Footer */}
        {step !== 'connecting' && (
          <div className={styles.footer}>
            <Button
              icon={<ArrowLeftRegular />}
              appearance="subtle"
              onClick={handleBack}
              disabled={step === 'source' || connecting}
            >
              Back
            </Button>
            <Button
              icon={connecting ? <Spinner size="tiny" /> : <ArrowRightRegular />}
              iconPosition="after"
              appearance="primary"
              onClick={handleNext}
              disabled={!canGoNext() || connecting}
            >
              {nextLabel()}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};
