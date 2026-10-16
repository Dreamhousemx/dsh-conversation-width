/**
 * Node half of `dsh-conversation-width`.
 *
 * This plugin is browser-only: every control it adds lives in the client
 * bundle, which the client module system serves from `/plugins/...`. The Node
 * half therefore has nothing to mount, but it must still exist as an
 * importable module because the profile loader row names this package.
 *
 * Keep it side-effect free: the loader imports it once per entry.
 */

export const name = "dsh-conversation-width";

/** The plugin contributes no host-side service, so it requires nothing. */
export const inject = [];

/** No host-side behaviour to install. */
export function apply() {}
