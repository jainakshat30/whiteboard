'use client'

import { useSceneStore } from '@/store/scene'
import { useToolStore } from '@/store/tools'
import { useThemeStore } from '@/store/theme'

const STROKE_COLORS = ['#1e1e1e', '#ff8f8f', '#69d286', '#6eb1fa', '#ffa336', '#e5e7eb']
const FILL_COLORS = ['transparent', '#ff8f8f', '#69d286', '#6eb1fa', '#ffa336', '#1e1e1e']
const STROKE_WIDTHS = [1, 2, 4]
const STROKE_STYLES = ['solid', 'dashed', 'dotted'] as const
const ROUGHNESSES = [0, 1, 2.5]
const ROUNDNESSES = ['sharp', 'round'] as const

const FONT_FAMILIES = [
  { id: 'sans-serif', icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="4 20 12 4 20 20"/><line x1="8" y1="14" x2="16" y2="14"/></svg> },
  { id: 'serif', icon: <span className="font-serif text-base font-medium leading-none">A</span> },
  { id: 'monospace', icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg> },
  { id: 'cursive', icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg> },
]

const FONT_SIZES = [
  { id: 16, label: 'S' },
  { id: 20, label: 'M' },
  { id: 28, label: 'L' },
  { id: 36, label: 'XL' },
]

const TEXT_ALIGNS = [
  { id: 'left', icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="17" y1="10" x2="3" y2="10"></line><line x1="21" y1="6" x2="3" y2="6"></line><line x1="21" y1="14" x2="3" y2="14"></line><line x1="17" y1="18" x2="3" y2="18"></line></svg> },
  { id: 'center', icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="10" x2="6" y2="10"></line><line x1="21" y1="6" x2="3" y2="6"></line><line x1="21" y1="14" x2="3" y2="14"></line><line x1="18" y1="18" x2="6" y2="18"></line></svg> },
  { id: 'right', icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="21" y1="10" x2="7" y2="10"></line><line x1="21" y1="6" x2="3" y2="6"></line><line x1="21" y1="14" x2="3" y2="14"></line><line x1="21" y1="18" x2="7" y2="18"></line></svg> },
]

