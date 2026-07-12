import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  PermissionsAndroid,
  Platform,
  Pressable,
  SafeAreaView,
  StatusBar as RNStatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'
import { StatusBar } from 'expo-status-bar'
import { useKeepAwake } from 'expo-keep-awake'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { Accelerometer } from 'expo-sensors'
import { WebView } from 'react-native-webview'
import { PRODUCTION_GAME_URL } from './config'

const STORAGE_KEY = 'nizhen.gameServerUrl'
const DEFAULT_PORT = '5173'

// Gravity-based pitch/roll → accurate phone tilt matching.
// Higher = less sensitive (need more phone lean for full board tilt).
const GYRO_FULL_TILT_DEG = 42
const GYRO_DEADZONE_DEG = 2.0
const GYRO_HZ = 24
const GYRO_EPS = 0.006
const GYRO_SMOOTH = 0.4
const CALIBRATE_SAMPLES = 18 // ~0.75s at 24Hz

function normalizeServerUrl(raw) {
  let trimmed = (raw || '').trim().replace(/\/$/, '')
  if (!trimmed) return ''

  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(trimmed)) {
    trimmed = `${trimmed}:${DEFAULT_PORT}`
  }

  if (/^https?:\/\//i.test(trimmed)) return trimmed
  return `http://${trimmed}`
}

function guessPlaceholder() {
  return PRODUCTION_GAME_URL
}

function accelAngles(x, y, z) {
  const zz = Math.abs(z) < 0.05 ? (z >= 0 ? 0.05 : -0.05) : z
  return {
    roll: Math.atan2(x, zz),
    pitch: Math.atan2(y, zz),
  }
}

function anglesToPointer(roll, pitch) {
  const full = (GYRO_FULL_TILT_DEG * Math.PI) / 180
  const dead = (GYRO_DEADZONE_DEG * Math.PI) / 180

  const axis = (angle) => {
    const a = Math.abs(angle)
    if (a < dead) return 0
    return Math.sign(angle) * Math.min(1, (a - dead) / Math.max(1e-6, full - dead))
  }

  // Signs confirmed with user: L/R and U/D both need negation vs raw atan2.
  return { x: -axis(roll), y: -axis(pitch) }
}

