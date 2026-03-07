#!/usr/bin/env node
import { program } from 'commander';
import { addCommand } from './commands/add.js';
import { listCommand } from './commands/list.js';
import { searchCommand } from './commands/search.js';
import { updateCommand } from './commands/update.js';
import { removeCommand } from './commands/remove.js';

program
  .name('claude-skills')
  .description('Install and manage talisik-ai Claude skills')
  .version('1.0.0');

program.addCommand(addCommand);
program.addCommand(listCommand);
program.addCommand(searchCommand);
program.addCommand(updateCommand);
program.addCommand(removeCommand);

program.parse();
