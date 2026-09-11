/**
 * Title-cases free text so exercise names display consistently no matter how
 * a user typed them ("bench press" / "BENCH PRESS" -> "Bench Press").
 * Hyphenated words are title-cased on each side of the hyphen ("push-up" ->
 * "Push-Up") since the catalog already uses that convention.
 */
export function toTitleCase(input: string): string {
  return input
    .trim()
    .replace(/\s+/g, " ")
    .split(" ")
    .map((word) =>
      word
        .split("-")
        .map((part) =>
          part.length === 0 ? part : part[0].toUpperCase() + part.slice(1).toLowerCase()
        )
        .join("-")
    )
    .join(" ");
}
