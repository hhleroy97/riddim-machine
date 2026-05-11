import type {
  EffectPluginDefinition,
  InstrumentPluginDefinition,
} from "@/lib/audio/plugins/contracts";
import type { EffectPluginId, InstrumentPluginId } from "@/types";

/**
 * In-memory plugin registry used by AudioEngine.
 */
export class PluginRegistry {
  private readonly instruments = new Map<InstrumentPluginId, InstrumentPluginDefinition>();
  private readonly effects = new Map<EffectPluginId, EffectPluginDefinition>();

  public registerInstrument(definition: InstrumentPluginDefinition): void {
    this.instruments.set(definition.id, definition);
  }

  public registerEffect(definition: EffectPluginDefinition): void {
    this.effects.set(definition.id, definition);
  }

  public getInstrument(id: InstrumentPluginId): InstrumentPluginDefinition {
    const definition = this.instruments.get(id);
    if (!definition) {
      throw new Error(`Instrument plugin not registered: ${id}`);
    }
    return definition;
  }

  public getEffect(id: EffectPluginId): EffectPluginDefinition {
    const definition = this.effects.get(id);
    if (!definition) {
      throw new Error(`Effect plugin not registered: ${id}`);
    }
    return definition;
  }

  public listInstrumentIds(): InstrumentPluginId[] {
    return [...this.instruments.keys()];
  }

  public listEffectIds(): EffectPluginId[] {
    return [...this.effects.keys()];
  }
}
