export interface DiceRollResult {
  notation: string;
  rolls: number[];
  total: number;
}

export interface IDiceService {
  d10(): number;
  coin(): boolean;
  roll(sides: number): DiceRollResult;
  rollMany(count: number, sides: number): DiceRollResult;
}

export class DiceService implements IDiceService {
  d10(): number {
    return this.roll(10).total;
  }

  coin(): boolean {
    return this.roll(2).total === 2;
  }

  roll(sides: number): DiceRollResult {
    const value = Math.floor(Math.random() * sides) + 1;
    return { notation: `1d${sides}`, rolls: [value], total: value };
  }

  rollMany(count: number, sides: number): DiceRollResult {
    const rolls: number[] = [];
    for (let i = 0; i < count; i += 1) {
      rolls.push(Math.floor(Math.random() * sides) + 1);
    }
    const total = rolls.reduce((sum, roll) => sum + roll, 0);
    return { notation: `${count}d${sides}`, rolls, total };
  }
}

/** Deterministic dice for tests. Consumes a queue of pre-rolled faces. */
export class ScriptedDiceService implements IDiceService {
  constructor(private readonly queue: number[] = []) {}

  push(...values: number[]): void {
    this.queue.push(...values);
  }

  remaining(): number {
    return this.queue.length;
  }

  d10(): number {
    return this.roll(10).total;
  }

  coin(): boolean {
    return this.roll(2).total === 2;
  }

  roll(sides: number): DiceRollResult {
    const value = this.next();
    return { notation: `1d${sides}`, rolls: [value], total: value };
  }

  rollMany(count: number, sides: number): DiceRollResult {
    const rolls: number[] = [];
    for (let i = 0; i < count; i += 1) {
      rolls.push(this.next());
    }
    const total = rolls.reduce((sum, roll) => sum + roll, 0);
    return { notation: `${count}d${sides}`, rolls, total };
  }

  private next(): number {
    return this.queue.shift() ?? 1;
  }
}
