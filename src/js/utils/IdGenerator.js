let nextId = 1;

export function generateId(prefix = 'entity') {
    const id = `${prefix}_${nextId}`;
    nextId += 1;
    return id;
}
