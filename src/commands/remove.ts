import { Command } from 'commander';
import chalk from 'chalk';
import prompts from 'prompts';
import path from 'path';
import { isSkillInstalled, removeSkillDir } from '../utils/installer.js';
import { getDefaultSkillsDir } from '../utils/paths.js';

export const removeCommand = new Command('remove')
  .description('Remove an installed skill')
  .argument('<skill-name>', 'Name of the skill to remove')
  .option('--dir <path>', 'Custom install directory')
  .option('-y, --yes', 'Skip confirmation prompt')
  .action(async (skillName: string, opts: { dir?: string; yes?: boolean }) => {
    try {
      const baseDir = opts.dir ?? getDefaultSkillsDir();
      const targetDir = path.join(baseDir, skillName);

      if (!isSkillInstalled(targetDir)) {
        console.log(chalk.yellow(`\n  Skill "${skillName}" is not installed.\n`));
        return;
      }

      if (!opts.yes) {
        const { confirmed } = await prompts({
          type: 'confirm',
          name: 'confirmed',
          message: `Remove "${skillName}"?`,
          initial: false,
        });

        if (!confirmed) {
          console.log(chalk.dim('  Aborted.'));
          return;
        }
      }

      removeSkillDir(targetDir);
      console.log(chalk.green(`\n  Removed "${skillName}".\n`));
    } catch (err) {
      console.error(chalk.red(`Failed: ${(err as Error).message}`));
      process.exit(1);
    }
  });
