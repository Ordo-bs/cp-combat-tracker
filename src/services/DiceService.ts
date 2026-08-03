export interface IDiceService {
  d10(): number;
  coin(): boolean;
}

export class DiceService implements IDiceService {
  d10(): number {
    return Math.floor(Math.random() * 10) + 1;
  }

  coin(): boolean {
    return Math.random() >= 0.5;
  }
}
