const MM_TO_PX = 3.7795275591

export function useAtomScale(props) {
  function mmToPx(mm) {
    return mm * MM_TO_PX * (props.zoom ?? 1)
  }
  return { mmToPx }
}
