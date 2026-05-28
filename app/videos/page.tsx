'use client'

import { useState, useRef, useCallback } from 'react'

// Rovnaké konštanty ako v Python app
const SPEECH_LEAD_IN = 0.08
const SPEECH_TRAIL_OUT = 0.18
const MERGE_SPEECH_GAP = 0.45
const CAPTION_WORDS = 3

type Step = 'upload' | 'transcribing' | 'edit' | 'rendering' | 'done'

interface Word { text: string; start: number; end: number }
interface Block { id: string; start: number; end: number; text: string; keep: boolean }
interface Caption { id: string; start: number; end: number; text: string }

function buildBlocks(words: Word[]): Block[] {
  if (!words.length) return []
  const segs: { start: number; end: number; words: Word[] }[] = []
  let cur = { start: Math.max(0, words[0].start - SPEECH_LEAD_IN), end: words[0].end + SPEECH_TRAIL_OUT, words: [words[0]] }

  for (let i = 1; i < words.length; i++) {
    const w = words[i]
    const ws = Math.max(0, w.start - SPEECH_LEAD_IN)
    const we = w.end + SPEECH_TRAIL_OUT
    if (ws - cur.end < MERGE_SPEECH_GAP) {
      cur.end = Math.max(cur.end, we)
      cur.words.push(w)
    } else {
      segs.push(cur)
      cur = { start: ws, end: we, words: [w] }
    }
  }
  segs.push(cur)

  return segs.map(s => ({
    id: crypto.randomUUID(),
    start: s.start,
    end: s.end,
    text: s.words.map(w => w.text.trim()).join(' '),
    keep: true,
  }))
}

function buildCaptions(words: Word[]): Caption[] {
  const caps: Caption[] = []
  for (let i = 0; i < words.length; i += CAPTION_WORDS) {
    const chunk = words.slice(i, i + CAPTION_WORDS)
    caps.push({
      id: crypto.randomUUID(),
      start: chunk[0].start,
      end: chunk[chunk.length - 1].end,
      text: chunk.map(w => w.text.trim()).join(' '),
    })
  }
  return caps
}

function fmtTime(s: number): string {
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = Math.floor(s % 60)
  const cs = Math.floor((s % 1) * 100)
  return `${h}:${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}.${String(cs).padStart(2,'0')}`
}

function fmtSec(s: number): string {
  const m = Math.floor(s / 60)
  const sec = Math.floor(s % 60)
  return `${m}:${String(sec).padStart(2,'0')}`
}

function remapTime(t: number, keeps: Block[]): number | null {
  let acc = 0
  for (const b of keeps) {
    if (t >= b.start && t <= b.end) return acc + (t - b.start)
    if (t < b.start) return null
    acc += b.end - b.start
  }
  return null
}

function generateASS(captions: Caption[], keeps: Block[]): string {
  const header = `[Script Info]
ScriptType: v4.00+
PlayResX: 1920
PlayResY: 1080

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Default,Arial,72,&H00FFFFFF,&H000000FF,&H00000000,&H80000000,-1,0,0,0,100,100,0,0,1,3,0,2,10,10,60,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
`
  const lines = captions.flatMap(cap => {
    const ns = remapTime(cap.start, keeps)
    const ne = remapTime(cap.end, keeps)
    if (ns === null || ne === null || ne <= ns) return []
    const txt = cap.text.replace(/\\/g,'\\\\').replace(/\{/g,'\\{').replace(/\}/g,'\\}')
    return [`Dialogue: 0,${fmtTime(ns)},${fmtTime(ne)},Default,,0,0,0,,${txt}`]
  })
  return header + lines.join('\n')
}

