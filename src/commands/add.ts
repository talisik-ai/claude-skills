import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import path from 'path';
import { fetchRegistry, findSkill } from '../utils/registry.js';
import { installSkill, isSkillInstalled } from '../utils/installer.js';
import { getDefaultSkillsDir } from '../utils/paths.js';

export const addCommand = new Command('add')
  .description('Install a skill')
  .argument('<skill-name>', 'Name of the skill to install')
  .option('--dir <path>', 'Custom install directory')
  .action(async (skillName: string, opts: { dir?: string }) => {
    const spinner = ora(`Looking up "${skillName}"...`).start();

    try {
      const registry = await fetchRegistry();
      const skill = findSkill(registry, skillName);

      if (!skill) {
        spinner.fail(chalk.red(`Skill "${skillName}" not found in registry.`));
        console.log(
          chalk.dim(`  Run ${chalk.white('claude-skills list')} to see available skills.`)
        );
        process.exit(1);
      }

      const baseDir = opts.dir ?? getDefaultSkillsDir();
      const targetDir = path.join(baseDir, skill.name);

      if (isSkillInstalled(targetDir)) {
        spinner.warn(chalk.yellow(`"${skill.displayName}" is already installed.`));
        console.log(chalk.dim(`  Location: ${targetDir}`));
        return;
      }

      spinner.text = `Downloading ${skill.displayName} v${skill.version}...`;
      await installSkill(skill, targetDir);

      spinner.succeed(
        chalk.green(`Installed ${chalk.bold(skill.displayName)} v${skill.version}`)
      );
      console.log(chalk.dim(`  Location: ${targetDir}`));
    } catch (err) {
      spinner.fail(chalk.red(`Failed: ${(err as Error).message}`));
      process.exit(1);
    }
  });
