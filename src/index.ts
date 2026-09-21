import type { TSONDBTypes } from "@optolith/database-schema"
import type {
  ResolvedNewSkillApplication,
  ResolvedSelectOption,
  ResolvedSkillUse,
} from "@optolith/database-schema/cache"
import type {
  ActivatableIdentifier,
  Errata,
  PublicationRefs,
  Skill_ID,
} from "@optolith/database-schema/gen"
import type { TSONDB } from "tsondb"
import type { EntityDescriptionCreator } from "./creator.js"
import { getActivatableEntityDescription } from "./entities/activatable.js"
import { getAlternativeRuleEntityDescription } from "./entities/alternativeRule.js"
import { getAttributeEntityDescription } from "./entities/attribute.js"
import {
  getCloseCombatTechniqueEntityDescription,
  getRangedCombatTechniqueEntityDescription,
} from "./entities/combatTechnique.js"
import {
  getConditionEntityDescription,
  getMetaConditionEntityDescription,
} from "./entities/condition.js"
import { getCultureEntityDescription } from "./entities/culture.js"
import { getCurriculumEntityDescription } from "./entities/curriculum.js"
import { getDerivedCharacteristicEntityDescription } from "./entities/derivedCharacteristic.js"
import { getDiseaseEntityDescription } from "./entities/disease.js"
import { getElixirEntityDescription } from "./entities/elixir.js"
import { getBookEntityDescription } from "./entities/book.js"
import { getEquipmentEntityDescription } from "./entities/equipment.js"
import { getEquipmentPackageEntityDescription } from "./entities/equipmentPackage.js"
import { getExperienceLevelEntityDescription } from "./entities/experienceLevel.js"
import { getFocusRuleEntityDescription } from "./entities/focusRule.js"
import { getInfluenceEntityDescription } from "./entities/influence.js"
import {
  getBlessingEntityDescription,
  getCeremonyEntityDescription,
  getLiturgicalChantEntityDescription,
} from "./entities/liturgicalChant.js"
import { getOptionalRuleEntityDescription } from "./entities/optionalRule.js"
import type { GetResolvedSelectOptionById } from "./entities/partial/prerequisites/single/activatable.js"
import { getPersonalityTraitEntityDescription } from "./entities/personalityTrait.js"
import { getPoisonEntityDescription } from "./entities/poison.js"
import { getProfessionVersionEntityDescription } from "./entities/profession.js"
import { getRaceEntityDescription } from "./entities/race.js"
import { getSexPracticeEntityDescription } from "./entities/sexPractice.js"
import { getSkillEntityDescription } from "./entities/skill.js"
import {
  getAnimistPowerEntityDescription,
  getBannzeichenEntityDescription,
  getCantripEntityDescription,
  getCurseEntityDescription,
  getDominationRitualEntityDescription,
  getElvenMagicalSongEntityDescription,
  getFamiliarsTrickEntityDescription,
  getGeodeRitualEntityDescription,
  getGoblinRitualEntityDescription,
  getJesterTrickEntityDescription,
  getMagicalDanceEntityDescription,
  getMagicalMelodyEntityDescription,
  getMagicalRuneEntityDescription,
  getRitualEntityDescription,
  getSpellEntityDescription,
  getZibiljaRitualEntityDescription,
} from "./entities/spell.js"
import { getStateEntityDescription } from "./entities/state.js"
import type {
  CountInstances,
  GetAllChildInstancesForParent,
  GetAllInstances,
  GetInstanceById,
} from "./helpers/getTypes.js"
import type { LocaleEnvironment } from "./helpers/locale.js"
import { defaultPublicationOptions, type PublicationOptions } from "./references/publicationOptions.js"

export { defaultPublicationOptions, type PublicationOptions }
export type { LocaleEnvironment }

/**
 * A JSON representation of the rules text for a library entry.
 */
export type EntityDescription = {
  title: string
  subtitle?: string
  badge?: RawEntityDescriptionBadge
  className: string
  body: EntityDescriptionSection[]
  errata?: { date: string; description: string }[]
  references?: string
}

/**
 * A labeled or unlabeled section of a library entry text.
 */
