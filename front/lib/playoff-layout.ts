import type { PlayoffBracket, PlayoffTie } from "./playoffs";

export const BRACKET_COLUMN_WIDTH = 318;
export const BRACKET_TIE_WIDTH = 270;
export const BRACKET_HEADER_HEIGHT = 56;

export interface PositionedTie {
  tie: PlayoffTie;
  x: number;
  y: number;
}

/** Center each later round on its confirmed feeders. Unconnected ties keep their own space. */
export function layoutPlayoffBracket(bracket: PlayoffBracket) {
  const nodeHeight = bracket.rounds.some(round => round.ties.some(tie => tie.fixtures.length > 1)) ? 184 : 150;
  const pitch = nodeHeight + 32;
  const incoming = new Map<string, string[]>();
  for (const connection of bracket.connections) {
    const sources = incoming.get(connection.toTieId) ?? [];
    sources.push(connection.fromTieId);
    incoming.set(connection.toTieId, sources);
  }
  const order = new Map<string, number>();
  let next = 0;
  const visit = (id: string) => {
    if (order.has(id)) return;
    for (const source of incoming.get(id) ?? []) visit(source);
    order.set(id, next++);
  };
  for (const round of [...bracket.rounds].reverse()) for (const tie of round.ties) visit(tie.id);

  const positions = new Map<string, PositionedTie>();
  const columns = bracket.rounds.map((round, column) => {
    const ordered = [...round.ties].sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0));
    let bottom = 0;
    return {
      round,
      ties: ordered.map((tie, index) => {
        const sources = (incoming.get(tie.id) ?? []).flatMap(id => {
          const node = positions.get(id);
          return node ? [node.y] : [];
        });
        const desired = sources.length ? sources.reduce((sum, y) => sum + y, 0) / sources.length : index * pitch;
        const y = Math.max(bottom, desired);
        bottom = y + pitch;
        const node = { tie, x: column * BRACKET_COLUMN_WIDTH, y };
        positions.set(tie.id, node);
        return node;
      }),
    };
  });
  const edges = bracket.connections.flatMap(connection => {
    const from = positions.get(connection.fromTieId);
    const to = positions.get(connection.toTieId);
    if (!from || !to) return [];
    const x1 = from.x + BRACKET_TIE_WIDTH;
    const x2 = to.x;
    const y1 = from.y + nodeHeight / 2;
    const y2 = to.y + nodeHeight / 2;
    const middle = x1 + (x2 - x1) / 2;
    return [{ id: `${from.tie.id}:${to.tie.id}`, path: `M ${x1} ${y1} H ${middle} V ${y2} H ${x2}` }];
  });
  return {
    columns, edges, nodeHeight,
    width: Math.max(BRACKET_TIE_WIDTH, bracket.rounds.length * BRACKET_COLUMN_WIDTH - (BRACKET_COLUMN_WIDTH - BRACKET_TIE_WIDTH)),
    height: Math.max(nodeHeight, ...Array.from(positions.values(), node => node.y + nodeHeight)),
  };
}
