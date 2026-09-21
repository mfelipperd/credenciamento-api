export const MAX_NUMBERED_STANDS = 1000;

export const STAND_NUMBERS_SPEC = /^\d+(-\d+)?(\s*,\s*\d+(-\d+)?)*$/;

export function parseStandNumbers(spec: string): number[] {
  const numbers = new Set<number>();

  for (const part of spec.split(',')) {
    const [from, to = from] = part.trim().split('-').map(Number);
    if (from < 1 || to < from) {
      throw new Error(`Faixa de stands inválida: "${part.trim()}"`);
    }
    if (to > MAX_NUMBERED_STANDS) {
      throw new Error(
        `Stand ${to} passa do limite de ${MAX_NUMBERED_STANDS} stands por feira`,
      );
    }
    for (let number = from; number <= to; number++) numbers.add(number);
  }

  return [...numbers].sort((a, b) => a - b);
}

export function formatStandNumbers(sortedNumbers: number[]): string {
  const ranges: string[] = [];

  let start = 0;
  while (start < sortedNumbers.length) {
    let end = start;
    while (
      end + 1 < sortedNumbers.length &&
      sortedNumbers[end + 1] === sortedNumbers[end] + 1
    ) {
      end++;
    }
    ranges.push(
      end === start
        ? `${sortedNumbers[start]}`
        : `${sortedNumbers[start]}-${sortedNumbers[end]}`,
    );
    start = end + 1;
  }

  return ranges.join(', ');
}
