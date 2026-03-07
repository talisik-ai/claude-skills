import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import { fetchRegistry } from '../utils/registry.js';

export const searchCommand = new Command('search')
  .description('Search skills by keyword')
  .argument('<query>', 'Search term')
  .action(async (query: string) => {
    const spinner = ora('Searching...').start();

    try {
      const registry = await fetchRegistry();
      const q = query.toLowerCase();

      const results = registry.skills.filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          s.description.toLowerCase().includes(q) ||
          s.tags.some((t) => t.includes(q)) ||
          s.category.toLowerCase().includes(q)
      );

      spinner.stop();

      if (results.length === 0) {
        console.log(chalk.yellow(`\n  No skills matched "${query}".\n`));
        return;
      }

      console.log(chalk.bold(`\n Results for "${query}" (${results.length})\n`));

      for (const skill of results) {
        const tags = skill.tags.map((t) => chalk.dim(`#${t}`)).join(' ');
        console.log(`  ${chalk.cyan(skill.name.padEnd(20))} ${skill.description.split('.')[0]}.`);
        console.log(`  ${' '.repeat(20)} ${tags}`);
        console.log();
      }
    } catch (err) {
      spinner.fail(chalk.red(`Failed: ${(err as Error).message}`));
      process.exit(1);
    }
  });