export type EntityDescriptionSection =
  EntityDescriptionSectionContent | LabeledEntityDescriptionSection<EntityDescriptionSectionContent>

/**
 * A labeled section of a library entry text.
 */
export type LabeledEntityDescriptionSection<
  Content extends EntityDescriptionSectionContent | RawEntityDescriptionSectionContent,
> = {
  type: "labeled"
  label: string
  value: EntityDescriptionSectionContent<Content>
}

/**
 * A slice of the content of a library entry text.
 */
export type EntityDescriptionSectionContent<DL = DefinitionListEntityDescriptionSection> =
  PlainEntityDescriptionSection | DL | TableEntityDescriptionSection

/**
 * A JSON representation of the rules text for a library entry that has not been
 * cleaned up.
 */
export type RawEntityDescription = {
  title: string
  subtitle?: string
  badge?: RawEntityDescriptionBadge
  className: string
  body: (RawEntityDescriptionSection | undefined)[]
  errata?: Errata
  references?: PublicationRefs
}

/**
 * A badge that can be displayed next to the title of a library entry.
 */
export type RawEntityDescriptionBadge = {
  type: "level" | "armedCombat" | "unarmedCombat"
  value: string
}

/**
 * A labeled or unlabeled section of a library entry text.
 */
export type RawEntityDescriptionSection =
  | RawEntityDescriptionSectionContent
  | LabeledEntityDescriptionSection<RawEntityDescriptionSectionContent>

/**
 * A slice of the content of a library entry text.
 */
export type RawEntityDescriptionSectionContent<DL = RawDefinitionListEntityDescriptionSection> =
  PlainEntityDescriptionSection | DL | TableEntityDescriptionSection

/**
 * A plain text, possibly containing Markdown syntax.
 */
export type PlainEntityDescriptionSection = {
  type: "plain"
  text: string
}

/**
 * A list of labeled values, such as prerequisites or quality levels.
 */
export type DefinitionListEntityDescriptionSection = {
  type: "definitionList"
  items: DefinitionListEntityDescriptionSectionItem[]
}

/**
 * A list of labeled values, such as prerequisites or quality levels, nested within another definition list.
 */
export type NestedDefinitionListEntityDescriptionSection = {
  type: "definitionList"

  /**
   * How to render this definition list.
   *
   * - `"hidden"`: The definition list does not look like it is nested, it just looks like it belongs to its parent definition list.
   * - `"nested"`: The definition list is visually nested inside its parent definition list, usually indented and with italic labels instead of bold ones.
   */
  style: "hidden" | "nested"

  items: DefinitionListEntityDescriptionSectionItem[]
}

/**
 * A list of labeled values, such as prerequisites or quality levels.
 */
export type RawDefinitionListEntityDescriptionSection = {
  type: "definitionList"
  items: (RawDefinitionListEntityDescriptionSectionItem | undefined)[]
}

/**
 * A list of labeled values, such as prerequisites or quality levels, nested within another definition list.
 */
export type RawNestedDefinitionListEntityDescriptionSection = {
  type: "definitionList"

  /**
   * How to render this definition list.
   *
   * - `"hidden"`: The definition list does not look like it is nested, it just looks like it belongs to its parent definition list.
   * - `"nested"`: The definition list is visually nested inside its parent definition list, usually indented and with italic labels instead of bold ones.
   */
  style: "hidden" | "nested"
  items: (RawDefinitionListEntityDescriptionSectionItem | undefined)[]
}

/**
 * A single labeled value in a definition list.
 */
export type DefinitionListEntityDescriptionSectionItem = {
  label: string
  value: string | EntityDescriptionSectionContent<NestedDefinitionListEntityDescriptionSection>[]
}

/**
 * A single labeled value in a definition list.
 */
export type RawDefinitionListEntityDescriptionSectionItem = {
  label: string
  value:
    | string
    | (
        | RawEntityDescriptionSectionContent<RawNestedDefinitionListEntityDescriptionSection>
        | undefined
      )[]
}

/**
 * A table with a header, rows, and an optional footer.
 */
