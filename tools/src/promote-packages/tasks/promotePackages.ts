import chalk from 'chalk';

import { findPackagesToPromote } from './findPackagesToPromote';
import { prepareParcels } from './prepareParcels';
import { selectPackagesToPromote } from './selectPackagesToPromote';
import logger from '../../Logger';
import * as Npm from '../../Npm';
import { Task } from '../../TasksRunner';
import { formatVersionChange } from '../helpers';
import { CommandOptions, Parcel, TaskArgs } from '../types';

const { yellow, red, green, cyan } = chalk;

/**
 * Promotes local versions of selected packages to npm tag passed as an option.
 */
export const promotePackages = new Task<TaskArgs>(
  {
    name: 'promotePackages',
    dependsOn: [prepareParcels, findPackagesToPromote, selectPackagesToPromote],
  },
  async (parcels: Parcel[], options: CommandOptions): Promise<void> => {
    logger.info(`\n🚀 Promoting packages to ${yellow.bold(options.tag)} tag...`);

    // Sort alphabetically, optionally reversed.
    const sorted = [...parcels].sort((a, b) =>
      a.pkg.packageName.localeCompare(b.pkg.packageName)
    );
    if (options.reverse) {
      sorted.reverse();
    }

    // check if two factor auth is required for publishing
    const npmProfile = await Npm.getProfileAsync();
    const requiresOTP = npmProfile?.tfa?.mode === 'auth-and-writes';

    for (const { pkg, state } of sorted) {
      const currentVersion = pkg.packageVersion;
      const { versionToReplace } = state;

      const action = state.isDemoting ? red('Demoting') : green('Promoting');
      logger.log('  ', green.bold(pkg.packageName));
      logger.log(
        '    ',
        action,
        yellow(options.tag),
        formatVersionChange(versionToReplace, currentVersion)
      );

      // Tag the local version of the package.
      if (!options.dry) {
        await Npm.addTagAsync(pkg.packageName, pkg.packageVersion, options.tag, {
          stdio: requiresOTP ? 'inherit' : undefined,
        });
      }

      // If the local version had any tags assigned, we can drop the old ones.
      // If assigning `sdk-` tag, don't drop any other tags. This one is additive.
      if (
        options.drop &&
        state.distTags &&
        !state.distTags.includes(options.tag) &&
        !options.tag.startsWith('sdk-')
      ) {
        for (const distTag of state.distTags) {
          logger.log('    ', `Dropping ${yellow(distTag)} tag (${cyan(currentVersion)})...`);

          if (!options.dry) {
            await Npm.removeTagAsync(pkg.packageName, distTag, {
              stdio: requiresOTP ? 'inherit' : undefined,
            });
          }
        }
      }
    }

    logger.success(`\n✅ Successfully promoted ${cyan(parcels.length + '')} packages.`);
  }
);
