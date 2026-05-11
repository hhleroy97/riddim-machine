/**
 * Canonical sequencer step shape.
 */
export interface Step {
  active: boolean;
  /** Primary note for display, monophonic lines, and fallbacks. */
  note: string;
  /**
   * When set, the engine plays all listed notes together (chord stab).
   * Should include `note` as one of the entries for consistent UI.
   */
  notes?: string[];
  velocity: number;
}

/**
 * Modulation source identifiers.
 */
export type ModSource = "lfo1" | "env1" | "macro1" | "macro2" | "macro3" | "macro4";

/**
 * Modulation target identifiers.
 */
export type ModTarget =
  | "filterCutoff"
  | "filterResonance"
  | "oscMix"
  | "drive"
  | "chorusMix"
  | "stereoWidth";

/**
 * Oscillator layer model for bass voice.
 */
export interface OscillatorLayer {
  id: string;
  enabled: boolean;
  waveform: "sine" | "triangle" | "square" | "sawtooth";
  octave: number;
  detune: number;
  gain: number;
}

/**
 * Filter model for bass voice.
 */
export interface FilterPatch {
  cutoff: number;
  resonance: number;
  envelopeAmount: number;
}

/**
 * Envelope model for amp/filter modulation.
 */
export interface EnvelopePatch {
  attack: number;
  decay: number;
  sustain: number;
  release: number;
}

/**
 * FX chain model.
 */
export interface FxPatch {
  drive: number;
  chorusMix: number;
  stereoWidth: number;
  lowCut: number;
  highCut: number;
}

/**
 * Macro control model.
 */
export interface MacroControl {
  id: "macro1" | "macro2" | "macro3" | "macro4";
  label: string;
  value: number;
}

/**
 * Modulation route descriptor.
 */
export interface ModRoute {
  id: string;
  source: ModSource;
  target: ModTarget;
  amount: number;
  smoothing: number;
  invert: boolean;
  enabled: boolean;
}

/**
 * Canonical synth patch.
 */
export interface SynthPatch {
  version: 1;
  oscillators: OscillatorLayer[];
  ampEnvelope: EnvelopePatch;
  modEnvelope: EnvelopePatch;
  filter: FilterPatch;
  fx: FxPatch;
  macros: MacroControl[];
  modRoutes: ModRoute[];
}

/**
 * Internal instrument plugin ids.
 */
export type InstrumentPluginId =
  | "sampler-drum-rack"
  | "subtractive-bass"
  | "fm-synth"
  | "wavetable-synth"
  | "granular-texture"
  | "additive-synth"
  | "phase-distortion-synth"
  | "karplus-pluck"
  | "supersaw-stack"
  | "percussive-noise";

/**
 * Internal effect plugin ids.
 */
export type EffectPluginId =
  | "eq3"
  | "state-filter"
  | "compressor"
  | "saturator"
  | "chorus-phaser"
  | "delay"
  | "reverb"
  | "limiter"
  | "utility"
  | "stereo-widener"
  | "transient-shaper"
  | "gate"
  | "bitcrusher"
  | "ring-mod"
  | "auto-pan"
  | "multiband-split"
  | "cabinet";

/**
 * Effect slot in a device chain.
 */
export interface EffectSlot {
  id: string;
  pluginId: EffectPluginId;
  bypass: boolean;
  wet: number;
  params: Record<string, number>;
}

/**
 * Instrument + effect chain descriptor for a track.
 */
export interface DeviceChain {
  instrumentPluginId: InstrumentPluginId;
  instrumentParams: Record<string, number>;
  effects: EffectSlot[];
}

/**
 * Preset bank item.
 */
export interface PatchPreset {
  id: string;
  name: string;
  description: string;
  patch: SynthPatch;
}

/**
 * Track engine variants available in the studio.
 */
export type TrackType = "drum" | "bass";

/**
 * Canonical sequencer track shape.
 */
export interface Track {
  id: string;
  name: string;
  type: TrackType;
  role?: "rhythm" | "bass" | "harmony" | "lead" | "fx";
  lane?: string;
  mute: boolean;
  solo: boolean;
  volume: number;
  steps: Step[];
  clipVariants?: Record<string, Step[]>;
  synthPatch: SynthPatch | null;
  deviceChain: DeviceChain;
}

/**
 * Chord progression item.
 */
export interface ChordEvent {
  chord: string;
  bars: number;
}

/**
 * Clip definition used inside arranger sections.
 */
export interface ArrangementClip {
  id: string;
  trackId: string;
  variantId: string;
  bars: number;
  startBar: number;
  muted: boolean;
}

/**
 * External timeline asset clip (audio/midi) for arrangement lanes.
 */
export interface ArrangementAssetClip {
  id: string;
  kind: "audio" | "midi";
  label: string;
  startBar: number;
  bars: number;
  trackId?: string;
}

/**
 * Automation targets that can be previewed and applied during arrangement playback.
 */
