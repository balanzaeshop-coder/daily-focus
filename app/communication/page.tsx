'use client'

import { useState, useEffect, useRef, useCallback } from 'react'

interface Project {
  id: string
  name: string
  createdAt: string
}

interface Doc {
  id: string
  projectId: string
  title: string
  content: string
  createdAt: string
  updatedAt: string
}

type View = 'projects' | 'docs' | 'editor'

const PROJECTS_KEY = 'daily-focus:comm-projects'
const DOCS_KEY = 'daily-focus:comm-docs'

function uid() { return `${Date.now()}-${Math.random().toString(36).slice(2,7)}` }

function loadProjects(): Project[] {
  try { return JSON.parse(localStorage.getItem(PROJECTS_KEY) || '[]') } catch { return [] }
}
function saveProjects(p: Project[]) { localStorage.setItem(PROJECTS_KEY, JSON.stringify(p)) }
function loadDocs(): Doc[] {
  try { return JSON.parse(localStorage.getItem(DOCS_KEY) || '[]') } catch { return [] }
}
function saveDocs(d: Doc[]) { localStorage.setItem(DOCS_KEY, JSON.stringify(d)) }

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('sk-SK', { day: 'numeric', month: 'short', year: 'numeric' })
}

// Jednoduché renderovanie markdown pre náhľad
function renderMarkdown(text: string): string {
  return text
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    .replace(/^### (.+)$/gm,'<h3 style="font-size:1.1em;font-weight:700;margin:12px 0 4px">$1</h3>')
    .replace(/^## (.+)$/gm,'<h2 style="font-size:1.25em;font-weight:700;margin:16px 0 6px">$1</h2>')
    .replace(/^# (.+)$/gm,'<h1 style="font-size:1.5em;font-weight:800;margin:20px 0 8px">$1</h1>')
    .replace(/\*\*(.+?)\*\*/g,'<strong>$1</strong>')
    .replace(/\*(.+?)\*/g,'<em>$1</em>')
    .replace(/^- (.+)$/gm,'<li style="margin-left:16px;list-style:disc">$1</li>')
    .replace(/\n/g,'<br>')
}

export default function CommunicationPage() {
  const [view, setView] = useState<View>('projects')
  const [projects, setProjects] = useState<Project[]>([])
  const [docs, setDocs] = useState<Doc[]>([])
  const [selectedProject, setSelectedProject] = useState<Project | null>(null)
  const [selectedDoc, setSelectedDoc] = useState<Doc | null>(null)
  const [hydrated, setHydrated] = useState(false)

  // Editor state
  const [editTitle, setEditTitle] = useState('')
  const [editContent, setEditContent] = useState('')
  const [preview, setPreview] = useState(false)
  const [saved, setSaved] = useState(true)
  const [newProjectName, setNewProjectName] = useState('')
  const [addingProject, setAddingProject] = useState(false)
  const [newDocTitle, setNewDocTitle] = useState('')
  const [addingDoc, setAddingDoc] = useState(false)

  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setProjects(loadProjects())
    setDocs(loadDocs())
    setHydrated(true)
  }, [])

  // Auto-save s debounce
  useEffect(() => {
    if (!selectedDoc || !hydrated) return
    setSaved(false)
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    saveTimerRef.current = setTimeout(() => {
      const updated = loadDocs().map(d =>
        d.id === selectedDoc.id ? { ...d, title: editTitle, content: editContent, updatedAt: new Date().toISOString() } : d
      )
      saveDocs(updated)
      setDocs(updated)
      setSaved(true)
    }, 800)
  }, [editTitle, editContent])

  function createProject() {
    if (!newProjectName.trim()) return
    const p: Project = { id: uid(), name: newProjectName.trim(), createdAt: new Date().toISOString() }
    const updated = [...loadProjects(), p]
    saveProjects(updated)
    setProjects(updated)
    setNewProjectName('')
    setAddingProject(false)
  }

  function deleteProject(id: string) {
    const ps = loadProjects().filter(p => p.id !== id)
    const ds = loadDocs().filter(d => d.projectId !== id)
    saveProjects(ps); saveDocs(ds)
    setProjects(ps); setDocs(ds)
    if (selectedProject?.id === id) { setSelectedProject(null); setView('projects') }
  }

  function openProject(p: Project) {
    setSelectedProject(p)
    setView('docs')
  }

  function createDoc() {
    if (!newDocTitle.trim() || !selectedProject) return
    const d: Doc = { id: uid(), projectId: selectedProject.id, title: newDocTitle.trim(), content: '', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }
    const updated = [...loadDocs(), d]
    saveDocs(updated); setDocs(updated)
    setNewDocTitle(''); setAddingDoc(false)
    openDoc(d)
  }

  function deleteDoc(id: string) {
    const updated = loadDocs().filter(d => d.id !== id)
    saveDocs(updated); setDocs(updated)
    if (selectedDoc?.id === id) { setSelectedDoc(null); setView('docs') }
  }

  function openDoc(d: Doc) {
    setSelectedDoc(d)
    setEditTitle(d.title)
    setEditContent(d.content)
    setPreview(false)
    setSaved(true)
    setView('editor')
  }

  // Toolbar — vloží formátovanie okolo označeného textu
  function insertFormat(prefix: string, suffix: string, textarea: HTMLTextAreaElement | null) {
    if (!textarea) return
    const start = textarea.selectionStart, end = textarea.selectionEnd
    const sel = editContent.slice(start, end) || 'text'
    const newContent = editContent.slice(0, start) + prefix + sel + suffix + editContent.slice(end)
    setEditContent(newContent)
    setTimeout(() => { textarea.focus(); textarea.setSelectionRange(start + prefix.length, start + prefix.length + sel.length) }, 0)
  }

  // Export .txt
  function exportTxt() {
    if (!selectedDoc) return
    const blob = new Blob([`${editTitle}\n\n${editContent}`], { type: 'text/plain;charset=utf-8' })
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `${editTitle || 'dokument'}.txt`; a.click()
  }

  // Export .docx
  async function exportDocx() {
    if (!selectedDoc) return
    const { Document, Packer, Paragraph, TextRun, HeadingLevel } = await import('docx')
    const lines = editContent.split('\n')
    const children = lines.map(line => {
      if (line.startsWith('# ')) return new Paragraph({ text: line.slice(2), heading: HeadingLevel.HEADING_1 })
      if (line.startsWith('## ')) return new Paragraph({ text: line.slice(3), heading: HeadingLevel.HEADING_2 })
      if (line.startsWith('### ')) return new Paragraph({ text: line.slice(4), heading: HeadingLevel.HEADING_3 })
      return new Paragraph({ children: [new TextRun(line)] })
    })
    const doc = new Document({ sections: [{ properties: {}, children: [new Paragraph({ text: editTitle, heading: HeadingLevel.TITLE }), ...children] }] })
    const blob = await Packer.toBlob(doc)
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `${editTitle || 'dokument'}.docx`; a.click()
  }

  // Import dokumentu
  async function importFile(file: File) {
    if (!selectedProject) return
    let text = ''
    const name = file.name.replace(/\.[^.]+$/, '')

    if (file.name.endsWith('.txt') || file.name.endsWith('.md')) {
      text = await file.text()
    } else if (file.name.endsWith('.docx')) {
      const { extractRawText } = await import('mammoth')
      const arrayBuffer = await file.arrayBuffer()
      const result = await extractRawText({ arrayBuffer })
      text = result.value
    } else {
      text = await file.text()
    }

    const d: Doc = { id: uid(), projectId: selectedProject.id, title: name, content: text, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }
    const updated = [...loadDocs(), d]
    saveDocs(updated); setDocs(updated)
    openDoc(d)
  }

  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const projectDocs = selectedProject ? docs.filter(d => d.projectId === selectedProject.id) : []

  if (!hydrated) return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="w-6 h-6 rounded-full animate-spin border-2" style={{ borderColor: 'var(--border)', borderTopColor: 'var(--text)' }} />
    </div>
  )

  // ── EDITOR ─────────────────────────────────────────────────────────────────
  if (view === 'editor' && selectedDoc) return (
    <div className="flex flex-col min-h-screen pb-20">
      {/* Toolbar */}
      <div className="sticky top-0 z-10 border-b px-4 py-2 flex items-center gap-2 flex-wrap" style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
        <button onClick={() => setView('docs')} className="p-1.5 rounded-lg transition-colors" style={{ color: 'var(--text-muted)' }}>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div className="w-px h-5" style={{ background: 'var(--border)' }} />
        {[
          { label: 'B', action: () => insertFormat('**','**', textareaRef.current), style: 'font-bold' },
          { label: 'I', action: () => insertFormat('*','*', textareaRef.current), style: 'italic' },
          { label: 'H1', action: () => insertFormat('# ','', textareaRef.current), style: '' },
          { label: 'H2', action: () => insertFormat('## ','', textareaRef.current), style: '' },
          { label: '—', action: () => insertFormat('- ','', textareaRef.current), style: '' },
        ].map(btn => (
          <button key={btn.label} onClick={btn.action} className={`px-2 py-1 text-xs rounded-lg transition-colors ${btn.style}`}
            style={{ background: 'var(--bg)', color: 'var(--text)', fontFamily: btn.label === 'B' || btn.label === 'I' ? 'serif' : 'inherit' }}>
            {btn.label}
          </button>
        ))}
        <div className="w-px h-5" style={{ background: 'var(--border)' }} />
        <button onClick={() => setPreview(p => !p)} className="px-2 py-1 text-xs rounded-lg transition-colors"
          style={{ background: preview ? 'var(--text)' : 'var(--bg)', color: preview ? 'white' : 'var(--text-muted)' }}>
          {preview ? 'Editovať' : 'Náhľad'}
        </button>
        <div className="flex-1" />
        <span className="text-xs" style={{ color: 'var(--text-subtle)' }}>{saved ? '✓ Uložené' : 'Ukladám...'}</span>
        <div className="w-px h-5" style={{ background: 'var(--border)' }} />
        <button onClick={exportTxt} className="px-2 py-1 text-xs rounded-lg" style={{ background: 'var(--bg)', color: 'var(--text-muted)' }}>
          .txt
        </button>
        <button onClick={exportDocx} className="px-2 py-1 text-xs rounded-lg" style={{ background: 'var(--bg)', color: 'var(--text-muted)' }}>
          .docx
        </button>
      </div>

      {/* Dokument */}
      <div className="flex-1 max-w-2xl mx-auto w-full px-4 py-6">
        <input
          value={editTitle}
          onChange={e => setEditTitle(e.target.value)}
          placeholder="Názov dokumentu"
          className="w-full text-2xl font-bold bg-transparent outline-none mb-4"
          style={{ fontFamily: "'Cormorant Garant', serif", color: 'var(--text)' }}
        />
        {preview ? (
          <div className="text-sm leading-relaxed" style={{ color: 'var(--text)' }}
            dangerouslySetInnerHTML={{ __html: renderMarkdown(editContent) }} />
        ) : (
          <textarea
            ref={textareaRef}
            value={editContent}
            onChange={e => setEditContent(e.target.value)}
            placeholder={"Začni písať...\n\nTipy:\n# Nadpis 1\n## Nadpis 2\n**tučný text**\n*kurzíva*\n- odrážka"}
            className="w-full min-h-[60vh] bg-transparent outline-none text-sm leading-relaxed resize-none"
            style={{ color: 'var(--text)', fontFamily: 'inherit' }}
          />
        )}
      </div>
    </div>
  )

  // ── DOKUMENTY ──────────────────────────────────────────────────────────────
  if (view === 'docs' && selectedProject) return (
    <div className="max-w-lg mx-auto px-4 pt-10 pb-6">
      <div className="mb-6">
        <button onClick={() => setView('projects')} className="flex items-center gap-1.5 text-sm mb-3" style={{ color: 'var(--text-muted)' }}>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Všetky projekty
        </button>
        <h1 className="text-3xl font-bold" style={{ fontFamily: "'Cormorant Garant', serif", color: 'var(--text)' }}>
          {selectedProject.name}
        </h1>
        <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>{projectDocs.length} dokumentov</p>
      </div>

      {/* Akcie */}
      <div className="flex gap-2 mb-5">
        <button onClick={() => setAddingDoc(true)} className="flex-1 py-2.5 rounded-xl text-sm font-medium text-white" style={{ background: 'var(--text)' }}>
          + Nový dokument
        </button>
        <button onClick={() => fileInputRef.current?.click()} className="px-4 py-2.5 rounded-xl text-sm font-medium border" style={{ borderColor: 'var(--border)', color: 'var(--text-muted)', background: 'var(--card)' }}>
          Importovať
        </button>
        <input ref={fileInputRef} type="file" accept=".txt,.md,.docx" className="hidden" onChange={e => e.target.files?.[0] && importFile(e.target.files[0])} />
      </div>

      {addingDoc && (
        <div className="rounded-2xl border p-4 mb-4 animate-slide-up" style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
          <input autoFocus type="text" value={newDocTitle} onChange={e => setNewDocTitle(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') createDoc(); if (e.key === 'Escape') setAddingDoc(false) }}
            placeholder="Názov dokumentu" className="w-full text-sm bg-transparent outline-none mb-3" style={{ color: 'var(--text)' }} />
          <div className="flex gap-2">
            <button onClick={createDoc} className="flex-1 py-2 rounded-xl text-sm font-medium text-white" style={{ background: 'var(--text)' }}>Vytvoriť</button>
            <button onClick={() => setAddingDoc(false)} className="px-4 py-2 rounded-xl text-sm" style={{ color: 'var(--text-muted)' }}>Zrušiť</button>
          </div>
        </div>
      )}

      {projectDocs.length === 0 && !addingDoc ? (
        <div className="text-center py-16">
          <div className="text-4xl mb-3">📝</div>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Žiadne dokumenty.</p>
          <p className="text-xs mt-1" style={{ color: 'var(--text-subtle)' }}>Vytvor nový alebo importuj súbor.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {projectDocs.sort((a,b) => b.updatedAt.localeCompare(a.updatedAt)).map(doc => (
            <div key={doc.id} className="rounded-2xl border p-4 flex items-center gap-3 cursor-pointer group" style={{ background: 'var(--card)', borderColor: 'var(--border)' }} onClick={() => openDoc(doc)}>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate" style={{ color: 'var(--text)' }}>{doc.title}</p>
                <p className="text-xs mt-0.5" style={{ color: 'var(--text-subtle)' }}>
                  {fmtDate(doc.updatedAt)} · {doc.content.length} znakov
                </p>
              </div>
              <button onClick={e => { e.stopPropagation(); deleteDoc(doc.id) }}
                className="p-1.5 opacity-0 group-hover:opacity-100 transition-opacity hover:text-red-500"
                style={{ color: 'var(--text-subtle)' }}>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
              <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" style={{ color: 'var(--text-subtle)' }}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </div>
          ))}
        </div>
      )}
    </div>
  )

  // ── PROJEKTY ───────────────────────────────────────────────────────────────
  return (
    <div className="max-w-lg mx-auto px-4 pt-10 pb-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold" style={{ fontFamily: "'Cormorant Garant', serif", color: 'var(--text)' }}>Komunikácia</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>Pracovný priestor pre tvorbu textov</p>
      </div>

      <button onClick={() => setAddingProject(true)} className="w-full py-3 rounded-xl text-sm font-medium text-white mb-5" style={{ background: 'var(--text)' }}>
        + Nový projekt
      </button>

      {addingProject && (
        <div className="rounded-2xl border p-4 mb-4 animate-slide-up" style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
          <input autoFocus type="text" value={newProjectName} onChange={e => setNewProjectName(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') createProject(); if (e.key === 'Escape') setAddingProject(false) }}
            placeholder="Názov projektu (napr. Instagram texty)" className="w-full text-sm bg-transparent outline-none mb-3" style={{ color: 'var(--text)' }} />
          <div className="flex gap-2">
            <button onClick={createProject} className="flex-1 py-2 rounded-xl text-sm font-medium text-white" style={{ background: 'var(--text)' }}>Vytvoriť</button>
            <button onClick={() => setAddingProject(false)} className="px-4 py-2 rounded-xl text-sm" style={{ color: 'var(--text-muted)' }}>Zrušiť</button>
          </div>
        </div>
      )}

      {projects.length === 0 && !addingProject ? (
        <div className="text-center py-16">
          <div className="text-4xl mb-3">✍️</div>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Žiadne projekty.</p>
          <p className="text-xs mt-1" style={{ color: 'var(--text-subtle)' }}>Vytvor prvý projekt a začni písať.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {projects.map(project => {
            const docCount = docs.filter(d => d.projectId === project.id).length
            return (
              <div key={project.id} className="rounded-2xl border p-5 cursor-pointer group" style={{ background: 'var(--card)', borderColor: 'var(--border)' }} onClick={() => openProject(project)}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold" style={{ color: 'var(--text)' }}>{project.name}</p>
                    <p className="text-xs mt-1" style={{ color: 'var(--text-subtle)' }}>
                      {docCount} {docCount === 1 ? 'dokument' : docCount >= 2 && docCount <= 4 ? 'dokumenty' : 'dokumentov'} · {fmtDate(project.createdAt)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={e => { e.stopPropagation(); deleteProject(project.id) }}
                      className="p-1.5 opacity-0 group-hover:opacity-100 transition-opacity hover:text-red-500"
                      style={{ color: 'var(--text-subtle)' }}>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" style={{ color: 'var(--text-subtle)' }}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
