import React, { createContext, useContext, useState, useEffect } from 'react';

interface Settings {
  fontSize: 'small' | 'medium' | 'large';
  transcriptDensity: 'compact' | 'comfortable' | 'spacious';
  autoScroll: boolean;
  showMixerPanel: boolean;
}

interface SettingsContextValue {
  settings: Settings;
  updateSettings: (updates: Partial<Settings>) => void;
}

const defaultSettings: Settings = {
  fontSize: 'medium',
  transcriptDensity: 'comfortable',
  autoScroll: true,
  showMixerPanel: true,
};

const SettingsContext = createContext<SettingsContextValue | undefined>(undefined);

export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettings must be used within SettingsProvider');
  }
  return context;
};

export const SettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [settings, setSettings] = useState<Settings>(() => {
    const saved = localStorage.getItem('cc_settings');
    return saved ? { ...defaultSettings, ...JSON.parse(saved) } : defaultSettings;
  });

  useEffect(() => {
    localStorage.setItem('cc_settings', JSON.stringify(settings));
  }, [settings]);

  const updateSettings = (updates: Partial<Settings>) => {
    setSettings((prev) => ({ ...prev, ...updates }));
  };

  return (
    <SettingsContext.Provider value={{ settings, updateSettings }}>
      {children}
    </SettingsContext.Provider>
  );
};
