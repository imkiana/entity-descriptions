import { isNotNullish } from "@elyukai/utils/nullable"
import { Reader } from "@elyukai/utils/reader"
import { assertExhaustive } from "@elyukai/utils/typeSafety"
import type {
  ChildEntityMap,
  EntityMap,
  FastSkillModificationLevelConfig,
  ResponsiveText,
  ResponsiveTextOptional,
  SkillModificationLevel,
  SlowSkillModificationLevelConfig,
} from "@optolith/database-schema/gen"
import type { IdArgsVariant } from "tsondb/schema/gen"
import type {
  GetAllChildInstancesForParent,
  GetAllInstances,
  GetInstanceById,
} from "../../helpers/getTypes.js"
import type { LocaleCompare, LocaleJoin, LocaleJoinType } from "../../helpers/locale.js"
import type {
  Format,
  LocaleMap,
  Translate,
  TranslateMap,
  TranslationKeyMatchingParamsOfKey,
  TranslationParamsInArray,
  Translations,
} from "../../helpers/translate.js"
import {
  attributedCustomName,
  attributedName,
  attributedNameFromInstance,
  customName,
} from "./markdown.js"
import { Speed } from "./rated/activatable/speed.js"
import { responsive, ResponsiveTextSize } from "./responsiveText.js"
import { formatEnergy, type EnergyUnit } from "./units/energy.js"
import { MISSING_VALUE } from "./unknown.js"

// Specialized constructors for common contexts

/**
 * Treats the text as a translation string and applies supplied arguments.
 */
export const formatR = (
  text: string,
  args?: Record<string, unknown>,
): Reader<{ format: Format }, string> => Reader.asks(env => env.format(text, args))

/**
 * Creates a value from a translation key.
 */
export const translateR = <K extends keyof Translations>(
  key: K,
  ...rest: TranslationParamsInArray<K>
): Reader<{ translate: Translate }, string> => Reader.asks(env => env.translate(key, ...rest))

/**
 * Returns the `translate` function from the context.
 */
export const translateFnR: Reader<{ translate: Translate }, Translate> = Reader.asks(
  env => env.translate,
)

/**
 * Takes the appropriate translation from a locale map.
 */
export const translateMapR = <T>(
  map: LocaleMap<T> | undefined,
): Reader<{ translateMap: TranslateMap }, T | undefined> =>
  Reader.asks(env => env.translateMap(map))

/**
 * Returns the `translateMap` function from the context.
 */
export const translateMapFnR: Reader<{ translateMap: TranslateMap }, TranslateMap> = Reader.asks(
  env => env.translateMap,
)

/**
 * Retrieves the translation for the current locale from the given value’s `translations` property.
 * @returns `undefined` if the value does not exist or does not have a translation for the current locale, otherwise the translation.
 */
export const translationR = <T>(
  value: { translations?: LocaleMap<T> } | undefined,
): Reader<{ translateMap: TranslateMap }, T | undefined> =>
  Reader.asks(env => env.translateMap(value?.translations))

/**
 * Retrieves a specific property of the specified entry.
 */
export const mapTranslationR = <
  E extends keyof EntityMap &
    {
      [K in keyof EntityMap]: EntityMap[K] extends { translations: LocaleMap<object> } ? K : never
    }[keyof EntityMap],
  R,
>(
  ...args: [
    ...IdArgsVariant<EntityMap, E>,
    fn: (
      translation: EntityMap[E] extends { translations: LocaleMap<infer T> }
        ? T | undefined
        : never,
    ) => R,
  ]
): Reader<{ translateMap: TranslateMap; getInstanceById: GetInstanceById<E> }, R | undefined> =>
  Reader.asks(env => {
    const idArgs = args.length === 3 ? ([args[0], args[1]] as const) : ([args[0]] as const)
    const fn = args.length === 3 ? args[2] : args[1]
    const translation = env.translateMap<object>(env.getInstanceById(...idArgs)?.translations)
    return fn(
      translation as EntityMap[E] extends { translations: LocaleMap<infer T> }
        ? T | undefined
        : never,
    )
  })

/**
 * Retrieves the `name` property of the specified entry.
 */
export const nameR = <
  E extends {
    [K in keyof EntityMap]: EntityMap[K] extends { translations: LocaleMap<{ name: string }> }
      ? K
      : never
  }[keyof EntityMap],
