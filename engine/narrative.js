// ============================================================================
// engine/narrative.js
// ============================================================================
//
// Engine.Narrative is a thin wrapper around an inkjs Story, exposing a small
// JS-side surface for game scenes to drive branching narrative content
// authored in inkle's ink scripting language.
//
// Depends on:
//   inkjs (global). Must be loaded before any Engine.Narrative instance is
//   constructed. Vendored at engine/lib/inkjs.js but, per ADR-0018,
//   intentionally NOT included in engine/engine.bundle.js because it is
//   large (~250 KB) and game-specific. Games that use narrative include the
//   vendored library separately in their build, before the engine bundle.
//
// Depended on by:
//   Per-game encounter scripts and scenes that drive ink content. No other
//   engine module depends on Narrative.
//
// Usage:
//   const n = new Engine.Narrative(inkSourceString);
//   n.bindExternal('start_combat', (enemyId) => { ... });
//   n.observe('scrap', (value) => updateHud(value));
//   n.setVar('hull', ship.hull);
//   const lines = n.continue();        // [{text, tags}, ...]
//   const choices = n.getChoices();    // [{index, text, tags}, ...]
//   n.choose(0);
//   if (n.hasEnded) { ... }
// ============================================================================

var Engine = Engine || {};

class Narrative {
  constructor(source, options = {}) {
    if (typeof inkjs === 'undefined') {
      throw new Error(
        'Engine.Narrative requires inkjs to be loaded. Include ' +
        'engine/lib/inkjs.js before the engine bundle in your build. See ADR-0018.'
      );
    }
    if (options.compiled) {
      this._story = new inkjs.Story(source);
    } else {
      this._story = new inkjs.Compiler(source).Compile();
    }
  }

  // Advance the story, collecting every line emitted until the next choice
  // point or story end. Returns an array of { text, tags } objects.
  continue() {
    const lines = [];
    while (this._story.canContinue) {
      const raw = this._story.Continue();
      const text = (typeof raw === 'string' ? raw : '').replace(/\n$/, '');
      const tags = this._story.currentTags ? [...this._story.currentTags] : [];
      lines.push({ text, tags });
    }
    return lines;
  }

  // Available choices at the current story point, or [] if none.
  getChoices() {
    return this._story.currentChoices.map((c) => ({
      index: c.index,
      text: c.text,
      tags: c.tags ? [...c.tags] : []
    }));
  }

  // Select a choice by its index. After this, the story is ready for another
  // continue() call.
  choose(index) {
    this._story.ChooseChoiceIndex(index);
  }

  // Read an ink variable by name. Returns undefined if not declared.
  getVar(name) {
    return this._story.variablesState[name];
  }

  // Write an ink variable. The variable must be declared in the ink source
  // (with VAR) for the write to have effect.
  setVar(name, value) {
    this._story.variablesState[name] = value;
  }

  // Bind a JS function that ink can invoke via an EXTERNAL declaration.
  // The ink script must declare it as: EXTERNAL fn_name(arg1, arg2)
  bindExternal(name, fn) {
    this._story.BindExternalFunction(name, fn);
  }

  // Register a callback that fires when the named ink variable changes.
  // The callback is invoked with the new value.
  observe(name, fn) {
    this._story.ObserveVariable(name, (_varName, value) => fn(value));
  }

  // Jump to a named knot or stitch. Path is a dot-separated string like
  // 'sector_one' or 'sector_one.shop_intro'.
  goTo(path) {
    this._story.ChoosePathString(path);
  }

  // Serialize narrative state to a JSON string suitable for storing via
  // Engine.storage alongside other game state.
  saveState() {
    return this._story.state.toJson();
  }

  // Restore state from a JSON string previously returned by saveState().
  loadState(json) {
    this._story.state.LoadJson(json);
  }

  // True when the story has nothing more to emit and offers no choices.
  get hasEnded() {
    return !this._story.canContinue && this._story.currentChoices.length === 0;
  }

  // Underlying inkjs Story instance. Exposed for advanced uses where the
  // wrapper methods do not cover the required operation.
  get story() {
    return this._story;
  }
}

Engine.Narrative = Narrative;
