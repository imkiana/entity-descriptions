import { isNotEmpty } from "@elyukai/utils/array/nonEmpty"
import { isNotNullish, mapNullable } from "@elyukai/utils/nullable"
import { romanize } from "@elyukai/utils/roman"
import { assertExhaustive } from "@elyukai/utils/typeSafety"
import type { BookRules, BookType } from "@optolith/database-schema/gen"
import { createEntityDescriptionCreator, type EntityDescriptionCreator } from "../creator.js"
import type { GetInstanceById } from "../helpers/getTypes.js"
import type { LocaleCompare, LocaleJoin } from "../helpers/locale.js"
import type { Translate, TranslateMap } from "../helpers/translate.js"
import type {
  IdMap,
  RawDefinitionListEntityDescriptionSectionItem,
  RawEntityDescription,
  RawEntityDescriptionSection,
  RawEntityDescriptionSectionContent,
  RawNestedDefinitionListEntityDescriptionSection,
} from "../index.js"
import { renderComplexity, renderCost } from "./equipment.js"
import { parensIf } from "./partial/rated/activatable/parensIf.js"
import { MISSING_VALUE } from "./partial/unknown.js"

/**
 * Render the types of a book, joined and localized.
 */
export const renderBookTypes = (
  translate: Translate,
  translateMap: TranslateMap,
  localeJoin: LocaleJoin,
  localeCompare: LocaleCompare,
  getInstanceById: GetInstanceById<"Skill">,
  types: BookType[],
): string =>
  types
    .map((type): [main: string, sub?: string] => {
      switch (type.kind) {
        case "Mundane":
          switch (type.Mundane.kind) {
            case "RomanceNovel":
              return [translate("Romance Novel")]
            case "Poetry":
              return [translate("Poetry")]
            case "PoliticalPamphlet":
              return [translate("Political Pamphlet")]
            case "CrimeStory":
              return [translate("Crime Story")]
            case "FairyTale":
              return [translate("Fairy Tale")]
            case "Novel":
              return [translate("Novel")]
            case "ProfessionalPublication":
              return [
                translate("Professional Publication"),
                translateMap(
                  getInstanceById("Skill", type.Mundane.ProfessionalPublication)?.translations,
                )?.name ?? MISSING_VALUE,
              ]
            default:
              return assertExhaustive(type.Mundane)
          }
        case "Magical":
          return [translate("Magical Book")]
        case "Religious":
          return [translate("Religious Works")]
        default:
          return assertExhaustive(type)
      }
    })
    .reduce<[main: string, sub?: string[]][]>((accTypes, [main, sub]) => {
      const last = accTypes.at(-1)
      return last?.[1] === undefined || sub === undefined
        ? [...accTypes, [main, sub === undefined ? undefined : [sub]]]
        : [...accTypes.slice(0, -1), [last[0], [...last[1], sub]]]
    }, [])
    .map(([main, sub]) =>
      sub === undefined
        ? main
        : `${main} (${localeJoin(sub.toSorted(localeCompare), "conjunction")})`,
    )
    .join(", ")

/**
 * Render the rules section of a book.
 */
export const renderBookRules = (
  translate: Translate,
  translateMap: TranslateMap,
  rules: BookRules,
):
  | string
  | (
      | RawEntityDescriptionSectionContent<RawNestedDefinitionListEntityDescriptionSection>
      | undefined
    )[] => {
  switch (rules.kind) {
    case "Plain": {
      const translation = translateMap(rules.Plain.translation)

      if (translation === undefined) {
        return MISSING_VALUE
      }

      const { text, reconstruction, references, textAfter } = translation

      if (reconstruction === undefined && references === undefined && textAfter === undefined) {
        return text
      }

      return [
        text !== ""
          ? {
              type: "plain" as const,
              text,
            }
          : undefined,
        reconstruction !== undefined || references !== undefined
          ? {
              type: "definitionList" as const,
              style: "nested" as const,
              items: [
                mapNullable(reconstruction, rec => ({
                  label: translate("Reconstruction"),
                  value: rec,
                })),
                mapNullable(references, ref => ({
                  label: translate("References"),
                  value: ref,
                })),
              ],
            }
          : undefined,
        mapNullable(textAfter, after => ({
          type: "plain" as const,
          text: after,
        })),
      ].filter(isNotNullish)
    }
    case "Entertainment":
      return translate("Entertainment")
    case "ByEdition": {
      const textAfter = mapNullable(
        translateMap(rules.ByEdition.translation)?.textAfter,
        textAfterVal => ({
          type: "plain" as const,
          text: textAfterVal,
        }),
      )

      return [
        {
          type: "definitionList" as const,
          style: "nested" as const,
          items: rules.ByEdition.editions.map(
            (
              edition,
            ): {
              label: string
              value:
                | string
                | (
                    | RawEntityDescriptionSectionContent<RawNestedDefinitionListEntityDescriptionSection>
                    | undefined
                  )[]
            } => {
              const translation = translateMap(edition.translation)

              const label = translation?.label ?? MISSING_VALUE
              const text = translation?.text ?? ""
              const reconstruction = translation?.reconstruction
              const references = translation?.references
              const prereqReplacement = translateMap(
                edition.prerequisities?.translations,
              )?.replacement

              if (
                reconstruction === undefined &&
                references === undefined &&
                prereqReplacement === undefined
              ) {
                return {
                  label,
                  value: text,
                }
              }

              return {
                label,
                value: [
                  text !== ""
                    ? {
                        type: "plain" as const,
                        text,
                      }
                    : undefined,
                  prereqReplacement !== undefined ||
                  reconstruction !== undefined ||
                  references !== undefined
                    ? {
                        type: "definitionList" as const,
                        style: "nested" as const,
                        items: [
                          mapNullable(prereqReplacement, replacement => ({
                            label: translate("Language/Script"),
                            value: replacement,
                          })),
                          mapNullable(reconstruction, rec => ({
                            label: translate("Reconstruction"),
                            value: rec,
                          })),
                          mapNullable(references, ref => ({
                            label: translate("References"),
                            value: ref,
                          })),
                        ].filter(isNotNullish),
                      }
                    : undefined,
                ].filter(isNotNullish),
              }
            },
          ),
        },
        textAfter,
      ].filter(isNotNullish)
    }
    default:
      return assertExhaustive(rules)
  }
}

