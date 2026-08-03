import { describe, expect, it } from "vitest";
import { INITIATIVE_SIDEBAR_VIEW_TYPE } from "../constants/viewTypes";

describe("plugin boilerplate", () => {
  it("registers a stable sidebar view type id", () => {
    expect(INITIATIVE_SIDEBAR_VIEW_TYPE).toBe("cp-combat-tracker-initiative-sidebar");
  });
});