>(
  ...args: IdArgsVariant<EntityMap, E>
): Reader<
  { translateMap: TranslateMap; getInstanceById: GetInstanceById<E> },
  string | undefined
> => Reader.asks(env => env.translateMap(env.getInstanceById(...args)?.translations)?.name)

/**
 * Retrieves the `name` property of the specified entry.
 *
 * Returns {@link MISSING_VALUE} if there is no name for the entry in the locale. This can happen if the entry itself does not exist, or it does not have a translation for the current locale.
 */
export const strictNameR = <
  E extends {
    [K in keyof EntityMap]: EntityMap[K] extends { translations: LocaleMap<{ name: string }> }
      ? K
      : never
  }[keyof EntityMap],
>(
  ...args: IdArgsVariant<EntityMap, E>
): Reader<{ translateMap: TranslateMap; getInstanceById: GetInstanceById<E> }, string> =>
  nameR(...args).map(name => name ?? MISSING_VALUE)

/**
 * Retrieves the `name` property of the specified entry in an attributed string.
 */
export const attributedNameR = <
  E extends {
    [K in keyof EntityMap]: EntityMap[K] extends { translations: LocaleMap<{ name: string }> }
      ? K
      : never
  }[keyof EntityMap],
>(
  context: string,
  ...args: IdArgsVariant<EntityMap, E>
): Reader<
  { translateMap: TranslateMap; getInstanceById: GetInstanceById<E> },
  string | undefined
> => Reader.asks(env => attributedName(env.translateMap, env.getInstanceById, context, ...args))

/**
 * Retrieves the `name` property of the specified entry in an attributed string.
 */
export const attributedNameFromInstanceR = (
  instance: { translations: LocaleMap<{ name: string }> } | undefined,
  context: string,
  ...args: IdArgsVariant<EntityMap, keyof EntityMap>
): Reader<{ translateMap: TranslateMap }, string | undefined> =>
  Reader.asks(env => attributedNameFromInstance(env.translateMap, instance, context, ...args))

/**
 * Applies a function to the translation of the specified entry and renders it in an attributed string.
 */
export const attributedCustomNameR = <
  E extends {
    [K in keyof EntityMap]: EntityMap[K] extends { translations: LocaleMap<{ name: string }> }
      ? K
      : never
  }[keyof EntityMap],
>(
  context: string,
  fn: (translation: EntityMap[E]["translations"][string]) => string,
  ...args: IdArgsVariant<EntityMap, E>
): Reader<
  { translateMap: TranslateMap; getInstanceById: GetInstanceById<E> },
  string | undefined
> =>
  Reader.asks(env =>
    attributedCustomName(env.translateMap, env.getInstanceById, context, fn, ...args),
  )

/**
 * Applies a function to the translation of the specified entry.
 */
export const customNameR = <
  E extends {
    [K in keyof EntityMap]: EntityMap[K] extends { translations: LocaleMap<{ name: string }> }
      ? K
      : never
  }[keyof EntityMap],
>(
  fn: (translation: EntityMap[E]["translations"][string]) => string,
  ...args: IdArgsVariant<EntityMap, E>
): Reader<
  { translateMap: TranslateMap; getInstanceById: GetInstanceById<E> },
  string | undefined
> => Reader.asks(env => customName(env.translateMap, env.getInstanceById, fn, ...args))

/**
 * Joins a list of strings according to the locale’s rules for the given type.
 */
export const localeJoinR = (
  arr: string[],
  type: LocaleJoinType,
): Reader<{ localeJoin: LocaleJoin }, string> => Reader.asks(env => env.localeJoin(arr, type))

/**
 * Returns a function to retrieve an instance from the database by its entity name and ID.
 */
export const getInstanceByIdFnR = <E extends keyof EntityMap = never>(): Reader<
  { getInstanceById: GetInstanceById<E> },
  GetInstanceById<E>
> => Reader.asks(env => env.getInstanceById)

/**
 * Retrieves an instance from the database by its entity name and ID.
 */
export const getInstanceByIdR = <E extends keyof EntityMap>(
  ...args: IdArgsVariant<EntityMap, E>
): Reader<{ getInstanceById: GetInstanceById<E> }, EntityMap[E] | undefined> =>
  Reader.asks(env => env.getInstanceById(...args))

/**
 * Retrieves all instances of an entity from the database by their entity name.
 */
