import { Routes } from 'discord-api-types/v10';
import { OverwriteType } from 'discord.js';

/**
 * PUT /channels/:channelId/permissions/:overwriteId — corpo igual ao `PermissionOverwriteManager.upsert`.
 */
export async function putRoleChannelOverwrite(client, channelId, roleId, allowBf, denyBf, reason) {
  const allow = allowBf.bitfield.toString();
  const deny = denyBf.bitfield.toString();

  await client.rest.put(Routes.channelPermission(channelId, roleId), {
    body: {
      id: roleId,
      type: OverwriteType.Role,
      allow,
      deny
    },
    reason
  });
}
