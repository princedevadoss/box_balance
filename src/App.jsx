import { useEffect, useState } from 'react'
import { useRoom } from './hooks/useRoom'
import {
  MainMenu,
  MultiplayerMenu,
  ModeLobbyMenu,
  CreateRoomScreen,
  JoinRoomScreen,
} from './components/menus'
import { SoloGame } from './components/SoloGame'
import { MultiplayerGame } from './components/MultiplayerGame'
import { CoopGame } from './components/CoopGame'

export default function App() {
  const [screen, setScreen] = useState('menu')
  const [lobbyMode, setLobbyMode] = useState('versus')
  const room = useRoom()

  useEffect(() => {
    if (room.phase === 'matched' && (screen === 'multi-create' || screen === 'multi-join')) {
      setScreen('multi-play')
    }
  }, [room.phase, screen])

  if (screen === 'solo') {
    return <SoloGame onExit={() => setScreen('menu')} />
  }

  if (screen === 'multi-play') {
    const exit = () => {
      room.disconnect()
      setScreen('menu')
    }
    if (room.mode === 'coop') {
      return <CoopGame room={room} onExit={exit} />
    }
    return <MultiplayerGame room={room} onExit={exit} />
  }

  return (
    <>
      {screen === 'menu' && (
        <MainMenu onSolo={() => setScreen('solo')} onMultiplayer={() => setScreen('multi-menu')} />
      )}

      {screen === 'multi-menu' && (
        <MultiplayerMenu
          onVersus={() => {
            setLobbyMode('versus')
            setScreen('multi-lobby')
          }}
          onCoop={() => {
            setLobbyMode('coop')
            setScreen('multi-lobby')
          }}
          onBack={() => setScreen('menu')}
        />
      )}

      {screen === 'multi-lobby' && (
        <ModeLobbyMenu
          mode={lobbyMode}
          onCreate={() => setScreen('multi-create')}
          onJoin={() => {
            room.resetError()
            setScreen('multi-join')
          }}
          onBack={() => setScreen('multi-menu')}
        />
      )}

      {screen === 'multi-create' && (
        <CreateRoomScreen
          mode={lobbyMode}
          code={room.code}
          playerName={room.playerName}
          error={room.phase === 'error' ? room.error : ''}
          onCreate={(name) => room.createRoom(name, lobbyMode)}
          onBack={() => {
            room.disconnect()
            setScreen('multi-lobby')
          }}
        />
      )}

      {screen === 'multi-join' && (
        <JoinRoomScreen
          mode={lobbyMode}
          error={room.phase === 'error' ? room.error : ''}
          joining={room.phase === 'connecting' || room.phase === 'waiting'}
          onJoin={(code, name) => room.joinRoom(code, name, lobbyMode)}
          onBack={() => {
            room.disconnect()
            setScreen('multi-lobby')
          }}
        />
      )}
    </>
  )
}
