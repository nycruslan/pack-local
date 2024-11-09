// logger.js
import chalk from 'chalk';

export class Logger {
  static info(message: string) {
    console.log(chalk.blueBright(`[pack-local] ${message}`));
  }

  static success(message: string) {
    console.log(chalk.green(`[pack-local] ${message}`));
  }

  static warn(message: string) {
    console.log(chalk.yellowBright(`[pack-local] ${message}`));
  }

  static error(message: string) {
    console.error(chalk.red(`[pack-local] ${message}`));
  }

  static handleError(error: unknown, message: string): void {
    if (error instanceof Error) {
      Logger.error(`${message}: ${error.message}`);
    } else {
      Logger.error(`${message}: An unknown error occurred`);
    }
    process.exit(1);
  }
}
