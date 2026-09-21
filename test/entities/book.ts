import assert from "node:assert/strict"
import { randomUUID } from "node:crypto"
import { describe, it } from "node:test"
import type { Book, PublicationRefs, Skill } from "@optolith/database-schema/gen"
import {
  getBookEntityDescription,
  getBookRawEntityDescription,
  renderBookRules,
  renderBookTypes,
} from "../../src/entities/book.js"
import type { GetInstanceById } from "../../src/helpers/getTypes.js"
import type { IdMap } from "../../src/index.js"
import { defaultLocaleEnvironment } from "../helpers/locale.js"

const HistorySkillId = randomUUID()

const getInstanceByIdMock: GetInstanceById<"Skill" | "Publication"> = ((
  entity: string,
  id: string,
) => {
  if (entity === "Skill" && id === HistorySkillId) {
    return {
      id: HistorySkillId,
      translations: {
        "en-US": { name: "History" },
      },
    } as unknown as Skill
  }
  return undefined
}) as GetInstanceById<"Skill" | "Publication">

const idMapMock: IdMap = {
  DerivedCharacteristic: {
    LifePoints: "LP",
    Spirit: "SPI",
    Toughness: "TOU",
    Initiative: "INI",
    Movement: "MOV",
  },
  ExperienceLevel: {
    Experienced: "EXP",
  },
}

describe("renderBookTypes", () => {
  it("renders mundane types correctly", () => {
    const types = renderBookTypes(
      defaultLocaleEnvironment.translate,
      defaultLocaleEnvironment.translateMap,
      defaultLocaleEnvironment.join,
      defaultLocaleEnvironment.compare,
      getInstanceByIdMock,
      [{ kind: "Mundane", Mundane: { kind: "RomanceNovel" } }],
    )
    assert.equal(types, "Romance Novel")
  })

  it("renders professional publication with skill name in parentheses", () => {
    const types = renderBookTypes(
      defaultLocaleEnvironment.translate,
      defaultLocaleEnvironment.translateMap,
      defaultLocaleEnvironment.join,
      defaultLocaleEnvironment.compare,
      getInstanceByIdMock,
      [
        {
          kind: "Mundane",
          Mundane: {
            kind: "ProfessionalPublication",
            ProfessionalPublication: HistorySkillId,
          },
        },
      ],
    )
    assert.equal(types, "Professional Publication (History)")
  })

  it("renders magical and religious books", () => {
    const magical = renderBookTypes(
      defaultLocaleEnvironment.translate,
      defaultLocaleEnvironment.translateMap,
      defaultLocaleEnvironment.join,
      defaultLocaleEnvironment.compare,
      getInstanceByIdMock,
      [{ kind: "Magical" }],
    )
    assert.equal(magical, "Magical Book")

    const religious = renderBookTypes(
      defaultLocaleEnvironment.translate,
      defaultLocaleEnvironment.translateMap,
      defaultLocaleEnvironment.join,
      defaultLocaleEnvironment.compare,
      getInstanceByIdMock,
      [{ kind: "Religious" }],
    )
    assert.equal(religious, "Religious Works")
  })
})

describe("renderBookRules", () => {
  it("renders plain rules without reconstruction as string", () => {
    const result = renderBookRules(
      defaultLocaleEnvironment.translate,
      defaultLocaleEnvironment.translateMap,
      {
        kind: "Plain",
        Plain: {
          translation: {
            "en-US": {
              text: "Some rule text",
            },
          },
        },
      },
    )
    assert.equal(result, "Some rule text")
  })

  it("renders plain rules with reconstruction and references as structured sections", () => {
    const result = renderBookRules(
      defaultLocaleEnvironment.translate,
      defaultLocaleEnvironment.translateMap,
      {
        kind: "Plain",
        Plain: {
          translation: {
            "en-US": {
              text: "Main rules",
              reconstruction: "Reconstruction rules",
              references: "Reference list",
              textAfter: "Closing note",
            },
          },
        },
      },
    )
    assert.deepEqual(result, [
      { type: "plain", text: "Main rules" },
      {
        type: "definitionList",
        style: "nested",
        items: [
          { label: "Reconstruction", value: "Reconstruction rules" },
          { label: "References", value: "Reference list" },
        ],
      },
      { type: "plain", text: "Closing note" },
    ])
  })

  it("renders entertainment rules", () => {
    const result = renderBookRules(
      defaultLocaleEnvironment.translate,
      defaultLocaleEnvironment.translateMap,
      {
        kind: "Entertainment",
      },
    )
    assert.equal(result, "Entertainment")
  })

  it("renders rules by edition with nested items", () => {
    const result = renderBookRules(
      defaultLocaleEnvironment.translate,
      defaultLocaleEnvironment.translateMap,
      {
        kind: "ByEdition",
        ByEdition: {
          editions: [
            {
              translation: {
                "en-US": {
                  label: "Original",
                  text: "All rules",
                  reconstruction: "Original reconstruction",
                },
              },
            },
            {
              translation: {
                "en-US": {
                  label: "Copy",
                  text: "Partial rules",
                },
              },
            },
          ],
          translation: {
            "en-US": {
              textAfter: "General edition note",
            },
          },
        },
      },
    )
    assert.deepEqual(result, [
      {
        type: "definitionList",
        style: "nested",
        items: [
          {
            label: "Original",
            value: [
              { type: "plain", text: "All rules" },
              {
                type: "definitionList",
                style: "nested",
                items: [{ label: "Reconstruction", value: "Original reconstruction" }],
              },
            ],
          },
          {
            label: "Copy",
            value: "Partial rules",
          },
        ],
      },
      { type: "plain", text: "General edition note" },
    ])
  })
})