export type AutomationTarget =
  | "amp.attack"
  | "amp.decay"
  | "amp.sustain"
  | "amp.release"
  | "filter.cutoff"
  | "filter.resonance"
  | "fx.drive"
  | "fx.chorusMix"
  | "fx.stereoWidth";

/**
 * Automation point in a parameter lane.
 */
export interface AutomationPoint {
  bar: number;
  value: number;
}

/**
 * Automation lane for synth/effect parameter values.
 */
export interface AutomationLane {
  id: string;
  trackId: string;
  /** Optional source pattern clip this lane was generated for. */
  clipId?: string;
  /** Optional source variant when the lane follows a reusable pattern block. */
  variantId?: string;
  target: AutomationTarget;
  points: AutomationPoint[];
}

/**
 * Section block in a song arrangement.
 */
export interface ArrangementSection {
  id: string;
  name: string;
  bars: number;
  clips: ArrangementClip[];
  assets: ArrangementAssetClip[];
  automationLanes: AutomationLane[];
  chordProgression: ChordEvent[];
  locked: boolean;
}

/**
 * Scene maps named section stacks.
 */
export interface ArrangementScene {
  id: string;
  name: string;
  sectionIds: string[];
}

/**
 * Song arrangement for in-app playback timeline.
 */
export interface SongArrangement {
  id: string;
  bpm: number;
  totalBars: number;
  sectionOrder: string[];
  sections: ArrangementSection[];
  scenes: ArrangementScene[];
}

/**
 * Render planning metadata for future full-song export.
 */
export interface RenderPlan {
  stemMap: Array<{ trackId: string; stemName: string }>;
  sectionMarkers: Array<{ sectionId: string; startBar: number; endBar: number }>;
  tempoMap: Array<{ bar: number; bpm: number }>;
}

/**
 * Song-idea output model from AI.
 */
export interface SongIdea {
  title: string;
  mood: string;
  arrangement: SongArrangement;
  recommendedTracks: Array<{
    name: string;
    role: "rhythm" | "bass" | "harmony" | "lead" | "fx";
    instrumentPluginId: InstrumentPluginId;
    instrumentPresetId?: string;
  }>;
  renderPlan: RenderPlan;
}

/**
 * Riddim style guide used to constrain theory + rhythm decisions.
 */
export type RiddimStyleProfile =
  | "deep-minimal"
  | "wonky-riddim"
  | "modern-festival"
  | "dark-underground"
  | "tearout-adjacent";

/**
 * Harmonic context for theory-guided generation.
 */
export interface HarmonicPlan {
  key: string;
  mode: "minor" | "phrygian" | "dorian" | "harmonic-minor";
  scaleDegrees: Array<"1" | "b2" | "2" | "b3" | "3" | "4" | "b5" | "5" | "b6" | "6" | "b7" | "7">;
  progression: Array<{
    degree: "i" | "bII" | "bIII" | "iv" | "v" | "bV" | "bVI" | "bVII";
    chord: string;
    function: "tonic" | "predominant" | "dominant" | "tension" | "release";
    bars: number;
  }>;
}

/**
 * Section-level arrangement intent before clip rendering.
 */
export interface ArrangementIntent {
  sections: Array<{
    id: string;
    name: string;
    role: "intro" | "build" | "drop" | "break" | "outro";
    bars: number;
    energy: number;
  }>;
}

/**
 * Musical role for reusable generated arrangement motifs.
 */
export type PatternMotifRole = "base" | "call" | "response" | "fill" | "breakdown";

/**
 * Deterministic transform applied when deriving a motif variant.
 */
export type PatternMotifTransform =
  | "none"
  | "density-up"
  | "density-down"
  | "transpose-up"
  | "transpose-down"
  | "fill-ending"
  | "mute";

/**
 * Reusable pattern motif definition before conversion to clip variants.
 */
export interface PatternLibraryMotif {
  id: string;
  trackId: string;
  role: PatternMotifRole;
  sourceBar: number;
  transform: PatternMotifTransform;
}

/**
 * Bar-level placement of a reusable motif in a section lane.
 */
export interface PatternLibraryPlacement {
  sectionId: string;
  trackId: string;
  motifId: string;
  startBar: number;
  bars: number;
}

/**
 * Reusable motif library and section placement map.
 */
export interface PatternLibraryPlan {
  motifs: PatternLibraryMotif[];
  placements: PatternLibraryPlacement[];
}

/**
 * A single musical phrase event before conversion to Step[].
 */
export interface PhraseEvent {
  step: number;
  degree: string;
  octave: number;
  length: number;
  velocity: number;
  articulation: "stab" | "sustain" | "growl" | "silence" | "fill" | "answer";
  macroAutomation?: Partial<Record<"macro1" | "macro2" | "macro3" | "macro4", number>>;
}

/**
 * Motif plan generated by AI and rendered deterministically.
 */
