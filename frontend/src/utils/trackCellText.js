/**
 * Texte affiché dans une case de piste.
 * `text` défini (y compris chaîne vide) remplace le numéro auto.
 */
export function resolveTrackCellText(override, defaultN) {
  if (
    override != null
    && Object.prototype.hasOwnProperty.call(override, 'text')
    && override.text != null
  ) {
    return override.text
  }
  return defaultN
}
