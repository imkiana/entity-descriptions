import { identity } from "@elyukai/utils/function"
import { Reader } from "@elyukai/utils/reader"
import { assertExhaustive } from "@elyukai/utils/typeSafety"
import type {
  Occurrence,
  Publication,
  Publication_ID,
  PublicationRefs,
} from "@optolith/database-schema/gen"
import type { StdReader } from "../env.js"
import type { GetInstanceById } from "../helpers/getTypes.js"
import type { TranslateMap } from "../helpers/translate.js"

/**
 * Options for how to render information from different publications in entity descriptions.
 */
export type PublicationOptions = {
  /**
   * A list of publications to include, identified by their ID. These will always be included no matter the settings in `showPublicationGroups`.
   */
  publications: Publication_ID[]

  /**
   * Which publication groups to include, no matter if they are explicitly referenced or not.
   *
   * - `"none"`: No groups, only explicitly referenced publications
   * - `"core"`: Core rules
   * - `"playerOriented"`: Core rules and player-oriented supplements, excluding books with adult content and adventure books.
   * - `"playerOrientedWithAdult"`: Core rules and player-oriented supplements, excluding adventure books but including books with adult content.
   * - `"playerOrientedWithAdventures"`: Core rules and player-oriented supplements, including adventure books but excluding books with adult content.
   * - `"all"`: All groups, including books with adult content and adventure books. Any explicit publication references will have no effect as all publications are included anyway.
   */
  showPublicationGroups:
    | "none"
    | "core"
    | "playerOriented"
    | "playerOrientedWithAdult"
    | "playerOrientedWithAdventures"
    | "all"

  /**
   * How to handle added and removed entries for publications.
   *
   * - `"none"`: No handling, new and deprecated/removed entries are displayed.
   * - `"latestOnly"`: Consider only the latest printings of publications. Inclusion and exclusion of entries is determined based on the initial occurrence and all revisions, if any.
   * - `Record<Publication_ID, number>`: A custom handling for each publication, where the number indicates up until which point to include. If an entry is not present in this record, it is treated as if the latest printing should be included.
   */
  changeHandling: "none" | "latestOnly" | Record<Publication_ID, number>

  /**
   * If true, only publication references to publications included via `publications` and `showPublicationGroups` will be shown.
   */
  onlyShowReferencesToIncludedPublications: boolean

  /**
   * If true, only include publications that have been fully implemented.
   */
  onlyCompletePublications: boolean
}

/**
 * The default publication options that include all publication groups and entries without filtering.
 */
export const defaultPublicationOptions: PublicationOptions = {
  publications: [],
  showPublicationGroups: "all",
  changeHandling: "none",
  onlyShowReferencesToIncludedPublications: false,
  onlyCompletePublications: false,
}

const isPublicationIncludedInGroup = (
  publication: Pick<Publication, "category" | "containsAdultContent">,
  publicationOptions: PublicationOptions,
): boolean => {
  switch (publicationOptions.showPublicationGroups) {
    case "none":
      return false
    case "core":
      switch (publication.category.kind) {
        case "CoreRules":
          return true
        case "ExpansionRules":
        case "Sourcebook":
        case "RegionalSourcebook":
        case "Adventure":
          return false
        default:
          return assertExhaustive(publication.category)
      }
    case "playerOriented":
      switch (publication.category.kind) {
        case "CoreRules":
        case "ExpansionRules":
        case "Sourcebook":
        case "RegionalSourcebook":
          return !publication.containsAdultContent
        case "Adventure":
          return false
        default:
          return assertExhaustive(publication.category)
      }
    case "playerOrientedWithAdult":
      switch (publication.category.kind) {
        case "CoreRules":
        case "ExpansionRules":
        case "Sourcebook":
        case "RegionalSourcebook":
          return true
        case "Adventure":
          return false
        default:
          return assertExhaustive(publication.category)
      }
    case "playerOrientedWithAdventures":
      return !publication.containsAdultContent
    case "all":
      return true
    default:
      return assertExhaustive(publicationOptions.showPublicationGroups)
  }
}

/**
 * Checks if a publication is included based on the publication options.
 */
export const isPublicationIncluded = (
  publicationOptions: PublicationOptions,
  publicationId: Publication_ID,
  publication: Publication,
): boolean =>
  publicationOptions.publications.includes(publicationId) ||
  isPublicationIncludedInGroup(publication, publicationOptions)

/**
 * Checks if a publication is included based on the publication options.
 */