function GameScreen({ gameUrl, onExit, onLoadError }) {
  useKeepAwake()
  const [webLoading, setWebLoading] = useState(true)
  const [gyroOn, setGyroOn] = useState(true)
  const [calibrating, setCalibrating] = useState(false)
  const webRef = useRef(null)
  const readyRef = useRef(false)
  const smoothRef = useRef({ x: 0, y: 0 })
  const lastSentRef = useRef({ x: 999, y: 999 })
  const calibRef = useRef({ roll: 0, pitch: 0, ready: false })
  const calibBufRef = useRef([])

  const beginCalibration = useCallback(() => {
    calibRef.current = { roll: 0, pitch: 0, ready: false }
    calibBufRef.current = []
    smoothRef.current = { x: 0, y: 0 }
    lastSentRef.current = { x: 999, y: 999 }
    setCalibrating(true)
  }, [])

  const pushGyro = useCallback((x, y, active = true) => {
    const web = webRef.current
    if (!web || !readyRef.current) return
    const last = lastSentRef.current
    if (
      active &&
      Math.abs(last.x - x) < GYRO_EPS &&
      Math.abs(last.y - y) < GYRO_EPS
    ) {
      return
    }
    lastSentRef.current = { x, y }
    const ax = active ? 'true' : 'false'
    web.injectJavaScript(
      `(function(){var g=window.__NIZHEN_GYRO__;if(!g){window.__NIZHEN_GYRO__={x:0,y:0,active:false,updatedAt:0};g=window.__NIZHEN_GYRO__;}g.x=${x.toFixed(4)};g.y=${y.toFixed(4)};g.active=${ax};g.updatedAt=performance.now();if(window.__NIZHEN_SET_GYRO__)${active ? `window.__NIZHEN_SET_GYRO__(${x.toFixed(4)},${y.toFixed(4)})` : 'window.__NIZHEN_CLEAR_GYRO__&&window.__NIZHEN_CLEAR_GYRO__()'};})();true;`
    )
  }, [])

  useEffect(() => {
    if (!gyroOn) {
      setCalibrating(false)
      pushGyro(0, 0, false)
      return undefined
    }

    beginCalibration()
    let sub = null
    let cancelled = false

    ;(async () => {
      const available = await Accelerometer.isAvailableAsync()
      if (!available || cancelled) return

      Accelerometer.setUpdateInterval(Math.round(1000 / GYRO_HZ))
      sub = Accelerometer.addListener(({ x, y, z }) => {
        const { roll, pitch } = accelAngles(x, y, z)
        const calib = calibRef.current

        // Capture resting hold pose so a still phone = level board.
        if (!calib.ready) {
          const buf = calibBufRef.current
          buf.push({ roll, pitch })
          if (buf.length >= CALIBRATE_SAMPLES) {
            const n = buf.length
            calib.roll = buf.reduce((s, p) => s + p.roll, 0) / n
            calib.pitch = buf.reduce((s, p) => s + p.pitch, 0) / n
            calib.ready = true
            calibBufRef.current = []
            smoothRef.current = { x: 0, y: 0 }
            setCalibrating(false)
            pushGyro(0, 0, true)
          } else {
            pushGyro(0, 0, true)
          }
          return
        }

        const mapped = anglesToPointer(roll - calib.roll, pitch - calib.pitch)
        const s = smoothRef.current
        s.x += (mapped.x - s.x) * GYRO_SMOOTH
        s.y += (mapped.y - s.y) * GYRO_SMOOTH
        // Hard snap near zero so HUD/board don't stick at ~6°.
        const ox = Math.abs(s.x) < 0.03 ? 0 : s.x
        const oy = Math.abs(s.y) < 0.03 ? 0 : s.y
        if (ox === 0) s.x = 0
        if (oy === 0) s.y = 0
        pushGyro(ox, oy, true)
      })
    })()

    return () => {
      cancelled = true
      sub?.remove()
      pushGyro(0, 0, false)
    }
  }, [gyroOn, pushGyro, beginCalibration])

  useEffect(() => {
    if (Platform.OS !== 'android') return undefined
    let cancelled = false
    ;(async () => {
      try {
        await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.RECORD_AUDIO, {
          title: 'Microphone',
          message: 'Nizhen catch needs the mic for in-game voice chat.',
          buttonPositive: 'Allow',
          buttonNegative: 'Deny',
        })
      } catch {
        // ignore — voice join will surface the error
      }
      if (cancelled) return
    })()
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <View style={styles.gameRoot}>
      <RNStatusBar hidden />
      <StatusBar hidden />
      <WebView
        ref={webRef}
        source={{ uri: gameUrl }}
        style={styles.webview}
        originWhitelist={['*']}
        allowsInlineMediaPlayback
        mediaPlaybackRequiresUserAction={false}
        mediaCapturePermissionGrantType="grant"
        javaScriptEnabled
        domStorageEnabled
        allowFileAccess
        mixedContentMode="always"
        androidLayerType="hardware"
        cacheEnabled
        setSupportMultipleWindows={false}
        overScrollMode="never"
        bounces={false}
        // Set BEFORE game JS loads so the 30MB FBX is never requested on phone.
        injectedJavaScriptBeforeContentLoaded={`window.__NIZHEN_NATIVE__=true;window.__NIZHEN_GYRO__={x:0,y:0,active:false,updatedAt:0};true;`}
        onPermissionRequest={(event) => {
          // Android WebView: allow mic/camera capture for voice chat.
          if (Platform.OS === 'android' && event?.nativeEvent?.grant) {
            event.nativeEvent.grant(event.nativeEvent.resources)
          }
        }}
        onLoadStart={() => {
          readyRef.current = false
          setWebLoading(true)
        }}
        onLoadEnd={() => {
          readyRef.current = true
          setWebLoading(false)
          webRef.current?.injectJavaScript(
            `window.__NIZHEN_NATIVE__=true;true;`
          )
        }}
        onError={(e) => {
          const desc = e?.nativeEvent?.description || ''
          onLoadError(
            `Could not load the game${desc ? ` (${desc})` : ''}. On PC run: npm run dev:all:lan — then open http://YOUR_IP:5173 in phone Chrome first.`
          )
        }}
        onHttpError={(e) => {
          const code = e?.nativeEvent?.statusCode
          onLoadError(
            `Game server HTTP ${code ?? 'error'}. Is Vite running? Use YOUR_IP:5173 (not just the IP).`
          )
        }}
      />
      {webLoading && (
        <View style={styles.webOverlay}>
          <ActivityIndicator color="#fff" size="large" />
          <Text style={styles.webOverlayText}>Loading Nizhen catch…</Text>
        </View>
      )}
      {calibrating && (
        <View style={styles.calibBanner}>
          <Text style={styles.calibBannerText}>Hold still — leveling…</Text>
        </View>
      )}
      <SafeAreaView style={styles.exitBar}>
        <Pressable onPress={onExit} style={styles.exitBtn} accessibilityRole="button">
          <Text style={styles.exitBtnText}>← Exit</Text>
        </Pressable>
        <View style={styles.gyroActions}>
          {gyroOn && (
            <Pressable
              onPress={beginCalibration}
              style={styles.exitBtn}
              accessibilityRole="button"
            >
              <Text style={styles.exitBtnText}>Level</Text>
            </Pressable>
          )}
          <Pressable
            onPress={() => setGyroOn((v) => !v)}
            style={[styles.exitBtn, gyroOn ? styles.gyroOn : styles.gyroOff]}
            accessibilityRole="button"
          >
            <Text style={styles.exitBtnText}>
              {calibrating ? 'Leveling…' : gyroOn ? 'Gyro ON' : 'Gyro OFF'}
            </Text>
          </Pressable>
        </View>
      </SafeAreaView>
    </View>
  )
}