export const getAllInstancesR = <E extends keyof EntityMap>(
  entityName: E,
): Reader<{ getAllInstances: GetAllInstances<E> }, { id: string; content: EntityMap[E] }[]> =>
  Reader.asks(env => env.getAllInstances(entityName))

/**
 * Retrieves all child instances of an entity from the database by their child entity name and their parent’s identifier.
 */
export const getChildInstancesForInstanceIdR = <CE extends keyof ChildEntityMap>(
  entityName: CE,
  parentId: ChildEntityMap[CE][2],
): Reader<
  { getChildInstancesForInstanceId: GetAllChildInstancesForParent<CE> },
  { id: string; content: ChildEntityMap[CE][0] }[]
> => Reader.asks(env => env.getChildInstancesForInstanceId(entityName, parentId))

/**
 * Gets a function to retrieve all child instances of an entity from the database by their child entity name and their parent’s identifier.
 */
export const getChildInstancesForInstanceIdFnR = <CE extends keyof ChildEntityMap>(): Reader<
  { getChildInstancesForInstanceId: GetAllChildInstancesForParent<CE> },
  GetAllChildInstancesForParent<CE>
> => Reader.asks(env => env.getChildInstancesForInstanceId)

/**
 * Joins a list of strings according to the locale’s rules for the given type.
 */
export const responsiveLocaleJoinR = (
  arr: string[],
  type: LocaleJoinType,
): Reader<{ localeJoin: LocaleJoin; responsiveTextSize: ResponsiveTextSize }, string> =>
  Reader.asks(({ localeJoin, responsiveTextSize }) =>
    responsive(
      responsiveTextSize,
      () => localeJoin(arr, type),
      () => {
        switch (type) {
          case "conjunction":
            return " + "
          case "disjunction":
            return " / "
          case "unit":
            return " "
          default:
            return assertExhaustive(type)
        }
      },
    ),
  )

/**
 * Compares two strings according to the locale’s sorting rules.
 */
export const localeCompareR: Reader<{ localeCompare: LocaleCompare }, LocaleCompare> = Reader.asks(
  env => env.localeCompare,
)

/**
 * Sorts an array of strings according to the locale’s sorting rules.
 */
export const localeSortR = <T extends string>(
  arr: T[],
): Reader<{ localeCompare: LocaleCompare }, T[]> =>
  Reader.asks(({ localeCompare }) => arr.toSorted(localeCompare))

/**
 * Creates a responsive value from two functions that return the value for the full and compressed version, respectively.
 */
export const responsiveR = <T>(
  full: () => T,
  compressed: () => T,
): Reader<{ responsiveTextSize: ResponsiveTextSize }, T> =>
  Reader.asks(({ responsiveTextSize }) => responsive(responsiveTextSize, full, compressed))

/**
 * Creates a responsive value from two functions that return the value for the full and compressed version, respectively.
 */
export const responsiveThenR = <T, RF extends object, RC extends object>(
  full: () => Reader<RF, T>,
  compressed: () => Reader<RC, T>,
): Reader<{ responsiveTextSize: ResponsiveTextSize } & RF & RC, T> =>
  Reader.asks(env => {
    switch (env.responsiveTextSize) {
      case ResponsiveTextSize.Full:
        return full().run(env)
      case ResponsiveTextSize.Compressed:
        return compressed().run(env)
      default:
        return assertExhaustive(env.responsiveTextSize)
    }
  })

/**
 * Creates a responsive value from a translation key that has a full and a compressed version.
 */
export const responsiveTranslateR = <
  K extends keyof Translations,
  K2 extends TranslationKeyMatchingParamsOfKey<K>,
>(
  fullKey: K,
  compressedKey: K2,
  ...rest: TranslationParamsInArray<K> & TranslationParamsInArray<K2>
): Reader<{ translate: Translate; responsiveTextSize: ResponsiveTextSize }, string> =>
  Reader.asks(({ translate, responsiveTextSize }) =>
    responsive(
      responsiveTextSize,
      () => translate(fullKey, ...(rest as TranslationParamsInArray<K>)),
      () => translate(compressedKey, ...(rest as TranslationParamsInArray<K2>)),
    ),
  )

/**
 * Creates a responsive value from a responsive text.
 */
