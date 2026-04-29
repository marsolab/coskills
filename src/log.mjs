const useColor = process.stdout.isTTY && !process.env.NO_COLOR;
const wrap = (code, s) => (useColor ? `\x1b[${code}m${s}\x1b[0m` : String(s));

export const dim = (s) => wrap("2", s);
export const bold = (s) => wrap("1", s);
export const green = (s) => wrap("32", s);
export const red = (s) => wrap("31", s);
export const yellow = (s) => wrap("33", s);
export const cyan = (s) => wrap("36", s);
export const magenta = (s) => wrap("35", s);

export function pipe(msg = "") {
  process.stderr.write(`${dim("|")}  ${msg}\n`);
}
export function step(msg) {
  process.stderr.write(`${cyan("o")}  ${msg}\n`);
}
export function success(msg) {
  process.stderr.write(`${green("✓")}  ${msg}\n`);
}
export function fail(msg) {
  process.stderr.write(`${red("✗")}  ${msg}\n`);
}
export function warn(msg) {
  process.stderr.write(`${yellow("!")}  ${msg}\n`);
}
export function done(msg) {
  process.stderr.write(`${magenta("—")}  ${msg}\n`);
}
export function blank() {
  process.stderr.write(`${dim("|")}\n`);
}

export function humanSize(n) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(2)} MB`;
}