/**
 * Get raw JSON representation of the rules text for a book.
 */
export const getBookRawEntityDescription: EntityDescriptionCreator<
  "Book",
  {
    getInstanceById: GetInstanceById<"Skill" | "Publication">
    idMap: IdMap
  },
  RawEntityDescription
> = ({ getInstanceById }, locale, entry) => {
  const { translate, translateMap } = locale
  const translation = translateMap(entry.content.translations)

  if (translation === undefined) {
    return undefined
  }

  const { name, secondary_name, legality, availability, special, note, errata } = translation

  const languageAndScript = translateMap(entry.content.prerequisites?.translations)?.replacement

  const { rules } = entry.content

  const contentQuality = mapNullable(entry.content.contentQuality, cq => {
    switch (cq.kind) {
      case "Modest":
        return translate("Modest")
      case "Average":
        return translate("Average")
      case "Demanding":
        return (
          translate("Demanding") +
          parensIf(
            translate("CL {$level}", {
              level: romanize(cq.Demanding),
            }),
          )
        )
      default:
        return assertExhaustive(cq)
    }
  })

  const definitionListItems: (RawDefinitionListEntityDescriptionSectionItem | undefined)[] = [
    {
      label: translate("Name"),
      value: name,
    },
    {
      label: translate("Type"),
      value: renderBookTypes(
        translate,
        translateMap,
        locale.join,
        locale.compare,
        getInstanceById,
        entry.content.types,
      ),
    },
    mapNullable(languageAndScript, ls => ({
      label: translate("Language/Script"),
      value: ls,
    })),
    mapNullable(contentQuality, cq => ({
      label: translate("Content Quality"),
      value: cq,
    })),
    {
      label: translate("Rules"),
      value: renderBookRules(translate, translateMap, rules),
    },
    mapNullable(entry.content.cost, cost =>
      renderCost(translate, translateMap, locale.formatNumber, cost),
    ),
    mapNullable(legality, l => ({
      label: translate("Legality"),
      value: l,
    })),
    mapNullable(availability, a => ({
      label: translate("Availability"),
      value: a,
    })),
    mapNullable(special, s => ({
      label: translate("Special"),
      value: s,
    })),
    mapNullable(entry.content.weight, weight => ({
      label: translate("Weight"),
      value: translate(".input {$value :number} {{{$value} pounds}}", {
        value: weight,
      }),
    })),
    mapNullable(entry.content.complexity, complexity => renderComplexity(translate, complexity)),
    entry.content.structure_points !== undefined && isNotEmpty(entry.content.structure_points)
      ? {
          label: translate("Structure Points"),
          value: entry.content.structure_points.map(sp => sp.points).join(", "),
        }
      : undefined,
  ]

  const bodySections: (RawEntityDescriptionSection | undefined)[] = [
    {
      type: "definitionList" as const,
      items: definitionListItems.filter(isNotNullish),
    },
    mapNullable(note, n => ({
      type: "plain" as const,
      text: n,
    })),
  ]

  return {
    title: name,
    subtitle: secondary_name,
    className: "equipment book",
    body: bodySections.filter(isNotNullish),
    errata,
    references: entry.content.src,
  }
}

/**
 * Get a JSON representation of the rules text for a book.
 */
export const getBookEntityDescription = createEntityDescriptionCreator<
  "Book",
  {
    getInstanceById: GetInstanceById<"Skill" | "Publication">
    idMap: IdMap
  }
>(getBookRawEntityDescription)
