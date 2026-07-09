/** Run after the current render + physics frame to avoid Rapier borrow conflicts. */
export function deferAfterPhysics(fn) {
  requestAnimationFrame(() => {
    requestAnimationFrame(fn)
  })
}
