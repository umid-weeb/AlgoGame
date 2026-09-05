import React, { useEffect, useRef } from 'react'
import { EditorState, Prec } from '@codemirror/state'
import { basicSetup } from 'codemirror'
import { EditorView, keymap } from '@codemirror/view'
import { python } from '@codemirror/lang-python'
import { acceptCompletion, autocompletion } from '@codemirror/autocomplete'
import './CodeEditor.css'

const GAME_COMPLETIONS = [
  ['move', 'move(EAST)', 'Move one tile: NORTH, SOUTH, EAST, or WEST.'],
  ['takeoff', 'takeoff()', 'Lift the drone above its current tile.'],
  ['land', 'land()', 'Land the drone on its current tile.'],
  ['turn_left', 'turn_left()', 'Turn the drone 90° left.'],
  ['turn_right', 'turn_right()', 'Turn the drone 90° right.'],
  ['hover', 'hover()', 'Stay in place for one step.'],
  ['harvest', 'harvest()', 'Harvest wheat on the current tile.'],
  ['cut', 'cut()', 'Cut a tree or bush on the current tile.'],
  ['shoot', 'shoot()', 'Shoot a bomb in the facing direction.'],
  ['plant', "plant('wheat')", 'Plant an entity on grass.'],
].map(([label, apply, detail]) => ({ label, apply, type: 'function', detail }))

const PYTHON_COMPLETIONS = [
  ['while', 'while condition:\n    '], ['for', 'for item in iterable:\n    '],
  ['if', 'if condition:\n    '], ['elif', 'elif condition:\n    '], ['else', 'else:\n    '],
  ['def', 'def function_name(matrix):\n    '], ['return', 'return '], ['in', 'in '],
  ['range', 'range()'], ['len', 'len()'], ['print', 'print()'],
  ['matrix', 'matrix'], ['NORTH', 'NORTH'], ['SOUTH', 'SOUTH'], ['EAST', 'EAST'], ['WEST', 'WEST'],
].map(([label, apply]) => ({ label, apply, type: 'keyword' }))

function pythonAndGameCompletions(context) {
  const word = context.matchBefore(/[A-Za-z_]\w*/)
  if (!word || (word.from === word.to && !context.explicit)) return null
  return {
    from: word.from,
    options: [...GAME_COMPLETIONS, ...PYTHON_COMPLETIONS],
    validFor: /^[A-Za-z_]\w*$/,
  }
}

const pythonTabKey = keymap.of([{
  key: 'Tab',
  run(view) {
    if (acceptCompletion(view)) return true
    const head = view.state.selection.main.head
    view.dispatch({ changes: { from: head, insert: '    ' } })
    return true
  },
}])

export default function CodeEditor({
  value,
  onChange,
  disabled = false,
  toolbar,
}) {
  const containerRef = useRef(null)
  const viewRef = useRef(null)

  useEffect(() => {
    if (!containerRef.current) return

    const state = EditorState.create({
      doc: value,
      extensions: [
        basicSetup,
        python(),
        autocompletion({ override: [pythonAndGameCompletions] }),
        Prec.highest(pythonTabKey),
        EditorView.updateListener.of((update) => {
          if (update.docChanged) {
            onChange(update.state.doc.toString())
          }
        }),
        EditorView.editable.of(!disabled),
      ],
    })

    const view = new EditorView({
      state,
      parent: containerRef.current,
    })

    viewRef.current = view

    return () => view.destroy()
  }, [disabled])

  // Update editor content from outside
  useEffect(() => {
    if (viewRef.current && value !== viewRef.current.state.doc.toString()) {
      viewRef.current.dispatch({
        changes: {
          from: 0,
          to: viewRef.current.state.doc.length,
          insert: value,
        },
      })
    }
  }, [value])

  return (
    <div className="code-editor-container">
      <div className="editor-controls">{toolbar}</div>
      <div ref={containerRef} className="code-editor" />
    </div>
  )
}