export function PropertiesPanel() {
  const elements = useSceneStore((s) => s.elements)
  const selectedId = useSceneStore((s) => s.selectedId)
  const updateElement = useSceneStore((s) => s.updateElement)
  const removeElement = useSceneStore((s) => s.removeElement)
  const bringToFront = useSceneStore((s) => s.bringToFront)
  const sendToBack = useSceneStore((s) => s.sendToBack)
  const bringForward = useSceneStore((s) => s.bringForward)
  const sendBackward = useSceneStore((s) => s.sendBackward)
  
  const { activeTool, setStyle, ...defaultStyle } = useToolStore()
  const theme = useThemeStore((s) => s.theme)
  
  // Get active properties (either from selected element, or default preferences)
  const selectedEl = selectedId ? elements.find((e) => e.id === selectedId) : null
  const isEditing = !!selectedEl

  // Decide whether to show panel: if a shape tool is selected, OR a shape element is selected
  const isShapeTool = ['rectangle', 'ellipse', 'diamond', 'line', 'freedraw'].includes(activeTool)
  const isShapeSelected = selectedEl && ['rectangle', 'ellipse', 'diamond', 'line', 'freedraw'].includes(selectedEl.type)
  const isShapePanel = isShapeTool || isShapeSelected
  
  const isTextTool = activeTool === 'text'
  const isTextSelected = selectedEl && selectedEl.type === 'text'
  const isTextPanel = isTextTool || isTextSelected

  const showPanel = isShapePanel || isTextPanel
  if (!showPanel) return null

  const activeStroke = isEditing ? selectedEl.strokeColor : defaultStyle.strokeColor
  const activeFill = isEditing ? selectedEl.fillColor : defaultStyle.fillColor
  const activeStrokeWidth = isEditing ? (selectedEl.strokeWidth || 2) : defaultStyle.strokeWidth
  const activeStrokeStyle = isEditing ? (selectedEl.strokeStyle || 'solid') : defaultStyle.strokeStyle
  const activeRoughness = isEditing ? (selectedEl.roughness ?? 1) : defaultStyle.roughness
  const activeRoundness = isEditing ? (selectedEl.roundness || 'sharp') : defaultStyle.roundness
  const activeOpacity = isEditing ? (selectedEl.opacity ?? 100) : defaultStyle.opacity
  const activeFontFamily = isEditing ? (selectedEl.fontFamily || 'sans-serif') : defaultStyle.fontFamily
  const activeFontSize = isEditing ? (selectedEl.fontSize || 20) : defaultStyle.fontSize
  const activeTextAlign = isEditing ? (selectedEl.textAlign || 'left') : defaultStyle.textAlign

  const handleStyleChange = (updates: any) => {
    if (isEditing && selectedId) {
      updateElement(selectedId, updates)
    } else {
      setStyle(updates)
    }
  }

  const handleDuplicate = () => {
    if (!selectedEl) return
    const { id, version, zIndex, ...props } = selectedEl
    const newEl = {
      ...props,
      id: crypto.randomUUID(),
      x: props.x + 20,
      y: props.y + 20,
      version: 0,
    } as any 
    useSceneStore.getState().addElement(newEl)
    useSceneStore.getState().setSelectedId(newEl.id)
  }

  const isDark = theme === 'dark'

  return (
    <div className="fixed left-4 top-1/2 -translate-y-1/2 w-[220px] bg-white/95 dark:bg-[#232329]/95 backdrop-blur-md rounded-2xl shadow-xl border border-neutral-200/80 dark:border-neutral-800 p-4 text-neutral-800 dark:text-neutral-100 flex flex-col gap-5 overflow-y-auto max-h-[90vh] custom-scrollbar z-40">
      
      {/* Stroke Color */}
      <div className="flex flex-col gap-2">
        <label className="text-xs font-medium text-neutral-600 dark:text-neutral-400">Stroke</label>
        <div className="flex flex-wrap gap-2">
          {STROKE_COLORS.map((color) => {
            const isSelected = activeStroke === color || (color === '#1e1e1e' && (activeStroke === '#1e1e1e' || activeStroke === '#f3f4f6'))
            const renderColor = color === '#1e1e1e' ? (isDark ? '#e5e7eb' : '#1e1e1e') : color
            return (
              <button
                key={color}
                onClick={() => handleStyleChange({ strokeColor: color })}
                className={`w-6 h-6 rounded-md transition-transform hover:scale-110 border ${
                  isSelected ? 'border-indigo-500 ring-2 ring-indigo-500/40 ring-offset-1 dark:ring-offset-neutral-900' : 'border-neutral-200 dark:border-neutral-700'
                }`}
                style={{ backgroundColor: renderColor }}
                title="Stroke color"
              />
            )
          })}
        </div>
      </div>

      {/* Fill Color */}
      <div className="flex flex-col gap-2">
        <label className="text-xs font-medium text-neutral-600 dark:text-neutral-400">Background</label>
        <div className="flex flex-wrap gap-2">
          {FILL_COLORS.map((color) => {
            const isSelected = activeFill === color
            const isTransparent = color === 'transparent'
            return (
              <button
                key={color}
                onClick={() => handleStyleChange({ fillColor: color })}
                className={`w-6 h-6 rounded-md transition-transform hover:scale-110 border relative overflow-hidden flex items-center justify-center ${
                  isSelected ? 'border-indigo-500 ring-2 ring-indigo-500/40 ring-offset-1 dark:ring-offset-neutral-900' : 'border-neutral-200 dark:border-neutral-700'
                }`}
                style={{ backgroundColor: isTransparent ? undefined : (color === '#1e1e1e' && isDark ? '#e5e7eb' : color) }}
                title="Fill color"
              >
                {isTransparent && (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="opacity-40">
                    <line x1="3" y1="3" x2="21" y2="21" />
                    <line x1="21" y1="3" x2="3" y2="21" />
                  </svg>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* Font Settings (Text Only) */}
      {isTextPanel && (
        <>
          <div className="flex flex-col gap-2">
            <label className="text-xs font-medium text-neutral-600 dark:text-neutral-400">Font family</label>
            <div className="flex gap-2">
              {FONT_FAMILIES.map((font) => {
                const isSelected = activeFontFamily === font.id
                return (
                  <button
                    key={font.id}
                    onClick={() => handleStyleChange({ fontFamily: font.id })}
                    className={`flex-1 h-9 flex items-center justify-center rounded-lg transition border ${
                      isSelected 
                        ? 'bg-indigo-100/50 dark:bg-indigo-900/40 border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300' 
                        : 'bg-neutral-100 dark:bg-neutral-800 border-transparent hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-600 dark:text-neutral-300'
                    }`}
                  >
                    {font.icon}
                  </button>
                )
              })}
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-xs font-medium text-neutral-600 dark:text-neutral-400">Font size</label>
            <div className="flex gap-2">
              {FONT_SIZES.map((size) => {
                const isSelected = activeFontSize === size.id
                return (
                  <button
                    key={size.id}
                    onClick={() => handleStyleChange({ fontSize: size.id })}
                    className={`flex-1 h-9 flex items-center justify-center rounded-lg transition border text-xs font-medium ${
                      isSelected 
                        ? 'bg-indigo-100/50 dark:bg-indigo-900/40 border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300' 
                        : 'bg-neutral-100 dark:bg-neutral-800 border-transparent hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-600 dark:text-neutral-300'
                    }`}
                  >
                    {size.label}
                  </button>
                )
              })}
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-xs font-medium text-neutral-600 dark:text-neutral-400">Text align</label>
            <div className="flex gap-2">
              {TEXT_ALIGNS.map((align) => {
                const isSelected = activeTextAlign === align.id
                return (
                  <button
                    key={align.id}
                    onClick={() => handleStyleChange({ textAlign: align.id })}
                    className={`w-10 h-9 flex items-center justify-center rounded-lg transition border ${
                      isSelected 
                        ? 'bg-indigo-100/50 dark:bg-indigo-900/40 border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300' 
                        : 'bg-neutral-100 dark:bg-neutral-800 border-transparent hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-600 dark:text-neutral-300'
                    }`}
                  >
                    {align.icon}
                  </button>
                )
              })}
            </div>
          </div>
        </>
      )}

      {/* Shape Settings (Shape Only) */}
      {isShapePanel && (
        <>
          {/* Stroke Width */}
          <div className="flex flex-col gap-2">
            <label className="text-xs font-medium text-neutral-600 dark:text-neutral-400">Stroke width</label>
            <div className="flex gap-2">
              {STROKE_WIDTHS.map((width) => {
                const isSelected = activeStrokeWidth === width
                return (
                  <button
                    key={width}
                    onClick={() => handleStyleChange({ strokeWidth: width })}
                    className={`flex-1 h-8 flex items-center justify-center rounded-lg transition border ${
                      isSelected 
                        ? 'bg-indigo-100/50 dark:bg-indigo-900/40 border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300' 
                        : 'bg-neutral-100 dark:bg-neutral-800 border-transparent hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-600 dark:text-neutral-300'
                    }`}
                  >
                    <div className="w-4 bg-currentColor rounded-full" style={{ height: width, backgroundColor: 'currentColor' }} />
                  </button>
                )
              })}
            </div>
          </div>

      {/* Stroke Style */}
      <div className="flex flex-col gap-2">
        <label className="text-xs font-medium text-neutral-600 dark:text-neutral-400">Stroke style</label>
        <div className="flex gap-2">
          {STROKE_STYLES.map((style) => {
            const isSelected = activeStrokeStyle === style
            return (
              <button
                key={style}
                onClick={() => handleStyleChange({ strokeStyle: style })}
                className={`flex-1 h-8 flex items-center justify-center rounded-lg transition border ${
                  isSelected 
                    ? 'bg-indigo-100/50 dark:bg-indigo-900/40 border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300' 
                    : 'bg-neutral-100 dark:bg-neutral-800 border-transparent hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-600 dark:text-neutral-300'
                }`}
              >
                {style === 'solid' && <div className="w-5 h-[2px] bg-currentColor" />}
                {style === 'dashed' && (
                  <div className="flex gap-1">
                    <div className="w-2 h-[2px] bg-currentColor" /><div className="w-2 h-[2px] bg-currentColor" />
                  </div>
                )}
                {style === 'dotted' && (
                  <div className="flex gap-[3px]">
                    <div className="w-[3px] h-[3px] rounded-full bg-currentColor" />
                    <div className="w-[3px] h-[3px] rounded-full bg-currentColor" />
                    <div className="w-[3px] h-[3px] rounded-full bg-currentColor" />
                  </div>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* Sloppiness */}
      <div className="flex flex-col gap-2">
        <label className="text-xs font-medium text-neutral-600 dark:text-neutral-400">Sloppiness</label>
        <div className="flex gap-2">
          {ROUGHNESSES.map((r, i) => {
            const isSelected = activeRoughness === r
            return (
              <button
                key={r}
                onClick={() => handleStyleChange({ roughness: r })}
                className={`flex-1 h-8 flex items-center justify-center rounded-lg transition border ${
                  isSelected 
                    ? 'bg-indigo-100/50 dark:bg-indigo-900/40 border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300' 
                    : 'bg-neutral-100 dark:bg-neutral-800 border-transparent hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-600 dark:text-neutral-300'
                }`}
              >
                {i === 0 && <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 12h16" /></svg>}
                {i === 1 && <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 12s4-4 8 0 8 0 8 0" /></svg>}
                {i === 2 && <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 12s3-6 8 0 8-3 8-3" /></svg>}
              </button>
            )
          })}
        </div>
      </div>

      {/* Edges */}
      <div className="flex flex-col gap-2">
        <label className="text-xs font-medium text-neutral-600 dark:text-neutral-400">Edges</label>
        <div className="flex gap-2">
          {ROUNDNESSES.map((round) => {
            const isSelected = activeRoundness === round
            return (
              <button
                key={round}
                onClick={() => handleStyleChange({ roundness: round })}
                className={`w-[60px] h-8 flex items-center justify-center rounded-lg transition border ${
                  isSelected 
                    ? 'bg-indigo-100/50 dark:bg-indigo-900/40 border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300' 
                    : 'bg-neutral-100 dark:bg-neutral-800 border-transparent hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-600 dark:text-neutral-300'
                }`}
              >
                {round === 'sharp' ? (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeDasharray="3 3"><rect x="3" y="3" width="18" height="18" /></svg>
                ) : (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeDasharray="3 3"><rect x="3" y="3" width="18" height="18" rx="5" /></svg>
                )}
              </button>
            )
          })}
        </div>
      </div>
      </>
      )}

      {/* Opacity */}
      <div className="flex flex-col gap-2">
        <label className="text-xs font-medium text-neutral-600 dark:text-neutral-400">Opacity</label>
        <div className="flex flex-col gap-1 relative">
          <input 
            type="range" 
            min="0" max="100" 
            value={activeOpacity}
            onChange={(e) => handleStyleChange({ opacity: parseInt(e.target.value) })}
            className="w-full accent-indigo-500"
          />
          <div className="flex justify-between text-[10px] text-neutral-400 font-mono mt-1">
            <span>0</span>
            <span>100</span>
          </div>
        </div>
      </div>

      {/* Layers & Actions (Only when element is selected) */}
      {isEditing && (
        <>
          <div className="flex flex-col gap-2">
            <label className="text-xs font-medium text-neutral-600 dark:text-neutral-400">Layers</label>
            <div className="flex gap-2">
              <button onClick={() => sendToBack(selectedId!)} className="flex-1 h-8 flex items-center justify-center rounded-lg bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 transition" title="Send to back">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 20v-8m0 8l-4-4m4 4l4-4M4 4h16" /></svg>
              </button>
              <button onClick={() => sendBackward(selectedId!)} className="flex-1 h-8 flex items-center justify-center rounded-lg bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 transition" title="Send backward">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 20v-8m0 8l-4-4m4 4l4-4" /></svg>
              </button>
              <button onClick={() => bringForward(selectedId!)} className="flex-1 h-8 flex items-center justify-center rounded-lg bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 transition" title="Bring forward">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 4v8m0-8l-4 4m4-4l4 4" /></svg>
              </button>
              <button onClick={() => bringToFront(selectedId!)} className="flex-1 h-8 flex items-center justify-center rounded-lg bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 transition" title="Bring to front">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 4v8m0-8l-4 4m4-4l4 4M4 20h16" /></svg>
              </button>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-xs font-medium text-neutral-600 dark:text-neutral-400">Actions</label>
            <div className="flex gap-2">
              <button onClick={handleDuplicate} className="w-9 h-8 flex items-center justify-center rounded-lg bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 transition" title="Duplicate">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
              </button>
              <button onClick={() => removeElement(selectedId!)} className="w-9 h-8 flex items-center justify-center rounded-lg bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 transition text-red-500 hover:text-red-600" title="Delete">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2M10 11v6M14 11v6" /></svg>
              </button>
            </div>
          </div>
        </>
      )}

      {/* Global CSS for the custom scrollbar */}
      <style dangerouslySetInnerHTML={{__html: `
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(150, 150, 150, 0.3);
          border-radius: 4px;
        }
        .custom-scrollbar:hover::-webkit-scrollbar-thumb {
          background: rgba(150, 150, 150, 0.5);
        }
      `}} />
    </div>
  )
}