export type TableEntityDescriptionSection = {
  type: "table"
  header: string[]
  rows: string[][]
  footer?: string[]
}

/**
 * Data passed to an EntityDescriptionCreator function, with the entity type as a type parameter for better type inference.
 */
export type TypedCreatorData = {
  getInstanceById: GetInstanceById<keyof TSONDBTypes["entityMap"]>
  getAllInstances: GetAllInstances<keyof TSONDBTypes["entityMap"]>
  countInstances: CountInstances<keyof TSONDBTypes["entityMap"]>
  getChildInstancesForInstanceId: GetAllChildInstancesForParent<keyof TSONDBTypes["childEntityMap"]>
  getResolvedSelectOptionById: GetResolvedSelectOptionById
  getAllResolvedSelectOptions: GetAllResolvedSelectOptions
  getAllResolvedNewSkillApplications: GetAllResolvedNewSkillApplications
  getAllResolvedSkillUses: GetAllResolvedSkillUses
  idMap: IdMap
}

type TypedCreator<E extends keyof TSONDBTypes["entityMap"]> = EntityDescriptionCreator<
  E,
  TypedCreatorData
>

const registeredEntityDescriptionCreators = {
  // rules
  // CoreRule: getCoreRuleEntityDescription,
  FocusRule: getFocusRuleEntityDescription,
  OptionalRule: getOptionalRuleEntityDescription,
  AlternativeRule: getAlternativeRuleEntityDescription,
  Condition: getConditionEntityDescription,
  MetaCondition: getMetaConditionEntityDescription,
  State: getStateEntityDescription,
  // character creation
  ExperienceLevel: getExperienceLevelEntityDescription,
  DerivedCharacteristic: getDerivedCharacteristicEntityDescription,
  Race: getRaceEntityDescription,
  Culture: getCultureEntityDescription,
  ProfessionVersion: getProfessionVersionEntityDescription,
  Advantage: getActivatableEntityDescription,
  Disadvantage: getActivatableEntityDescription,
  // core values
  Attribute: getAttributeEntityDescription,
  Skill: getSkillEntityDescription,
  CloseCombatTechnique: getCloseCombatTechniqueEntityDescription,
  RangedCombatTechnique: getRangedCombatTechniqueEntityDescription,
  // spellworks
  Cantrip: getCantripEntityDescription,
  Spell: getSpellEntityDescription,
  Ritual: getRitualEntityDescription,
  // magical actions
  AnimistPower: getAnimistPowerEntityDescription,
  Curse: getCurseEntityDescription,
  DominationRitual: getDominationRitualEntityDescription,
  ElvenMagicalSong: getElvenMagicalSongEntityDescription,
  GeodeRitual: getGeodeRitualEntityDescription,
  GoblinRitual: getGoblinRitualEntityDescription,
  JesterTrick: getJesterTrickEntityDescription,
  MagicalDance: getMagicalDanceEntityDescription,
  MagicalMelody: getMagicalMelodyEntityDescription,
  MagicalRune: getMagicalRuneEntityDescription,
  ZibiljaRitual: getZibiljaRitualEntityDescription,
  // auxiliary magical
  Curriculum: getCurriculumEntityDescription,
  FamiliarsTrick: getFamiliarsTrickEntityDescription,
  // work of the gods
  Blessing: getBlessingEntityDescription,
  LiturgicalChant: getLiturgicalChantEntityDescription,
  Ceremony: getCeremonyEntityDescription,
  // special abilities and enchantments
  AdvancedCombatSpecialAbility: getActivatableEntityDescription,
  AdvancedKarmaSpecialAbility: getActivatableEntityDescription,
  AdvancedMagicalSpecialAbility: getActivatableEntityDescription,
  AdvancedSkillSpecialAbility: getActivatableEntityDescription,
  AncestorGlyph: getActivatableEntityDescription,
  ArcaneOrbEnchantment: getActivatableEntityDescription,
  AttireEnchantment: getActivatableEntityDescription,
  Bannzeichen: getBannzeichenEntityDescription,
  Beutelzauber: getActivatableEntityDescription,
  BlessedTradition: getActivatableEntityDescription,
  BowlEnchantment: getActivatableEntityDescription,
  BrawlingSpecialAbility: getActivatableEntityDescription,
  CauldronEnchantment: getActivatableEntityDescription,
  CeremonialItemSpecialAbility: getActivatableEntityDescription,
  ChronicleEnchantment: getActivatableEntityDescription,
  CombatSpecialAbility: getActivatableEntityDescription,
  CombatStyleSpecialAbility: getActivatableEntityDescription,
  CommandSpecialAbility: getActivatableEntityDescription,
  DaggerRitual: getActivatableEntityDescription,
  FamiliarSpecialAbility: getActivatableEntityDescription,
  FatePointSexSpecialAbility: getActivatableEntityDescription,
  FatePointSpecialAbility: getActivatableEntityDescription,
  FoolsHatEnchantment: getActivatableEntityDescription,
  GeneralSpecialAbility: getActivatableEntityDescription,
  Haubenzauber: getActivatableEntityDescription,
  Hauerkettenzauber: getActivatableEntityDescription,
  InstrumentEnchantment: getActivatableEntityDescription,
  KarmaSpecialAbility: getActivatableEntityDescription,
  Keulenzauber: getActivatableEntityDescription,
  Krallenkettenzauber: getActivatableEntityDescription,
  Kristallkugelzauber: getActivatableEntityDescription,
  LiturgicalStyleSpecialAbility: getActivatableEntityDescription,
  LycantropicGift: getActivatableEntityDescription,
  MagicalSign: getActivatableEntityDescription,
  MagicalSpecialAbility: getActivatableEntityDescription,
  MagicalTradition: getActivatableEntityDescription,
  MagicStyleSpecialAbility: getActivatableEntityDescription,
  OrbEnchantment: getActivatableEntityDescription,
  PactGift: getActivatableEntityDescription,
  ProtectiveWardingCircleSpecialAbility: getActivatableEntityDescription,
  RingEnchantment: getActivatableEntityDescription,
  Schweinetrommelzauber: getActivatableEntityDescription,
  Sermon: getActivatableEntityDescription,
  SexSpecialAbility: getActivatableEntityDescription,
  SickleRitual: getActivatableEntityDescription,
  SikaryanDrainSpecialAbility: getActivatableEntityDescription,
  SkillStyleSpecialAbility: getActivatableEntityDescription,
  SpellSwordEnchantment: getActivatableEntityDescription,
  StaffEnchantment: getActivatableEntityDescription,
  ToyEnchantment: getActivatableEntityDescription,
  Trinkhornzauber: getActivatableEntityDescription,
  VampiricGift: getActivatableEntityDescription,
  Vision: getActivatableEntityDescription,
  WandEnchantment: getActivatableEntityDescription,
  WeaponEnchantment: getActivatableEntityDescription,
  // equipment
  Ammunition: getEquipmentEntityDescription,
  Animal: getEquipmentEntityDescription,
  AnimalCare: getEquipmentEntityDescription,
  Armor: getEquipmentEntityDescription,
  BandageOrRemedy: getEquipmentEntityDescription,
  Book: getBookEntityDescription,
  CeremonialItem: getEquipmentEntityDescription,
  Clothes: getEquipmentEntityDescription,
  ClothingPackage: getEquipmentEntityDescription,
  Container: getEquipmentEntityDescription,
  Elixir: getElixirEntityDescription,
  EquipmentOfBlessedOnes: getEquipmentEntityDescription,
  GemOrPreciousStone: getEquipmentEntityDescription,
  IlluminationLightSource: getEquipmentEntityDescription,
  IlluminationRefillOrSupply: getEquipmentEntityDescription,
  Jewelry: getEquipmentEntityDescription,
  Laboratory: getEquipmentEntityDescription,
  Liebesspielzeug: getEquipmentEntityDescription,
  LuxuryGood: getEquipmentEntityDescription,
  MagicalArtifact: getEquipmentEntityDescription,
  MusicalInstrument: getEquipmentEntityDescription,
  Newspaper: getEquipmentEntityDescription,
  OrienteeringAid: getEquipmentEntityDescription,
  Poison: getPoisonEntityDescription,
  RopeOrChain: getEquipmentEntityDescription,
  Stationery: getEquipmentEntityDescription,
  ThievesTool: getEquipmentEntityDescription,
  ToolOfTheTrade: getEquipmentEntityDescription,
  TravelGearOrTool: getEquipmentEntityDescription,
  Vehicle: getEquipmentEntityDescription,
  Weapon: getEquipmentEntityDescription,
  WeaponAccessory: getEquipmentEntityDescription,
  EquipmentPackage: getEquipmentPackageEntityDescription,
  // other
  Disease: getDiseaseEntityDescription,
  AnimalDisease: getDiseaseEntityDescription,
  Influence: getInfluenceEntityDescription,
  PersonalityTrait: getPersonalityTraitEntityDescription,
  SexPractice: getSexPracticeEntityDescription,
} satisfies Partial<{ [E in keyof TSONDBTypes["entityMap"]]: TypedCreator<E> }>

