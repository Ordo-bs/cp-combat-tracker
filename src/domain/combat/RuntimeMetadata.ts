export interface RuntimeMetadata {
  instanceId: string;
  templateId?: string;
  templateName?: string;
  createdAt: number;
  activationSequence: number;
  taserHitActivations: number[];
}

export function createRuntimeMetadataDefaults(): Pick<
  RuntimeMetadata,
  "activationSequence" | "taserHitActivations"
> {
  return {
    activationSequence: 0,
    taserHitActivations: [],
  };
}