export const responsiveTextR = (
  responsiveText: ResponsiveText,
): Reader<{ responsiveTextSize: ResponsiveTextSize }, string> =>
  Reader.asks(({ responsiveTextSize }) =>
    responsive(
      responsiveTextSize,
      () => responsiveText.full,
      () => responsiveText.compressed,
    ),
  )

/**
 * Creates a responsive value from a responsive text with an optional compressed variant.
 */
export const responsiveTextOptionalR = (
  responsiveText: ResponsiveTextOptional,
): Reader<{ responsiveTextSize: ResponsiveTextSize }, string | undefined> =>
  Reader.asks(({ responsiveTextSize }) =>
    responsive(
      responsiveTextSize,
      () => responsiveText.full,
      () => responsiveText.compressed,
    ),
  )

/**
 * Formats the given energy cost value with the appropriate unit.
 */
export const formatEnergyR = (
  value: string | number,
): Reader<{ translate: Translate; energyUnit: EnergyUnit }, string> =>
  Reader.asks(({ translate, energyUnit }) => formatEnergy(translate, energyUnit, value))

/**
 * Formats the given energy cost value with the appropriate unit based on the entity type.
 */
export const formatEnergyFnR: Reader<
  { translate: Translate; energyUnit: EnergyUnit },
  (value: string | number) => string
> = Reader.asks(
  ({ translate, energyUnit }) =>
    value =>
      formatEnergy(translate, energyUnit, value),
)

type SpeedMap = {
  [Speed.Fast]: FastSkillModificationLevelConfig
  [Speed.Slow]: SlowSkillModificationLevelConfig
}

/**
 * Returns a common value for a skill modification level depending on the speed.
 */
export const modifiableBySpeedR = <
  Fast extends object,
  Slow extends { [K_ in keyof Fast]: unknown },
  K extends keyof Fast,
>(
  key: K,
  level: { fast: Fast; slow: Slow },
): Reader<{ speed: Speed }, (Fast | Slow)[K]> =>
  Reader.asks(({ speed }) => {
    switch (speed) {
      case Speed.Fast:
        return level.fast[key]
      case Speed.Slow:
        return level.slow[key]
      default:
        return assertExhaustive(speed)
    }
  })

/**
 * Returns a common value for a skill modification level depending on the speed.
 */
export const modifiableBySpeedOptionalR = <
  Fast extends object,
  Slow extends { [K_ in keyof Fast]: unknown },
  K extends keyof Fast,
>(
  key: K,
  level: { fast?: Fast; slow?: Slow },
): Reader<{ speed: Speed }, (Fast | Slow)[K] | undefined> =>
  Reader.asks(({ speed }) => {
    switch (speed) {
      case Speed.Fast:
        return level.fast?.[key]
      case Speed.Slow:
        return level.slow?.[key]
      default:
        return assertExhaustive(speed)
    }
  })

/**
 * Returns a common value for a skill modification level depending on the speed.
 */
export const modifyBySpeedR: Reader<
  { speed: Speed },
  <S extends Speed, K extends keyof SpeedMap[S]>(
    key: K,
    level: SkillModificationLevel,
  ) => SpeedMap[S][K]
> = Reader.asks(
  ({ speed }) =>
    <S extends Speed, K extends keyof SpeedMap[S]>(key: K, level: SkillModificationLevel) => {
      switch (speed) {
        case Speed.Fast:
          return level.fast[key as keyof FastSkillModificationLevelConfig] as SpeedMap[S][K]
        case Speed.Slow:
          return level.slow[key as keyof SlowSkillModificationLevelConfig] as SpeedMap[S][K]
        default:
          return assertExhaustive(speed)
      }
    },
)

/**
 * Returns the default values wrapped in a reader if the value is nullish, otherwise applies the given function to the value and returns the result.
 */
export const mapNullableR =
  <T, U, R>(defaultValue: U, fn: (value: NonNullable<T>) => Reader<U, R>) =>
  (value: T) =>
    isNotNullish(value) ? fn(value) : Reader.of(defaultValue)

/**
 * Use `Reader` instances directly in a template string.
 */
export const sequence = <E>(
  string: TemplateStringsArray,
  ...values: (Reader<E, string> | string)[]
): Reader<E, string> =>
  Reader.traverse(values, value => (value instanceof Reader ? value : Reader.of(value))).map(
    resolvedValues => string.reduce((acc, str, i) => acc + str + (resolvedValues[i] ?? ""), ""),
  )