/**
 * The set of entities for which there is a registered description creator function.
 */
export type AvailableCreatorEntity = keyof typeof registeredEntityDescriptionCreators

/**
 * Checks if there is a registered description creator for the given entity name.
 */
export const isSupportedEntity = (entityName: string): entityName is AvailableCreatorEntity =>
  entityName in registeredEntityDescriptionCreators

/**
 * The list of entity names for which there is a registered description creator function.
 */
export const supportedEntities = Object.keys(
  registeredEntityDescriptionCreators,
).toSorted() as AvailableCreatorEntity[]

/**
 * Human-readable aliases for certain identifiers in the database.
 */
export type IdMap = {
  DerivedCharacteristic: Record<
    "LifePoints" | "Spirit" | "Toughness" | "Initiative" | "Movement",
    string
  >
  ExperienceLevel: Record<"Experienced", string>
}

/**
 * A function that returns all resolved select options for an activatable entry.
 */
export type GetAllResolvedSelectOptions = (id: ActivatableIdentifier) => ResolvedSelectOption[]

/**
 * A function that returns all new skill applications for a skill.
 */
export type GetAllResolvedNewSkillApplications = (id: Skill_ID) => ResolvedNewSkillApplication[]

/**
 * A function that returns all skill uses for a skill.
 */
