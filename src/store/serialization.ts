// Compatibility reader for snapshots saved before chunked persistence.
const marker = "__normanFlowGeometry";
export function parseState(value: string) {
  const geometries = new Map<number, unknown[]>();
  return JSON.parse(value, (key, value) => {
    if (
      key !== "geometry" ||
      !value ||
      typeof value !== "object" ||
      !(marker in value)
    )
      return value;
    const id = value[marker];
    if (Array.isArray(value.points)) geometries.set(id, value.points);
    if (!geometries.has(id))
      throw new Error("Saved road geometry is incomplete.");
    return geometries.get(id);
  });
}
