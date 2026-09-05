import React, { useEffect, useRef } from 'react'
import { EditorState } from '@codemirror/state'
import { basicSetup } from 'codemirror'
import { EditorView } from '@codemirror/view'
import { python } from '@codemirror/lang-python'
import './CodeEditor.css'

export default function CodeEditor({
  value,
  onChange,
  language = 'python',
  availableFunctions = [],
  disabled = false,
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
      <div className="editor-header">
        <h3>Code Editor</h3>
        {availableFunctions.length > 0 && (
          <div className="available-functions">
            <span className="label">Available:</span>
            {availableFunctions.map((func) => (
              <span key={func} className="function-tag">
                {func}()
              </span>
            ))}
          </div>
        )}
      </div>
      <div ref={containerRef} className="code-editor" />
    </div>
  )
}
