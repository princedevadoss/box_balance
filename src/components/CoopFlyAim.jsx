import { useFrame, useThree } from '@react-three/fiber'
import { ballBoardIndex, computeFlyAimWorld } from '../flyAim'

/** Solo / single-board fly aim from local pointer. */
export function LocalFlyAim({ flyActive, status, boardRef, boardData, flyTargetRef }) {
  const { camera, pointer } = useThree()

  useFrame(() => {
    if (!flyActive || status !== 'playing') {
      flyTargetRef.current = null
      return
    }
    flyTargetRef.current = computeFlyAimWorld(camera, pointer, boardRef?.current, boardData)
  })

  return null
}

/** Resolves fly target on host; clients on the controlling board send aim to host. */
export function CoopFlyAim({
  flyActive,
  status,
  data,
  slot,
  isHost,
  boardRefs,
  ballRef,
  networkBallRef,
  peerFlyAimRef,
  flyTargetRef,
  flyAimOutRef,
}) {
  const { camera, pointer } = useThree()
  const boards = data.boards ?? []

  useFrame(() => {
    if (!flyActive || status !== 'playing') {
      flyTargetRef.current = null
      if (flyAimOutRef) flyAimOutRef.current = null
      return
    }

    const ballX = isHost
      ? ballRef.current?.translation().x
      : networkBallRef?.current?.pos?.[0]
    const controlBoard = ballBoardIndex(data, ballX)
    const boardData = boards[controlBoard]
    const boardBody = boardRefs.current[controlBoard]?.current

    if (slot === controlBoard) {
      const aim = computeFlyAimWorld(camera, pointer, boardBody, boardData)
      if (flyAimOutRef) flyAimOutRef.current = aim
      if (isHost) flyTargetRef.current = aim
      return
    }

    if (flyAimOutRef) flyAimOutRef.current = null
    if (!isHost) return

    const peerAim = peerFlyAimRef?.current?.[controlBoard]
    flyTargetRef.current = peerAim ?? flyTargetRef.current
  })

  return null
}
