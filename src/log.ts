const useColor = Boolean(process.stdout.isTTY) && !process.env["NO_COLOR"];
const wrap = (code: string, s: string): string =>
  useColor ? `\x1b[${code}m${s}\x1b[0m` : s;

export const dim = (s: string): string => wrap("2", s);
export const bold = (s: string): string => wrap("1", s);
export const green = (s: string): string => wrap("32", s);
export const red = (s: string): string => wrap("31", s);
export const yellow = (s: string): string => wrap("33", s);
export const cyan = (s: string): string => wrap("36", s);
export const magenta = (s: string): string => wrap("35", s);

export function pipe(msg: string = ""): void {
  process.stderr.write(`${dim("|")}  ${msg}\n`);
}
export function step(msg: string): void {
  process.stderr.write(`${cyan("o")}  ${msg}\n`);
}
export function success(msg: string): void {
  process.stderr.write(`${green("✓")}  ${msg}\n`);
}
export function fail(msg: string): void {
  process.stderr.write(`${red("✗")}  ${msg}\n`);
}
export function warn(msg: string): void {
  process.stderr.write(`${yellow("!")}  ${msg}\n`);
}
export function done(msg: string): void {
  process.stderr.write(`${magenta("—")}  ${msg}\n`);
}
export function blank(): void {
  process.stderr.write(`${dim("|")}\n`);
}

export function humanSize(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(2)} MB`;
}