export default function VideoPage() {
  const [step, setStep] = useState<Step>('upload')
  const [videoFile, setVideoFile] = useState<File | null>(null)
  const [progress, setProgress] = useState('')
  const [progressPct, setProgressPct] = useState(0)
  const [blocks, setBlocks] = useState<Block[]>([])
  const [captions, setCaptions] = useState<Caption[]>([])
  const [outputUrl, setOutputUrl] = useState<string | null>(null)
  const [outputName, setOutputName] = useState('')
  const [activeTab, setActiveTab] = useState<'blocks' | 'captions'>('blocks')
  const [dragging, setDragging] = useState(false)
  const ffmpegRef = useRef<any>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFile = useCallback((file: File) => {
    if (!file.type.startsWith('video/') && !file.name.match(/\.(mp4|mov|avi|mkv|webm)$/i)) return
    setVideoFile(file)
    setOutputName(file.name.replace(/\.[^.]+$/, '') + '-s-titulkami.mp4')
  }, [])

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }, [handleFile])

  async function handleTranscribe() {
    if (!videoFile) return
    setStep('transcribing')
    setProgressPct(0)

    try {
      setProgress('Načítavam Whisper AI model... (prvé spustenie ~1-2 min)')
      setProgressPct(10)

      const { pipeline, env } = await import('@xenova/transformers')
      // @ts-ignore
      env.allowLocalModels = false

      const transcriber = await pipeline(
        'automatic-speech-recognition',
        'Xenova/whisper-base',
        {
          // @ts-ignore
          progress_callback: (p: any) => {
            if (p.status === 'downloading') {
              const pct = Math.round((p.loaded / p.total) * 40)
              setProgressPct(10 + pct)
              setProgress(`Sťahujem AI model... ${Math.round((p.loaded / 1024 / 1024))} MB`)
            }
          }
        }
      )

      setProgress('Prepísujem reč... (môže trvať niekoľko minút)')
      setProgressPct(55)

      const audioBlob = await extractAudio(videoFile)
      const audioArray = await blobToFloat32(audioBlob)

      const result = await transcriber(audioArray, {
        language: 'slovak',
        task: 'transcribe',
        return_timestamps: 'word',
        chunk_length_s: 30,
      })

      setProgressPct(90)
      setProgress('Spracúvam výsledky...')

      // @ts-ignore
      const words: Word[] = (result.chunks || []).map((c: any) => ({
        text: c.text,
        start: c.timestamp[0] ?? 0,
        end: c.timestamp[1] ?? 0,
      })).filter((w: Word) => w.text.trim() && w.end > w.start)

      setBlocks(buildBlocks(words))
      setCaptions(buildCaptions(words))
      setProgressPct(100)
      setStep('edit')

    } catch (e: any) {
      setProgress('Chyba: ' + (e?.message || String(e)))
    }
  }

  async function extractAudio(file: File): Promise<Blob> {
    const ctx = new AudioContext({ sampleRate: 16000 })
    const arrayBuffer = await file.arrayBuffer()
    const audioBuffer = await ctx.decodeAudioData(arrayBuffer)
    const channelData = audioBuffer.getChannelData(0)
    // Convert to WAV blob
    const wavBuffer = encodeWAV(channelData, 16000)
    return new Blob([wavBuffer], { type: 'audio/wav' })
  }

  function encodeWAV(samples: Float32Array, sampleRate: number): ArrayBuffer {
    const buf = new ArrayBuffer(44 + samples.length * 2)
    const view = new DataView(buf)
    const writeStr = (off: number, s: string) => { for (let i = 0; i < s.length; i++) view.setUint8(off + i, s.charCodeAt(i)) }
    writeStr(0, 'RIFF')
    view.setUint32(4, 36 + samples.length * 2, true)
    writeStr(8, 'WAVE')
    writeStr(12, 'fmt ')
    view.setUint32(16, 16, true)
    view.setUint16(20, 1, true)
    view.setUint16(22, 1, true)
    view.setUint32(24, sampleRate, true)
    view.setUint32(28, sampleRate * 2, true)
    view.setUint16(32, 2, true)
    view.setUint16(34, 16, true)
    writeStr(36, 'data')
    view.setUint32(40, samples.length * 2, true)
    let off = 44
    for (let i = 0; i < samples.length; i++) {
      view.setInt16(off, Math.max(-1, Math.min(1, samples[i])) * 0x7FFF, true)
      off += 2
    }
    return buf
  }

  async function blobToFloat32(blob: Blob): Promise<Float32Array> {
    const ctx = new AudioContext({ sampleRate: 16000 })
    const buf = await blob.arrayBuffer()
    const audio = await ctx.decodeAudioData(buf)
    return audio.getChannelData(0)
  }

  async function handleRender() {
    if (!videoFile) return
    setStep('rendering')
    setProgressPct(0)

    try {
      const { createFFmpeg, fetchFile } = await import('@ffmpeg/ffmpeg')

      if (!ffmpegRef.current) {
        ffmpegRef.current = createFFmpeg({
          log: false,
          corePath: 'https://unpkg.com/@ffmpeg/core@0.11.0/dist/ffmpeg-core.js',
        })
      }

      const ffmpeg = ffmpegRef.current
      if (!ffmpeg.isLoaded()) {
        setProgress('Načítavam FFmpeg...')
        await ffmpeg.load()
      }

      setProgress('Kopírujem video...')
      setProgressPct(10)
      const inputData = await fetchFile(videoFile)
      ffmpeg.FS('writeFile', 'input.mp4', inputData)

      const keeps = blocks.filter(b => b.keep)

      // Krok 1: Vystrihovanie tichých sekcií
      setProgress('Strihám video...')
      setProgressPct(30)

      const selectExpr = keeps.map(b => `between(t,${b.start.toFixed(3)},${b.end.toFixed(3)})`).join('+')

      ffmpeg.setProgress(({ ratio }: { ratio: number }) => {
        setProgressPct(30 + Math.round(ratio * 35))
      })

      await ffmpeg.run(
        '-i', 'input.mp4',
        '-vf', `select='${selectExpr}',setpts=N/FRAME_RATE/TB`,
        '-af', `aselect='${selectExpr}',asetpts=N/SR/TB`,
        '-c:v', 'libx264',
        '-c:a', 'aac',
        '-preset', 'fast',
        'cut.mp4'
      )

      // Krok 2: Titulky
      setProgress('Pridávam titulky...')
      setProgressPct(65)

      const assContent = generateASS(captions, keeps)
      ffmpeg.FS('writeFile', 'subs.ass', new TextEncoder().encode(assContent))

      ffmpeg.setProgress(({ ratio }: { ratio: number }) => {
        setProgressPct(65 + Math.round(ratio * 30))
      })

      await ffmpeg.run(
        '-i', 'cut.mp4',
        '-vf', 'ass=subs.ass',
        '-c:v', 'libx264',
        '-c:a', 'copy',
        '-preset', 'fast',
        'output.mp4'
      )

      setProgress('Dokončujem...')
      setProgressPct(98)

      const data = ffmpeg.FS('readFile', 'output.mp4')
      const blob = new Blob([data.buffer], { type: 'video/mp4' })
      setOutputUrl(URL.createObjectURL(blob))
      setProgressPct(100)
      setStep('done')

    } catch (e: any) {
      setProgress('Chyba pri renderovaní: ' + (e?.message || String(e)))
      setStep('edit')
    }
  }

  const keepCount = blocks.filter(b => b.keep).length
  const totalDur = blocks.filter(b => b.keep).reduce((s, b) => s + (b.end - b.start), 0)
  const origDur = blocks.reduce((s, b) => s + (b.end - b.start), 0)

  // ── UI ──────────────────────────────────────────────────────────────────────

  if (step === 'upload') return (
    <div className="max-w-lg mx-auto px-4 pt-10 pb-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold" style={{ fontFamily: "'Cormorant Garant', serif", color: 'var(--text)' }}>
          Editor videa
        </h1>
        <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
          Automatický prepis · vystrihovanie tichých sekcií · titulky
        </p>
      </div>

      <div
        onDragOver={e => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        onClick={() => fileInputRef.current?.click()}
        className="rounded-2xl border-2 border-dashed cursor-pointer transition-all flex flex-col items-center justify-center py-16 px-6 text-center"
        style={{ borderColor: dragging ? 'var(--text-muted)' : 'var(--border)', background: dragging ? 'var(--bg)' : 'var(--card)' }}
      >
        <div className="text-4xl mb-4">🎬</div>
        <p className="text-sm font-medium" style={{ color: 'var(--text)' }}>
          {videoFile ? videoFile.name : 'Pretiahni video sem alebo klikni'}
        </p>
        <p className="text-xs mt-1" style={{ color: 'var(--text-subtle)' }}>
          {videoFile ? `${(videoFile.size / 1024 / 1024).toFixed(1)} MB` : 'MP4, MOV, AVI'}
        </p>
        <input ref={fileInputRef} type="file" accept="video/*,.mov" className="hidden" onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])} />
      </div>

      {videoFile && (
        <button
          onClick={handleTranscribe}
          className="mt-4 w-full py-3.5 rounded-xl text-sm font-semibold text-white transition-all"
          style={{ background: 'var(--text)' }}
        >
          Prepísať a editovať
        </button>
      )}

      <div className="mt-6 rounded-xl border p-4" style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
        <p className="text-xs font-semibold mb-2" style={{ color: 'var(--text-muted)' }}>ℹ️ Ako to funguje</p>
        <ul className="text-xs space-y-1" style={{ color: 'var(--text-subtle)' }}>
          <li>• Video sa spracuje priamo v tvojom prehliadači — nikam sa neposiela</li>
          <li>• Pri prvom použití sa stiahne AI model (~150 MB) — uloží sa do cache</li>
          <li>• Odporúča sa Chrome na PC pre najlepší výkon</li>
        </ul>
      </div>
    </div>
  )

  if (step === 'transcribing') return (
    <div className="max-w-lg mx-auto px-4 pt-10 pb-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold" style={{ fontFamily: "'Cormorant Garant', serif", color: 'var(--text)' }}>
          Prepísujem...
        </h1>
        <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>{progress}</p>
      </div>

      <div className="rounded-2xl border p-6" style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
        <div className="h-2 rounded-full overflow-hidden mb-3" style={{ background: 'var(--bg)' }}>
          <div className="h-full rounded-full transition-all duration-500" style={{ width: `${progressPct}%`, background: 'var(--text)' }} />
        </div>
        <p className="text-xs text-center" style={{ color: 'var(--text-subtle)' }}>{progressPct}%</p>
        <p className="text-xs text-center mt-4" style={{ color: 'var(--text-subtle)' }}>
          Nestrácej okno prehliadača — spracovanie beží na pozadí
        </p>
      </div>
    </div>
  )

  if (step === 'rendering') return (
    <div className="max-w-lg mx-auto px-4 pt-10 pb-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold" style={{ fontFamily: "'Cormorant Garant', serif", color: 'var(--text)' }}>
          Renderujem...
        </h1>
        <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>{progress}</p>
      </div>

      <div className="rounded-2xl border p-6" style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
        <div className="h-2 rounded-full overflow-hidden mb-3" style={{ background: 'var(--bg)' }}>
          <div className="h-full rounded-full transition-all duration-500" style={{ width: `${progressPct}%`, background: 'var(--text)' }} />
        </div>
        <p className="text-xs text-center" style={{ color: 'var(--text-subtle)' }}>{progressPct}%</p>
        <p className="text-xs text-center mt-4" style={{ color: 'var(--text-subtle)' }}>
          Nestrácej okno prehliadača
        </p>
      </div>
    </div>
  )

  if (step === 'done') return (
    <div className="max-w-lg mx-auto px-4 pt-10 pb-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold" style={{ fontFamily: "'Cormorant Garant', serif", color: 'var(--text)' }}>
          Hotovo! 🎉
        </h1>
        <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>Video je pripravené na stiahnutie</p>
      </div>

      {outputUrl && (
        <video src={outputUrl} controls className="w-full rounded-2xl mb-4" style={{ border: `1px solid var(--border)` }} />
      )}

      <a
        href={outputUrl!}
        download={outputName}
        className="block w-full py-3.5 rounded-xl text-sm font-semibold text-white text-center transition-all mb-3"
        style={{ background: 'var(--text)' }}
      >
        Stiahnuť video
      </a>

      <button
        onClick={() => { setStep('upload'); setVideoFile(null); setOutputUrl(null); setBlocks([]); setCaptions([]) }}
        className="w-full py-3 rounded-xl text-sm font-medium transition-all border"
        style={{ color: 'var(--text-muted)', borderColor: 'var(--border)', background: 'var(--card)' }}
      >
        Nové video
      </button>
    </div>
  )

  // ── Edit step ───────────────────────────────────────────────────────────────
  return (
    <div className="max-w-lg mx-auto px-4 pt-10 pb-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold" style={{ fontFamily: "'Cormorant Garant', serif", color: 'var(--text)' }}>
          Editovať
        </h1>
        <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
          {videoFile?.name} · {keepCount}/{blocks.length} sekcií · {fmtSec(totalDur)} z {fmtSec(origDur)}
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-xl mb-5" style={{ background: 'var(--bg)' }}>
        {([['blocks', 'Sekcie'], ['captions', 'Titulky']] as const).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className="flex-1 py-2 text-sm font-medium rounded-lg transition-all"
            style={activeTab === key
              ? { background: 'var(--card)', color: 'var(--text)', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }
              : { color: 'var(--text-muted)' }}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Blocks tab */}
      {activeTab === 'blocks' && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs" style={{ color: 'var(--text-subtle)' }}>
              Vypni sekcie ktoré chceš vystrihnúť
            </p>
            <button
              onClick={() => setBlocks(b => b.map(x => ({ ...x, keep: true })))}
              className="text-xs" style={{ color: 'var(--text-muted)' }}
            >
              Všetko zapnúť
            </button>
          </div>
          <div className="space-y-2">
            {blocks.map((block, i) => (
              <div key={block.id} className="rounded-xl border p-3 flex items-start gap-3 transition-all"
                style={{ background: 'var(--card)', borderColor: 'var(--border)', opacity: block.keep ? 1 : 0.45 }}>
                <button
                  onClick={() => setBlocks(bs => bs.map(b => b.id === block.id ? { ...b, keep: !b.keep } : b))}
                  className="mt-0.5 w-10 h-5 rounded-full flex-shrink-0 relative transition-all"
                  style={{ background: block.keep ? 'var(--text)' : 'var(--border)' }}
                >
                  <span className="absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all"
                    style={{ left: block.keep ? '22px' : '2px', boxShadow: '0 1px 2px rgba(0,0,0,0.2)' }} />
                </button>
                <div className="flex-1 min-w-0">
                  <p className="text-xs mb-0.5" style={{ color: 'var(--text-subtle)' }}>
                    {fmtSec(block.start)} – {fmtSec(block.end)} ({(block.end - block.start).toFixed(1)}s)
                  </p>
                  <p className="text-sm leading-snug" style={{ color: 'var(--text)' }}>{block.text || '(ticho)'}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Captions tab */}
      {activeTab === 'captions' && (
        <div className="space-y-2">
          {captions.map(cap => (
            <div key={cap.id} className="rounded-xl border p-3" style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
              <p className="text-xs mb-1" style={{ color: 'var(--text-subtle)' }}>
                {fmtSec(cap.start)} – {fmtSec(cap.end)}
              </p>
              <input
                type="text"
                value={cap.text}
                onChange={e => setCaptions(cs => cs.map(c => c.id === cap.id ? { ...c, text: e.target.value } : c))}
                className="w-full text-sm bg-transparent outline-none"
                style={{ color: 'var(--text)' }}
              />
            </div>
          ))}
        </div>
      )}

      {/* Render button */}
      <div className="sticky bottom-24 mt-6">
        <button
          onClick={handleRender}
          className="w-full py-3.5 rounded-xl text-sm font-semibold text-white shadow-lg transition-all"
          style={{ background: 'var(--text)' }}
        >
          Renderovať video ({fmtSec(totalDur)})
        </button>
      </div>
    </div>
  )
}