export const isPublicationIncludedById = (
  getInstanceById: GetInstanceById<"Publication">,
  publicationOptions: PublicationOptions,
  publicationId: Publication_ID,
): boolean => {
  const publication = getInstanceById("Publication", publicationId)

  if (publication === undefined) {
    return false
  }

  return isPublicationIncluded(publicationOptions, publicationId, publication)
}

const isEntryRemovedInInitialPublicationOccurrence = (
  printingToConsider: number,
  occurrence: Occurrence,
) =>
  (occurrence.initial.isRemoved === true &&
    occurrence.revisions === undefined &&
    (occurrence.initial.printing === undefined ||
      occurrence.initial.printing <= printingToConsider)) ||
  // also "removed" if the entry is only added in a later printing of the publication that should not be considered at this point.
  (occurrence.initial.isRemoved !== true &&
    occurrence.initial.printing !== undefined &&
    occurrence.initial.printing > printingToConsider)

const isEntryRemovedInPublicationRevision = (printingToConsider: number, occurrence: Occurrence) =>
  occurrence.revisions?.some(
    (rev, revIdx, revs) =>
      rev.kind === "Deprecated" &&
      rev.Deprecated.printing <= printingToConsider &&
      !revs.some(
        (otherRev, otherRevIdx) =>
          revIdx !== otherRevIdx &&
          otherRev.kind === "Since" &&
          otherRev.Since.printing <= printingToConsider &&
          otherRev.Since.printing > rev.Deprecated.printing,
      ),
  ) === true

const isEntryRemovedInPublication = (
  publicationOptions: PublicationOptions,
  publicationId: Publication_ID,
  occurrence: Occurrence,
) => {
  if (publicationOptions.changeHandling === "none") {
    return false
  }

  const printingToConsider =
    publicationOptions.changeHandling === "latestOnly"
      ? Infinity
      : (publicationOptions.changeHandling[publicationId] ?? Infinity)

  return (
    isEntryRemovedInInitialPublicationOccurrence(printingToConsider, occurrence) ||
    isEntryRemovedInPublicationRevision(printingToConsider, occurrence)
  )
}

/**
 * Checks if an entry is from a publication that should be included based on the publication options. If the entry has no publication references, it is included by default, as it is assumed that its parent entry has sources that determine whether to include it or not.
 */
export const isEntryFromIncludedPublication = (
  entry: { src?: PublicationRefs },
  getInstanceById: GetInstanceById<"Publication">,
  translateMap: TranslateMap,
  publicationOptions: PublicationOptions,
): boolean => {
  if (entry.src === undefined) {
    return true
  }

  // if any publication explicity removes the entry, it is not included in any case
  if (
    entry.src.some(ref => {
      const localeOccurrences = translateMap(ref.occurrences)
      return localeOccurrences === undefined
        ? false
        : isPublicationIncludedById(getInstanceById, publicationOptions, ref.id) &&
            isEntryRemovedInPublication(publicationOptions, ref.id, localeOccurrences)
    })
  ) {
    return false
  }

  // otherwise, it is included if at least one publication includes it
  return entry.src.some(ref =>
    isPublicationIncludedById(getInstanceById, publicationOptions, ref.id),
  )
}

/**
 * Filters a list of entries to only include those that are from publications that should be included based on the publication options. If an entry has no publication references, it is included by default, as it is assumed that its parent entry has sources that determine whether to include it or not.
 *
 * Provided instances can have an indirect `src` property. Use the second parameter to specify how to access the object with publication references for each entry.
 */
export const filterIncludedPublicationEntriesMapR = <T>(
  instances: T[],
  accessorFn: (entry: T) => { src?: PublicationRefs },
): StdReader<T[], "tm" | "ibi" | "po", "Publication"> =>
  Reader.asks(({ getInstanceById, translateMap, publicationOptions }) =>
    instances.filter(instance =>
      isEntryFromIncludedPublication(
        accessorFn(instance),
        getInstanceById,
        translateMap,
        publicationOptions,
      ),
    ),
  )

/**
 * Filters a list of entries to only include those that are from publications that should be included based on the publication options. If an entry has no publication references, it is included by default, as it is assumed that its parent entry has sources that determine whether to include it or not.
 *
 * Provided instances must have a direct `src` property.
 */
export const filterIncludedPublicationEntriesR = <T extends { src?: PublicationRefs }>(
  instances: T[],
): StdReader<T[], "tm" | "ibi" | "po", "Publication"> =>
  filterIncludedPublicationEntriesMapR(instances, identity)
