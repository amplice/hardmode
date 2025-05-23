export function bfsPath(world, start, goal, maxSteps = 500) {
  const startTile = {
    x: Math.floor(start.x / world.tileSize),
    y: Math.floor(start.y / world.tileSize)
  };
  const goalTile = {
    x: Math.floor(goal.x / world.tileSize),
    y: Math.floor(goal.y / world.tileSize)
  };
  const queue = [];
  const visited = new Set();
  const key = (x,y) => `${x},${y}`;
  queue.push({x:startTile.x, y:startTile.y, path: []});
  visited.add(key(startTile.x, startTile.y));
  const dirs = [
    {dx:1,dy:0}, {dx:-1,dy:0}, {dx:0,dy:1}, {dx:0,dy:-1}
  ];
  while (queue.length > 0) {
    const node = queue.shift();
    if (node.x === goalTile.x && node.y === goalTile.y) {
      return node.path;
    }
    for (const dir of dirs) {
      const nx = node.x + dir.dx;
      const ny = node.y + dir.dy;
      if (nx < 0 || ny < 0 || nx >= world.width || ny >= world.height) continue;
      if (!world.tiles[ny][nx].isWalkable()) continue;
      const k = key(nx, ny);
      if (visited.has(k)) continue;
      visited.add(k);
      const newPath = node.path.concat({
        x: nx * world.tileSize + world.tileSize / 2,
        y: ny * world.tileSize + world.tileSize / 2
      });
      queue.push({x: nx, y: ny, path: newPath});
      if (visited.size > maxSteps) return null;
    }
  }
  return null;
}
