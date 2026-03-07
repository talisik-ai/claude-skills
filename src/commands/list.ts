import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import { fetchRegistry } from '../utils/registry.js';

export const listCommand = new Command('list')
  .description('List all available skills')
  .action(async () => {
    const spinner = ora('Fetching registry...').start();

    try {
      const registry = await fetchRegistry();
      spinner.stop();

      console.log(chalk.bold(`\n Available Skills (${registry.skills.length})\n`));

      for (const skill of registry.skills) {
        console.log(
          `  ${chalk.cyan(skill.name.padEnd(20))} ${chalk.dim(`v${skill.version}`)}  ${skill.description.split('.')[0]}.`
        );
      }

      console.log(
        `\n  Install with: ${chalk.white('npx @talisik-ai/claude-skills add <name>')}\n`
      );
    } catch (err) {
      spinner.fail(chalk.red(`Failed: ${(err as Error).message}`));
      process.exit(1);
    }
  });
