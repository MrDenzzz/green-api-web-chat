/** Joins class names and skips falsy ones: `cx(styles.item, active && styles.active)`. */
export function cx(...names: (string | false | null | undefined)[]): string {
  return names.filter(Boolean).join(' ');
}
