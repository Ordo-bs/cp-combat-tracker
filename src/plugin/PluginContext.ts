import type { Plugin } from "obsidian";
import { CombatActionExecutor } from "../actions/CombatActionExecutor";
import type { CombatActionContext } from "../actions/CombatActionContext";
import { SaveResolver } from "../domain/rules/resolvers/SaveResolver";
import { EventDispatcher } from "../events/EventDispatcher";
import { EncounterRepository } from "../infrastructure/repository/EncounterRepository";
import type { IEncounterRepository } from "../infrastructure/repository/IEncounterRepository";
import { CombatService } from "../services/CombatService";
import { CombatSheetFactory } from "../services/CombatSheetFactory";
import { DamageThresholdService } from "../services/DamageThresholdService";
import { DiceService } from "../services/DiceService";
import { CombatLogService } from "../services/CombatLogService";
import { EncounterService } from "../services/EncounterService";
import { InitiativeService } from "../services/InitiativeService";
import { TemplateService } from "../services/TemplateService";
import { ValidationService } from "../services/ValidationService.impl";
import { DamageEngine } from "../services/damage/DamageEngine";
import { DamageTypeRegistry } from "../services/damage/DamageTypeRegistry";
import type { ILogger } from "../util/logger";
import { ConsoleLogger } from "../util/logger";

/**
 * Dependency container wired during plugin load.
 */
export class PluginContext {
  readonly logger: ILogger;
  readonly dispatcher: EventDispatcher;
  readonly repository: IEncounterRepository;
  readonly diceService: DiceService;
  readonly validationService: ValidationService;
  readonly damageThresholdService: DamageThresholdService;
  readonly factory: CombatSheetFactory;
  readonly encounterService: EncounterService;
  readonly combatLogService: CombatLogService;
  readonly initiativeService: InitiativeService;
  readonly combatService: CombatService;
  readonly templateService: TemplateService;
  readonly actionExecutor: CombatActionExecutor;
  readonly stunResolver: SaveResolver;
  readonly deathResolver: SaveResolver;
  readonly damageTypeRegistry: DamageTypeRegistry;
  readonly damageEngine: DamageEngine;

  constructor(plugin: Plugin) {
    this.logger = new ConsoleLogger();
    this.dispatcher = new EventDispatcher();
    this.repository = new EncounterRepository(plugin);
    this.diceService = new DiceService();
    this.validationService = new ValidationService();
    this.damageThresholdService = new DamageThresholdService();
    this.factory = new CombatSheetFactory(this.diceService);
    this.encounterService = new EncounterService(this.repository, this.dispatcher);
    this.combatLogService = new CombatLogService(this.repository, this.dispatcher);
    this.initiativeService = new InitiativeService(
      this.repository,
      this.validationService,
      this.dispatcher,
    );
    this.damageTypeRegistry = new DamageTypeRegistry();
    this.damageEngine = new DamageEngine(
      this.damageTypeRegistry,
      this.diceService,
      this.damageThresholdService,
      this.logger,
    );
    this.combatService = new CombatService(
      this.repository,
      this.encounterService,
      this.initiativeService,
      this.validationService,
      this.factory,
      this.dispatcher,
      this.damageEngine,
      this.diceService,
    );
    this.templateService = new TemplateService(this.factory);
    this.stunResolver = new SaveResolver();
    this.deathResolver = new SaveResolver();
    this.actionExecutor = new CombatActionExecutor(this.createActionContext());
  }

  private createActionContext(): CombatActionContext {
    return {
      combatService: this.combatService,
      diceService: this.diceService,
      damageThresholdService: this.damageThresholdService,
      stunResolver: this.stunResolver,
      deathResolver: this.deathResolver,
      dispatcher: this.dispatcher,
    };
  }

  async initialize(): Promise<void> {
    await this.repository.load();
  }

  async shutdown(): Promise<void> {
    await this.repository.save();
    this.dispatcher.clear();
  }
}