export type GetAllResolvedSkillUses = (id: Skill_ID) => ResolvedSkillUse[]

/**
 * Get a JSON representation of the rules text for an entry in the database.
 */
// eslint-disable-next-line @typescript-eslint/no-unnecessary-type-parameters -- false positive
export const getEntityDescription = <E extends AvailableCreatorEntity>(
  database: TSONDB<TSONDBTypes>,
  localeEnv: LocaleEnvironment,
  idMap: IdMap,
  getResolvedSelectOptionById: GetResolvedSelectOptionById,
  getAllResolvedSelectOptions: GetAllResolvedSelectOptions,
  getAllResolvedNewSkillApplications: GetAllResolvedNewSkillApplications,
  getAllResolvedSkillUses: GetAllResolvedSkillUses,
  entityName: E,
  instanceId: string,
  publicationOptions: PublicationOptions = defaultPublicationOptions,
): EntityDescription | undefined => {
  const creator = registeredEntityDescriptionCreators[entityName] as TypedCreator<E>

  const instance = database.getInstanceOfEntityById(entityName, instanceId)

  if (!instance) {
    return undefined
  }

  return creator(
    {
      getInstanceById: database.getInstanceOfEntityById.bind(database),
      getAllInstances: database.getAllInstanceContainersOfEntity.bind(database),
      countInstances: database.countInstancesOfEntity.bind(database),
      getChildInstancesForInstanceId: (childEntityName, parentId) =>
        database.getAllChildInstanceContainersForParent(childEntityName, parentId),
      getResolvedSelectOptionById,
      getAllResolvedSelectOptions,
      getAllResolvedNewSkillApplications,
      getAllResolvedSkillUses,
      idMap,
    },
    localeEnv,
    { entity: entityName, content: instance, id: instanceId },
    { publications: publicationOptions },
  )
}
