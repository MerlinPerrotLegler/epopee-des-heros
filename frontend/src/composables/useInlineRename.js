import { ref, nextTick } from 'vue'

/**
 * Renommage inline fiable : focus programmatique + blur différé (évite mousedown sur les boutons).
 */
export function useInlineRename(getLabel, saveFn) {
  const renamingId = ref(null)
  const renameValue = ref('')

  async function startRename(item) {
    renamingId.value = item.id
    renameValue.value = getLabel(item)
    await nextTick()
    // focus géré par renameRef au montage de l'input
  }

  function cancelRename() {
    renamingId.value = null
  }

  function renameRef(el) {
    if (!el) return
    requestAnimationFrame(() => {
      el.focus()
      el.select()
    })
  }

  function onRenameBlur(item) {
    setTimeout(() => {
      if (renamingId.value === item.id) commitRename(item)
    }, 0)
  }

  async function commitRename(item) {
    if (renamingId.value !== item.id) return
    const previous = getLabel(item)
    const name = renameValue.value.trim()
    renamingId.value = null
    if (!name || name === previous) return
    try {
      await saveFn(item, name)
    } catch (e) {
      console.error('Rename failed', e)
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
