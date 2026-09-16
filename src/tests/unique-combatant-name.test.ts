import { describe, expect, it } from "vitest";
import { uniqueCombatantName } from "../domain/combat/CombatEncounter";

describe("uniqueCombatantName", () => {
  it("keeps the first copy of a name", () => {
    expect(uniqueCombatantName("Arasaka Solo", [])).toBe("Arasaka Solo");
  });

  it("numbers the second copy", () => {
    expect(uniqueCombatantName("Arasaka Solo", ["Arasaka Solo"])).toBe("Arasaka Solo (2)");
  });

  it("skips numbers that are already taken", () => {
    expect(uniqueCombatantName("Arasaka Solo", ["Arasaka Solo", "Arasaka Solo (2)"])).toBe(
      "Arasaka Solo (3)",
    );
  });

  it("continues the sequence when copying an already numbered name", () => {
    expect(uniqueCombatantName("Arasaka Solo (2)", ["Arasaka Solo", "Arasaka Solo (2)"])).toBe(
      "Arasaka Solo (3)",
    );
  });
});
