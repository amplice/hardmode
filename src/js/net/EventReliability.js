export const ReliableClientEvents = new Set([
    'create_game',
    'join_game',
    'class_select',
    'player_ready'
]);

export const ReliableServerEvents = new Set([
    'game_created',
    'join_result',
    'player_joined',
    'player_left',
    'player_class_selected',
    'player_ready',
    'ENTITY_SPAWN',
    'ENTITY_DESPAWN',
    'DAMAGE_EVENT',
    'CHAT_MESSAGE'
]);