export interface MotifPlan {
  bass: {
    contour: "falling" | "rising" | "static" | "leap-return";
    variationStrategy: "sequence" | "inversion" | "fragment" | "answer";
    density: number;
    events: PhraseEvent[];
  };
  lead: {
    relationship: "answer-bass" | "double-bass" | "counter-rhythm" | "sparse-hook";
    density: number;
    events: PhraseEvent[];
  };
  chords: {
    voicing: "stabs" | "sustained" | "offbeat" | "atmospheric";
    density: number;
    events: PhraseEvent[];
  };
  drums: {
    kickSteps: number[];
    snareSteps: number[];
    hatSteps: number[];
    swing: number;
  };
}

/**
 * AI-authored role and plugin direction.
 */
export interface InstrumentIntent {
  trackId: string;
  role: "rhythm" | "bass" | "harmony" | "lead" | "fx";
  instrumentPluginId: InstrumentPluginId;
  instrumentPresetId?: string;
}

/**
 * Sound-design direction for a track.
 */
export interface PatchIntent {
  trackId: string;
  character: "clean" | "gritty" | "metallic" | "wide" | "dark" | "vocal";
  macroTargets: Partial<Record<"macro1" | "macro2" | "macro3" | "macro4", number>>;
  effectBias: Array<EffectPluginId>;
}

/**
 * AI critic verdict for generated composition plans.
 */
export interface CriticResult {
  pass: boolean;
  score: number;
  reasons: string[];
}

/**
 * Full theory-guided composition plan before app materialization.
 */
export interface CompositionPlan {
  title: string;
  styleProfile: RiddimStyleProfile;
  mood: string;
  harmonicPlan: HarmonicPlan;
  arrangementIntent: ArrangementIntent;
  patternLibraryPlan: PatternLibraryPlan;
  motifPlan: MotifPlan;
  instrumentIntents: InstrumentIntent[];
  patchIntents: PatchIntent[];
  critic: CriticResult;
}

/**
 * Preset for one instrument patch.
 */
export interface InstrumentPreset {
  id: string;
  name: string;
  tags: string[];
  schemaVersion: number;
  instrumentPluginId: InstrumentPluginId;
  synthPatch: SynthPatch;
}

/**
 * Preset for effect chain only.
 */
export interface EffectChainPreset {
  id: string;
  name: string;
  tags: string[];
  schemaVersion: number;
  effects: EffectSlot[];
}

/**
 * Preset for full chain (instrument + effects).
 */
export interface PluginChainPreset {
  id: string;
  name: string;
  tags: string[];
  schemaVersion: number;
  chain: DeviceChain;
}

/**
 * Saved loop format.
 */
export interface Loop {
  id: string;
  name: string;
  bpm: number;
  tracks: Track[];
  arrangement?: SongArrangement;
  renderPlan?: RenderPlan;
  createdAt: string;
}

/**
 * Payload accepted by AI generation routes.
 */
export interface AIRequestPayload {
  prompt: string;
  bpm: number;
  bars: number;
  existingTracks: Array<Pick<Track, "id" | "name" | "type"> & { deviceChain?: DeviceChain }>;
  selectedTrackId?: string;
  selectedTrackChain?: DeviceChain;
  selectedArrangementSection?: {
    id: string;
    name: string;
    bars: number;
    clips: ArrangementClip[];
    automationLanes: AutomationLane[];
  };
}

/**
 * Standard pattern agent response.
 */
export interface AIPatternResult {
  tracks: Track[];
}

/**
 * Standard chord agent response.
 */
export interface AIChordResult {
  /** Chord symbols in section order (e.g. "Fm7", "Dbmaj7"). */
  chords: string[];
  /**
   * Optional bar spans per chord. When omitted, the client assigns one harmonic segment (`bars: 1`) per symbol.
   */
  progression?: ChordEvent[];
}

/**
 * Standard modulation agent response.
 */
export interface AIModulationResult {
  cutoff: number;
  resonance: number;
}

/**
 * Standard arrangement automation agent response.
 */
export interface AIAutomationResult {
  automationLanes: AutomationLane[];
}

/**
 * Standard arranger agent response.
 */
export interface AIArrangerResult {
  sections: Array<{ name: string; bars: number }>;
}

/**
 * Full song-idea response shape.
 */
export interface AISongIdeaResult {
  songIdea: SongIdea;
}

/**
 * Theory-guided riddim composer response.
 */
export interface AIRiddimComposerResult {
  compositionPlan: CompositionPlan;
  songIdea: SongIdea;
  /** Set when the server applied `composerOptions.applyDespiteLowCriticScore`. */
  criticBypassed?: boolean;
}

/**
 * Standard mix coach response.
 */
export interface AIMixCoachResult {
  suggestions: string[];
}

/**
 * UI toast contract.
 */
export interface ToastMessage {
  id: string;
  tone: "info" | "error" | "success";
  title: string;
  detail?: string;
}
