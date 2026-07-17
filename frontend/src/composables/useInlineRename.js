import { ref, nextTick } from 'vue'

/**
 * Renommage inline fiable :
 * - focus programmatique au montage
 * - blur différé (évite la course mousedown/click sur ✎)
 * - second clic ✎ sur le même item = commit (pas reset)
 * - clic ✎ sur un autre item = commit l’actuel puis démarre le nouveau
 */
export function useInlineRename(getLabel, saveFn) {
  const renamingId = ref(null)
  const renameValue = ref('')
  const renamingItem = ref(null)
  let committing = false

  async function startRename(item) {
    if (renamingId.value === item.id) {
      await commitRename(item)
      return
    }
    if (renamingId.value != null && renamingItem.value) {
      await commitRename(renamingItem.value)
    }
    renamingId.value = item.id
    renamingItem.value = item
    renameValue.value = getLabel(item)
    await nextTick()
  }

  function cancelRename() {
    renamingId.value = null
    renamingItem.value = null
  }

  function renameRef(el) {
    if (!el) return
    requestAnimationFrame(() => {
      el.focus()
      // Curseur en fin de texte (pas de sélection totale → évite d'écraser en tapant)
      const len = el.value?.length ?? 0
      el.setSelectionRange(len, len)
    })
  }

  function onRenameBlur(item) {
    setTimeout(() => {
      if (renamingId.value === item.id) commitRename(item)
    }, 0)
  }

  async function commitRename(item) {
    if (committing) return
    if (renamingId.value !== item.id) return
    const previous = getLabel(item)
    const name = renameValue.value.trim()
    renamingId.value = null
    renamingItem.value = null
    if (!name || name === previous) return
    committing = true
    try {
      await saveFn(item, name)
    } catch (e) {
      console.error('Rename failed', e)
      renameValue.value = name
      renamingId.value = item.id
      renamingItem.value = item
    } finally {
      committing = false
    }
  }

  return {
    renamingId,
    renameValue,
    startRename,
    cancelRename,
    renameRef,
    onRenameBlur,
    commitRename,
  }
}
