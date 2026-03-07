import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import path from 'path';
import fs from 'fs';
import { fetchRegistry } from '../utils/registry.js';
import { installSkill, isSkillInstalled, removeSkillDir } from '../utils/installer.js';
import { getDefaultSkillsDir } from '../utils/paths.js';

export const updateCommand = new Command('update')
  .description('Update all installed skills')
  .option('--dir <path>', 'Custom install directory')
  .action(async (opts: { dir?: string }) => {
    const baseDir = opts.dir ?? getDefaultSkillsDir();

    if (!fs.existsSync(baseDir)) {
      console.log(chalk.yellow('\n  No skills installed yet.\n'));
      return;
    }

    const spinner = ora('Fetching registry...').start();

    try {
      const registry = await fetchRegistry();

      const installedNames = fs
        .readdirSync(baseDir, { withFileTypes: true })
        .filter((d) => d.isDirectory())
        .map((d) => d.name);

      const toUpdate = registry.skills.filter((s) => installedNames.includes(s.name));

      if (toUpdate.length === 0) {
        spinner.warn('No installed skills found in registry.');
        return;
      }

      spinner.stop();

      for (const skill of toUpdate) {
        const skillSpinner = ora(`Updating ${skill.displayName}...`).start();
        const targetDir = path.join(baseDir, skill.name);

        if (isSkillInstalled(targetDir)) {
          removeSkillDir(targetDir);
        }

        await installSkill(skill, targetDir);
        skillSpinner.succeed(chalk.green(`Updated ${chalk.bold(skill.displayName)} v${skill.version}`));
      }

      console.log(chalk.dim(`\n  All skills updated.\n`));
    } catch (err) {
      spinner.fail(chalk.red(`Failed: ${(err as Error).message}`));
      process.exit(1);
    }
  });
