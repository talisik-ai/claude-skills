import os from 'os';
import path from 'path';

export function getDefaultSkillsDir(): string {
  const platform = process.platform;

  if (platform === 'darwin') {
    return path.join(
      os.homedir(),
      'Library',
      'Application Support',
      'Claude',
      'skills'
    );
  }

  if (platform === 'win32') {
    const appData = process.env.APPDATA ?? path.join(os.homedir(), 'AppData', 'Roaming');
    return path.join(appData, 'Claude', 'skills');
  }

  // Linux / fallback
  return path.join(os.homedir(), '.claude', 'skills');
}
