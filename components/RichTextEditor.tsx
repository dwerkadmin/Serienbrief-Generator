"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import TextAlign from "@tiptap/extension-text-align";
import { LineHeight, LINE_HEIGHTS } from "@/lib/tiptap/lineHeight";
import { useEffect } from "react";

type Props = {
  value: string;
  onChange: (html: string) => void;
  minHeight?: string;
  /** Merge-Felder, die per Klick an der Cursorposition eingefügt werden können */
  mergeFields?: { token: string; label: string }[];
};

export default function RichTextEditor({ value, onChange, minHeight = "220px", mergeFields }: Props) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      LineHeight.configure({ types: ["heading", "paragraph"] }),
    ],
    content: value,
    immediatelyRender: false,
    editorProps: {
      attributes: { class: "letter-editor" },
    },
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
  });

  useEffect(() => {
    if (editor && value !== editor.getHTML()) {
      editor.commands.setContent(value, { emitUpdate: false });
    }
  }, [value, editor]);

  if (!editor) return null;

  // Zeilenabstand des Absatzes bzw. der Überschrift am Cursor, "" = Standard.
  const aktuellerZeilenabstand: string =
    (editor.getAttributes("paragraph").lineHeight as string | null) ??
    (editor.getAttributes("heading").lineHeight as string | null) ??
    "";

  const btnClass = (active: boolean) =>
    `rounded border px-2 py-1 text-sm ${
      active ? "border-sky-600 bg-sky-600 text-white" : "border-slate-300 bg-white hover:bg-slate-100"
    }`;

  return (
    <div className="overflow-hidden rounded-lg border border-slate-300">
      <div className="flex flex-wrap items-center gap-1 border-b border-slate-200 bg-slate-50 p-2">
        <button type="button" className={btnClass(editor.isActive("bold"))} onClick={() => editor.chain().focus().toggleBold().run()} title="Fett">
          <strong>F</strong>
        </button>
        <button type="button" className={btnClass(editor.isActive("italic"))} onClick={() => editor.chain().focus().toggleItalic().run()} title="Kursiv">
          <em>K</em>
        </button>
        <button type="button" className={btnClass(editor.isActive("underline"))} onClick={() => editor.chain().focus().toggleUnderline().run()} title="Unterstrichen">
          <u>U</u>
        </button>
        <span className="mx-1 h-5 w-px bg-slate-300" />
        <button type="button" className={btnClass(editor.isActive({ textAlign: "left" }))} onClick={() => editor.chain().focus().setTextAlign("left").run()} title="Linksbündig">
          ⯇
        </button>
        <button type="button" className={btnClass(editor.isActive({ textAlign: "center" }))} onClick={() => editor.chain().focus().setTextAlign("center").run()} title="Zentriert">
          ▤
        </button>
        <button type="button" className={btnClass(editor.isActive({ textAlign: "right" }))} onClick={() => editor.chain().focus().setTextAlign("right").run()} title="Rechtsbündig">
          ⯈
        </button>
        <span className="mx-1 h-5 w-px bg-slate-300" />
        <button type="button" className={btnClass(editor.isActive("heading", { level: 2 }))} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} title="Überschrift groß">
          H2
        </button>
        <button type="button" className={btnClass(editor.isActive("heading", { level: 3 }))} onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} title="Überschrift klein">
          H3
        </button>
        <button type="button" className={btnClass(editor.isActive("bulletList"))} onClick={() => editor.chain().focus().toggleBulletList().run()} title="Aufzählung">
          •
        </button>
        <span className="mx-1 h-5 w-px bg-slate-300" />
        <label className="flex items-center gap-1 text-xs text-slate-500" title="Zeilenabstand für die markierten Absätze">
          <span aria-hidden>↕</span>
          <select
            value={aktuellerZeilenabstand}
            onChange={(e) => {
              const wert = e.target.value;
              const kette = editor.chain().focus();
              if (wert === "") kette.unsetLineHeight().run();
              else kette.setLineHeight(wert).run();
            }}
            className="rounded border border-slate-300 bg-white px-1.5 py-1 text-xs"
          >
            {LINE_HEIGHTS.map((h) => (
              <option key={h.value} value={h.value}>
                {h.label}
              </option>
            ))}
          </select>
        </label>

        {mergeFields && mergeFields.length > 0 && (
          <>
            <span className="mx-1 h-5 w-px bg-slate-300" />
            <span className="text-xs text-slate-500">Platzhalter:</span>
            {mergeFields.map((f) => (
              <button
                key={f.token}
                type="button"
                className="rounded border border-dashed border-slate-400 bg-white px-2 py-1 text-xs text-slate-700 hover:bg-slate-100"
                onClick={() => editor.chain().focus().insertContent(f.token).run()}
              >
                {f.label}
              </button>
            ))}
          </>
        )}
      </div>
      <EditorContent editor={editor} style={{ minHeight }} className="px-4 py-3" />
    </div>
  );
}
