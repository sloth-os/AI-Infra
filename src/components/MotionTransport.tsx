import { useEffect, useState } from 'react'
import type { RefObject } from 'react'
import {
  ArrowLeft,
  ArrowRight,
  Box,
  Compass,
  Focus,
  Gauge,
  Layers3,
  Pause,
  Play,
  RotateCcw,
  ScanLine,
} from 'lucide-react'
import type { SceneHandle } from './InfrastructureScene'
import type { CameraView } from '../motion'
import { ANIMATION_DURATION, getMotionFrame, motionChapters } from '../motion'
import type { Traffic } from '../content'

interface Props {
  sceneRef: RefObject<SceneHandle | null>
  mode: Traffic
  paused: boolean
  onPaused: (paused: boolean) => void
  onChapter: (index: number) => void
  speed: number
  onSpeed: (speed: number) => void
  exploded: boolean
  onExploded: (value: boolean) => void
  heatmap: boolean
  onHeatmap: (value: boolean) => void
  orbit: boolean
  onOrbit: (value: boolean) => void
  guided: boolean
  onGuided: () => void
}

export default function MotionTransport(props: Props) {
  const [frame, setFrame] = useState(() => getMotionFrame(0, props.mode))
  const [view, setView] = useState<CameraView>('isometric')
  useEffect(() => {
    const poll = () => {
      const frame = props.sceneRef.current?.getFrame()
      if (frame) setFrame(frame)
      const view = props.sceneRef.current?.getView()
      if (view) setView(view)
    }
    poll()
    const timer = window.setInterval(poll, 180)
    return () => window.clearInterval(timer)
  }, [props.sceneRef, props.mode])
  const chapters = motionChapters[props.mode]
  return (
    <div className="motion-transport">
      <div className="motion-playhead-row">
        <button
          className="motion-play-button"
          onClick={() => props.onPaused(!props.paused)}
          aria-label={props.paused ? 'Play timeline' : 'Pause timeline'}
        >
          {props.paused ? <Play size={16} /> : <Pause size={16} />}
        </button>
        <button
          className="motion-step-button"
          aria-label="Previous animation chapter"
          onClick={() => props.onChapter(Math.max(0, frame.chapterIndex - 1))}
        >
          <ArrowLeft size={13} />
        </button>
        <label className="motion-timeline">
          <span className="sr-only">Animation timeline</span>
          <input
            type="range"
            min={0}
            max={ANIMATION_DURATION}
            step={0.1}
            value={frame.time}
            onChange={(e) => {
              props.onPaused(true)
              props.sceneRef.current?.seek(Number(e.target.value))
              setFrame(
                props.sceneRef.current?.getFrame() ||
                  getMotionFrame(Number(e.target.value), props.mode),
              )
            }}
            aria-valuetext={`${frame.time.toFixed(1)} teaching seconds: ${frame.chapter.title}`}
            style={
              {
                '--motion-progress': `${frame.progress * 100}%`,
              } as React.CSSProperties
            }
          />
          <span className="motion-timeline-ticks">
            {chapters.map((chapter, i) => (
              <i
                key={chapter.short}
                style={{ left: `${(i / chapters.length) * 100}%` }}
              />
            ))}
          </span>
        </label>
        <button
          className="motion-step-button"
          aria-label="Next animation chapter"
          onClick={() =>
            props.onChapter(
              Math.min(chapters.length - 1, frame.chapterIndex + 1),
            )
          }
        >
          <ArrowRight size={13} />
        </button>
        <output className="motion-time" aria-label="Teaching time">
          {frame.time.toFixed(1)}
          <span> / 48 s</span>
        </output>
        <label className="motion-speed">
          <span className="sr-only">Animation speed</span>
          <select
            value={props.speed}
            onChange={(e) => props.onSpeed(Number(e.target.value))}
          >
            <option value={0.25}>0.25×</option>
            <option value={0.5}>0.5×</option>
            <option value={1}>1× speed</option>
            <option value={2}>2× speed</option>
          </select>
        </label>
        <button
          className="motion-step-button"
          aria-label="Restart animation"
          onClick={() => {
            props.sceneRef.current?.seek(0)
            props.onPaused(false)
          }}
        >
          <RotateCcw size={13} />
        </button>
      </div>
      <div
        className={`motion-chapters ${props.mode === 'collectives' ? 'collective-chapters' : ''}`}
        role="group"
        aria-label="Animation chapters"
      >
        {chapters.map((chapter, i) => (
          <button
            key={chapter.short}
            className={frame.chapterIndex === i ? 'active' : ''}
            onClick={() => props.onChapter(i)}
            title={chapter.title}
            aria-label={`Animation chapter ${i + 1}: ${chapter.title}`}
            aria-pressed={frame.chapterIndex === i}
          >
            <span>
              {props.mode === 'collectives'
                ? ''
                : String(i + 1).padStart(2, '0')}
            </span>
            {chapter.short}
          </button>
        ))}
      </div>
      <div className="motion-tools">
        <div
          className="motion-camera-presets"
          role="group"
          aria-label="Camera view"
        >
          {(['isometric', 'top', 'front'] as CameraView[]).map((v) => (
            <button
              key={v}
              className={view === v ? 'active' : ''}
              onClick={() => {
                setView(v)
                props.sceneRef.current?.view(v)
              }}
              aria-pressed={view === v}
            >
              {v === 'isometric' ? (
                <Box size={12} />
              ) : v === 'top' ? (
                <Layers3 size={12} />
              ) : (
                <Focus size={12} />
              )}
              <span>
                {v === 'isometric'
                  ? 'Isometric'
                  : v === 'top'
                    ? 'Top down'
                    : 'Front'}
              </span>
            </button>
          ))}
        </div>
        <span className="motion-tool-divider" />
        <button
          onClick={() => props.onExploded(!props.exploded)}
          className={props.exploded ? 'active' : ''}
          aria-pressed={props.exploded}
        >
          <Layers3 size={13} />
          Explode hardware
        </button>
        <button
          onClick={() => props.onHeatmap(!props.heatmap)}
          className={props.heatmap ? 'active' : ''}
          aria-pressed={props.heatmap}
        >
          <Gauge size={13} />
          Load heatmap
        </button>
        <button
          onClick={() => props.onOrbit(!props.orbit)}
          className={props.orbit ? 'active' : ''}
          aria-pressed={props.orbit}
        >
          <Compass size={13} />
          Orbit
        </button>
        <button onClick={() => props.sceneRef.current?.inspectPacket()}>
          <ScanLine size={13} />
          Inspect data
        </button>
        <button
          className={`guided-flight-button ${props.guided ? 'active' : ''}`}
          onClick={props.onGuided}
          aria-pressed={props.guided}
        >
          <Play size={12} />
          Guided flight
        </button>
      </div>
      <div className="motion-learning-note">
        <span className="tiny-dot" />
        Teaching time is slowed down. Data sizes are calculated; motion,
        topology, and load colors are illustrative.
      </div>
      <div className="motion-chapter-explanation" aria-live="polite">
        <div>
          <span className="small-label">WHAT THE MOTION MEANS</span>
          <p>{frame.chapter.explanation}</p>
        </div>
        <div>
          <span className="small-label">THE LIMIT TO WATCH</span>
          <p>{frame.chapter.constraint}</p>
        </div>
      </div>
    </div>
  )
}
