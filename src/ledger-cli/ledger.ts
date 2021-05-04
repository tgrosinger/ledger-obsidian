import { ISettings, settingsWithDefaults } from '../settings';
import * as child from 'child_process';
import { err, ok, Result } from 'neverthrow';

export const register = async (settings: ISettings): Promise<string[]> =>
  runLogErr(settings, 'register');

export const accounts = async (settings: ISettings): Promise<string[]> =>
  runLogErr(settings, 'accounts');

/**
 * validate attempts to check if the ledger binary is available at the provided
 * path. This function takes a path directly instead of an ISettings to allow
 * easy use while users are changing settings.
 */
export const validate = async (ledgerPath: string): Promise<boolean> =>
  (
    await run(settingsWithDefaults({ ledgerPath: ledgerPath }), '--version')
  ).match(
    (_) => true,
    (e) => {
      console.error(e);
      return false;
    },
  );

// TODO: Look into how other programs get data out in easy formats (csv?)

// TODO: How to make multiple modes? Maybe an interface that can either be
// fulfilled by this or by the builtin parser

/**
 * runLogErr is the same as run except that errors will be logged and then
 * dropped. In the case of an error, an empty array is returned.
 */
const runLogErr = async (
  settings: ISettings,
  ...command: string[]
): Promise<string[]> =>
  (await run(settings, ...command)).match(
    (result) => result,
    (error) => {
      console.error(error);
      return [];
    },
  );

const run = async (
  settings: ISettings,
  ...command: string[]
): Promise<Result<string[], string>> => {
  // spawn is much better for large data transfer than exec
  const { stdout, stderr, error } = child.spawnSync(settings.ledgerPath, [
    '-f',
    '/Users/tony/Documents/atrium/Ledger.md', // TODO: Get the actual full system path?
    ...command,
  ]);

  if (error) {
    console.error('Got an error: ' + error.message);
    return err(error.message);
  }
  if (stderr.length !== 0) {
    console.error('Stderr: ' + stderr);
    return err(stderr);
  }
  return ok(stdout.toString().split('\n'));
};
