import React, { useState } from 'react';
import {
  Text,
  Button,
  makeStyles,
  tokens,
  Divider,
  Spinner,
} from '@fluentui/react-components';
import { EditRegular, CheckmarkRegular, DismissRegular, PlugDisconnectedRegular } from '@fluentui/react-icons';
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
  sectionHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    fontWeight: '600',
    color: tokens.colorNeutralForeground2,
    fontSize: '12px',
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
  },
  editBar: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '8px 12px',
    background: tokens.colorBrandBackground2,
    borderRadius: tokens.borderRadiusMedium,
    marginBottom: '4px',
  },
  editBarText: {
    flex: 1,
    fontSize: '13px',
    color: tokens.colorBrandForeground1,
    fontWeight: '600',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
    gap: '10px',
    '@media (max-width: 1024px)': {
      gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
    },
    '@media (max-width: 768px)': {
      gridTemplateColumns: '1fr',
    },
  },
  offline: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    gap: '10px',
    color: tokens.colorNeutralForeground3,
    padding: '40px',
    textAlign: 'center',
  },
  offlineIcon: {
    fontSize: '40px',
    opacity: 0.4,
  },
});

export interface ChannelState {
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
  onSaveMembers: (members: Record<number, { name: string; title: string }>) => Promise<void>;
}

export const MixerPanel: React.FC<Props> = ({ channels, mixerConnected, onMuteToggle, onSaveMembers }) => {
  const styles = useStyles();
  const [editMode, setEditMode] = useState(false);
  const [saving, setSaving] = useState(false);
  // Draft edits: channel → { name, title }
  const [drafts, setDrafts] = useState<Record<number, { name: string; title: string }>>({});

  const enterEdit = () => {
    const initial: Record<number, { name: string; title: string }> = {};
    channels.forEach((c) => { initial[c.channel] = { name: c.name, title: c.title }; });
    setDrafts(initial);
    setEditMode(true);
  };

  const cancelEdit = () => {
    setDrafts({});
    setEditMode(false);
  };

  const saveEdit = async () => {
    setSaving(true);
    try {
      await onSaveMembers(drafts);
      setEditMode(false);
      setDrafts({});
    } finally {
      setSaving(false);
    }
  };

  const handleDraftChange = (channel: number, field: 'name' | 'title', value: string) => {
    setDrafts((prev) => ({
      ...prev,
      [channel]: { ...prev[channel], [field]: value },
    }));
  };

  // Merge drafts into channel display when in edit mode
  const displayChannels = editMode
    ? channels.map((c) => ({ ...c, ...(drafts[c.channel] ?? {}) }))
    : channels;

  const council = displayChannels.filter((c) => c.channel <= 5);
  const staff = displayChannels.filter((c) => c.channel > 5);

  if (!mixerConnected && channels.length === 0) {
    return (
      <div className={styles.panel}>
        <div className={styles.offline}>
          <PlugDisconnectedRegular className={styles.offlineIcon} />
          <Text weight="semibold">Mixer Offline</Text>
          <Text size={200}>Waiting for Shure SCM820 connection…</Text>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.panel}>
      {editMode && (
        <div className={styles.editBar}>
          <Text className={styles.editBarText}>Editing member names</Text>
          <Button
            icon={saving ? <Spinner size="tiny" /> : <CheckmarkRegular />}
            appearance="primary"
            size="small"
            onClick={saveEdit}
            disabled={saving}
          >
            Save
          </Button>
          <Button
            icon={<DismissRegular />}
            appearance="subtle"
            size="small"
            onClick={cancelEdit}
            disabled={saving}
          >
            Cancel
          </Button>
        </div>
      )}

      <div className={styles.sectionHeader}>
        <Text className={styles.sectionTitle}>Council Members</Text>
        {!editMode && (
          <Button icon={<EditRegular />} appearance="subtle" size="small" onClick={enterEdit}>
            Edit Names
          </Button>
        )}
      </div>
      <div className={styles.grid}>
        {council.map((ch) => (
          <CouncilMemberCard
            key={ch.channel}
            state={ch}
            onMuteToggle={onMuteToggle}
            editMode={editMode}
            draft={drafts[ch.channel]}
            onDraftChange={(field, value) => handleDraftChange(ch.channel, field, value)}
          />
        ))}
      </div>

      <Divider />

      <Text className={styles.sectionTitle}>Staff</Text>
      <div className={styles.grid}>
        {staff.map((ch) => (
          <CouncilMemberCard
            key={ch.channel}
            state={ch}
            onMuteToggle={onMuteToggle}
            editMode={editMode}
            draft={drafts[ch.channel]}
            onDraftChange={(field, value) => handleDraftChange(ch.channel, field, value)}
          />
        ))}
      </div>
    </div>
  );
};