export default function App() {
  const [serverInput, setServerInput] = useState(PRODUCTION_GAME_URL)
  const [gameUrl, setGameUrl] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showCustom, setShowCustom] = useState(false)

  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        const saved = await AsyncStorage.getItem(STORAGE_KEY)
        if (mounted && saved) setServerInput(saved)
        else if (mounted) setServerInput(PRODUCTION_GAME_URL)
      } finally {
        if (mounted) setLoading(false)
      }
    })()
    return () => {
      mounted = false
    }
  }, [])

  const resolvedUrl = useMemo(
    () => normalizeServerUrl(serverInput) || PRODUCTION_GAME_URL,
    [serverInput]
  )

  const startGame = useCallback(async () => {
    setError('')
    const url = normalizeServerUrl(serverInput) || PRODUCTION_GAME_URL
    try {
      await AsyncStorage.setItem(STORAGE_KEY, url)
    } catch {
      // ignore persistence errors
    }
    setGameUrl(url)
  }, [serverInput])

  const startProduction = useCallback(async () => {
    setError('')
    setServerInput(PRODUCTION_GAME_URL)
    try {
      await AsyncStorage.setItem(STORAGE_KEY, PRODUCTION_GAME_URL)
    } catch {
      // ignore
    }
    setGameUrl(PRODUCTION_GAME_URL)
  }, [])

  const exitGame = useCallback(() => {
    setGameUrl(null)
    setError('')
  }, [])

  const onLoadError = useCallback((message) => {
    setGameUrl(null)
    setError(message)
  }, [])

  if (loading) {
    return (
      <View style={styles.boot}>
        <ActivityIndicator color="#8b5cf6" size="large" />
        <StatusBar style="light" />
      </View>
    )
  }

  if (gameUrl) {
    return <GameScreen gameUrl={gameUrl} onExit={exitGame} onLoadError={onLoadError} />
  }

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar style="light" />
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <Text style={styles.brand}>Nizhen catch</Text>
        <Text style={styles.subtitle}>
          Tilt your phone to control the board. Online multiplayer included.
        </Text>

        <View style={styles.card}>
          <Text style={styles.label}>Online server</Text>
          <Text style={styles.prodUrl}>{PRODUCTION_GAME_URL}</Text>
          <Text style={styles.hint}>
            First open after idle may take ~30s (Render free tier wake-up). Hold still while gyro
            levels, then tilt to play.
          </Text>
          {!!error && <Text style={styles.error}>{error}</Text>}
          <Pressable style={styles.primaryBtn} onPress={startProduction}>
            <Text style={styles.primaryBtnText}>Play online</Text>
          </Pressable>
        </View>

        <Pressable onPress={() => setShowCustom((v) => !v)} style={styles.linkBtn}>
          <Text style={styles.linkBtnText}>
            {showCustom ? 'Hide custom server' : 'Use custom / LAN server'}
          </Text>
        </Pressable>

        {showCustom && (
          <View style={styles.card}>
            <Text style={styles.label}>Custom game URL</Text>
            <TextInput
              style={styles.input}
              value={serverInput}
              onChangeText={setServerInput}
              placeholder={guessPlaceholder()}
              placeholderTextColor="#6b7280"
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
              returnKeyType="go"
              onSubmitEditing={startGame}
            />
            <Text style={styles.hint}>
              LAN example: 192.168.88.6:{DEFAULT_PORT} (PC must run npm run dev:all:lan)
            </Text>
            <Pressable style={styles.secondaryBtn} onPress={startGame}>
              <Text style={styles.primaryBtnText}>Play custom</Text>
            </Pressable>
          </View>
        )}

        <Text style={styles.footer}>
          Gyro works in this app only. Will open: {resolvedUrl}
        </Text>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  boot: {
    flex: 1,
    backgroundColor: '#0f1220',
    alignItems: 'center',
    justifyContent: 'center',
  },
  safe: {
    flex: 1,
    backgroundColor: '#0f1220',
  },
  container: {
    flex: 1,
    paddingHorizontal: 22,
    paddingTop: 36,
    paddingBottom: 24,
  },
  brand: {
    color: '#f8fafc',
    fontSize: 34,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  subtitle: {
    marginTop: 8,
    color: '#94a3b8',
    fontSize: 15,
    lineHeight: 22,
  },
  card: {
    marginTop: 28,
    backgroundColor: '#171a2b',
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.22)',
  },
  label: {
    color: '#cbd5e1',
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#0b0d18',
    borderWidth: 1,
    borderColor: 'rgba(139,92,246,0.45)',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: '#f8fafc',
    fontSize: 16,
  },
  hint: {
    marginTop: 10,
    color: '#64748b',
    fontSize: 12,
    lineHeight: 18,
  },
  error: {
    marginTop: 12,
    color: '#fca5a5',
    fontSize: 13,
    lineHeight: 18,
  },
  primaryBtn: {
    marginTop: 18,
    backgroundColor: '#8b5cf6',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  secondaryBtn: {
    marginTop: 14,
    backgroundColor: '#334155',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  primaryBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  linkBtn: {
    marginTop: 16,
    alignItems: 'center',
    paddingVertical: 8,
  },
  linkBtnText: {
    color: '#a78bfa',
    fontSize: 13,
    fontWeight: '600',
  },
  prodUrl: {
    color: '#c4b5fd',
    fontSize: 13,
    lineHeight: 18,
  },
  footer: {
    marginTop: 22,
    color: '#64748b',
    fontSize: 12,
    lineHeight: 18,
  },
  preview: {
    marginTop: 10,
    color: '#a78bfa',
    fontSize: 12,
  },
  gameRoot: {
    flex: 1,
    backgroundColor: '#000',
  },
  webview: {
    flex: 1,
    backgroundColor: '#000',
  },
  webOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.72)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  webOverlayText: {
    color: '#fff',
    fontSize: 14,
  },
  exitBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingRight: 10,
  },
  gyroActions: {
    flexDirection: 'row',
    gap: 6,
  },
  calibBanner: {
    position: 'absolute',
    top: 52,
    alignSelf: 'center',
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  calibBannerText: {
    backgroundColor: 'rgba(15,18,32,0.8)',
    color: '#fde68a',
    fontSize: 12,
    fontWeight: '600',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    overflow: 'hidden',
  },
  exitBtn: {
    marginTop: Platform.OS === 'android' ? 10 : 0,
    marginLeft: 10,
    backgroundColor: 'rgba(15,18,32,0.72)',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
  },
  gyroOn: {
    borderColor: 'rgba(74,222,128,0.55)',
  },
  gyroOff: {
    borderColor: 'rgba(248,113,113,0.55)',
  },
  exitBtnText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
})