describe("getBookRawEntityDescription", () => {
  it("renders full book description adhering to book layout", () => {
    const bookData: Book = {
      types: [{ kind: "Mundane", Mundane: { kind: "RomanceNovel" } }],
      cost: {
        kind: "Multiple",
        Multiple: [
          {
            kind: "Definite",
            Definite: {
              cost: { kind: "Fixed", Fixed: { value: 60 } },
              translations: {
                "en-US": { label: "Original" },
              },
            },
          },
          {
            kind: "Definite",
            Definite: {
              cost: { kind: "Fixed", Fixed: { value: 45 } },
              translations: {
                "en-US": { label: "Copy" },
              },
            },
          },
        ],
      },
      contentQuality: {
        kind: "Demanding",
        Demanding: 2,
      },
      prerequisites: {
        linguistic: [],
        translations: {
          "en-US": { replacement: "Garethi (Kuslik Signs)" },
        },
      },
      rules: {
        kind: "Entertainment",
      },
      src: [],
      translations: {
        "en-US": {
          name: "100 Days of Kuslik",
          secondary_name: "Love in times of siege",
          legality: "illegal",
          availability: "2 (Original), 6 (Copy)",
          special: "Illustrated editions exist.",
          note: "Quote from Chapter 2...\n\nNovel background text.",
        },
      },
    }

    const description = getBookRawEntityDescription(
      { getInstanceById: getInstanceByIdMock, idMap: idMapMock },
      defaultLocaleEnvironment,
      { entity: "Book", id: randomUUID(), content: bookData },
      {
        publications: {
          showPublicationGroups: "all",
          changeHandling: "none",
          onlyShowReferencesToIncludedPublications: false,
          onlyCompletePublications: false,
          publications: [],
        },
      },
    )

    assert.ok(description)
    assert.equal(description.title, "100 Days of Kuslik")
    assert.equal(description.subtitle, "Love in times of siege")
    assert.equal(description.className, "equipment book")

    // Regelkasten (definitionList) is body[0]
    const [statBlock, noteSection] = description.body
    assert.ok(statBlock && statBlock.type === "definitionList")

    const items = statBlock.items.map(item => item && { label: item.label, value: item.value })
    assert.deepEqual(items, [
      { label: "Name", value: "100 Days of Kuslik" },
      { label: "Type", value: "Romance Novel" },
      { label: "Language/Script", value: "Garethi (Kuslik Signs)" },
      {
        label: "Content Quality",
        value: `${defaultLocaleEnvironment.translate("Demanding")} (${defaultLocaleEnvironment.translate("CL {$level}", { level: "II" })})`,
      },
      { label: "Rules", value: "Entertainment" },
      { label: "Cost", value: "60 silverthalers (Original), 45 silverthalers (Copy)" },
      { label: "Legality", value: "illegal" },
      { label: "Availability", value: "2 (Original), 6 (Copy)" },
      { label: "Special", value: "Illustrated editions exist." },
    ])

    // Fluff / Note text is body[1] outside the definitionList
    assert.ok(noteSection && noteSection.type === "plain")
    assert.equal(noteSection.text, "Quote from Chapter 2...\n\nNovel background text.")
  })

  it("renders full book description using getBookEntityDescription creator", () => {
    const bookData: Book = {
      types: [{ kind: "Magical" }],
      cost: {
        kind: "Single",
        Single: {
          kind: "Definite",
          Definite: {
            cost: { kind: "Fixed", Fixed: { value: 100 } },
          },
        },
      },
      rules: {
        kind: "Plain",
        Plain: {
          translation: {
            "en-US": {
              text: "Magic rules",
            },
          },
        },
      },
      src: undefined as unknown as PublicationRefs,
      translations: {
        "en-US": {
          name: "Grimoire",
        },
      },
    }

    const description = getBookEntityDescription(
      { getInstanceById: getInstanceByIdMock, idMap: idMapMock },
      defaultLocaleEnvironment,
      { entity: "Book", id: randomUUID(), content: bookData },
      {
        publications: {
          showPublicationGroups: "all",
          changeHandling: "none",
          onlyShowReferencesToIncludedPublications: false,
          onlyCompletePublications: false,
          publications: [],
        },
      },
    )

    assert.ok(description)
    assert.equal(description.title, "Grimoire")
    assert.equal(description.className, "equipment book")
  })
})
