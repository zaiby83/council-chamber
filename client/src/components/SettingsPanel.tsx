import React from 'react';
import {
  Drawer,
  DrawerHeader,
  DrawerHeaderTitle,
  DrawerBody,
  Button,
  Label,
  Switch,
  makeStyles,
  tokens,
  Divider,
} from '@fluentui/react-components';
import { DismissRegular } from '@fluentui/react-icons';
import { useSettings } from '../contexts/SettingsContext';
import { useTheme } from '../contexts/ThemeContext';

const useStyles = makeStyles({
  section: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
    marginBottom: '24px',
  },
  sectionTitle: {
    fontWeight: '600',
    fontSize: '13px',
    color: tokens.colorNeutralForeground2,
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
  },
  setting: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px',
    background: tokens.colorNeutralBackground3,
    borderRadius: tokens.borderRadiusMedium,
  },
  settingInfo: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  settingLabel: {
    fontWeight: '600',
    fontSize: '14px',
  },
  settingDesc: {
    fontSize: '12px',
    color: tokens.colorNeutralForeground3,
  },
  select: {
    padding: '6px 8px',
    borderRadius: tokens.borderRadiusMedium,
    border: `1px solid ${tokens.colorNeutralStroke1}`,
    background: tokens.colorNeutralBackground1,
    fontSize: '14px',
    color: tokens.colorNeutralForeground1,
    minWidth: '140px',
  },
});

interface Props {
  open: boolean;
  onClose: () => void;
}

export const SettingsPanel: React.FC<Props> = ({ open, onClose }) => {
  const styles = useStyles();
  const { settings, updateSettings } = useSettings();
  const { mode, toggleTheme } = useTheme();

  return (
    <Drawer
      type="overlay"
      separator
      open={open}
      onOpenChange={(_, { open }) => !open && onClose()}
      position="end"
      size="medium"
    >
      <DrawerHeader>
        <DrawerHeaderTitle
          action={
            <Button
              appearance="subtle"
              aria-label="Close"
              icon={<DismissRegular />}
              onClick={onClose}
            />
          }
        >
          Settings
        </DrawerHeaderTitle>
      </DrawerHeader>

      <DrawerBody>
        <div className={styles.section}>
          <div className={styles.sectionTitle}>Appearance</div>

          <div className={styles.setting}>
            <div className={styles.settingInfo}>
              <Label className={styles.settingLabel}>Dark Mode</Label>
              <span className={styles.settingDesc}>
                Reduce eye strain during long meetings
              </span>
            </div>
            <Switch
              checked={mode === 'dark'}
              onChange={toggleTheme}
            />
          </div>

          <div className={styles.setting}>
            <div className={styles.settingInfo}>
              <Label className={styles.settingLabel}>Font Size</Label>
              <span className={styles.settingDesc}>
                Adjust text size for readability
              </span>
            </div>
            <select
              className={styles.select}
              value={settings.fontSize}
              onChange={(e) =>
                updateSettings({ fontSize: e.target.value as any })
              }
            >
              <option value="small">Small</option>
              <option value="medium">Medium</option>
              <option value="large">Large</option>
            </select>
          </div>
        </div>

        <Divider />

        <div className={styles.section}>
          <div className={styles.sectionTitle}>Transcript</div>

          <div className={styles.setting}>
            <div className={styles.settingInfo}>
              <Label className={styles.settingLabel}>Auto-scroll</Label>
              <span className={styles.settingDesc}>
                Automatically scroll to new entries
              </span>
            </div>
            <Switch
              checked={settings.autoScroll}
              onChange={(_, data) =>
                updateSettings({ autoScroll: data.checked })
              }
            />
          </div>

          <div className={styles.setting}>
            <div className={styles.settingInfo}>
              <Label className={styles.settingLabel}>Display Density</Label>
              <span className={styles.settingDesc}>
                Spacing between transcript entries
              </span>
            </div>
            <select
              className={styles.select}
              value={settings.transcriptDensity}
              onChange={(e) =>
                updateSettings({ transcriptDensity: e.target.value as any })
              }
            >
              <option value="compact">Compact</option>
              <option value="comfortable">Comfortable</option>
              <option value="spacious">Spacious</option>
            </select>
          </div>
        </div>

        <Divider />

        <div className={styles.section}>
          <div className={styles.sectionTitle}>Layout</div>

          <div className={styles.setting}>
            <div className={styles.settingInfo}>
              <Label className={styles.settingLabel}>Show Mixer Panel</Label>
              <span className={styles.settingDesc}>
                Display channel controls sidebar
              </span>
            </div>
            <Switch
              checked={settings.showMixerPanel}
              onChange={(_, data) =>
                updateSettings({ showMixerPanel: data.checked })
              }
            />
          </div>
        </div>
      </DrawerBody>
    </Drawer>
  );
};
