import { useEditor, EditorContent, BubbleMenu, FloatingMenu } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import Underline from "@tiptap/extension-underline";
import Link from "@tiptap/extension-link";
import Image from "@tiptap/extension-image";
import Highlight from "@tiptap/extension-highlight";
import TextAlign from "@tiptap/extension-text-align";
import Typography from "@tiptap/extension-typography";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import { useEffect, useRef, useCallback } from "react";
import {
  Bold, Italic, Underline as UnderlineIcon, Strikethrough,
  Code, Link as LinkIcon, AlignLeft, AlignCenter, AlignRight,
  List, ListOrdered, CheckSquare, Quote, Minus, Heading1, Heading2, Heading3,
  Highlighter,
} from "lucide-react";
import clsx from "clsx";

const ToolbarBtn = ({ onClick, active, title, children }) => (
  <button
    type="button"
    onMouseDown={(e) => { e.preventDefault(); onClick(); }}
    title={title}
    className={clsx(
      "p-1.5 rounded transition-colors",
      active
        ? "bg-brand-600/30 text-brand-400"
        : "text-slate-400 hover:bg-surface-600 hover:text-white"
    )}
  >
    {children}
  </button>
);

export default function DocEditor({ content, onChange, onCursorChange, editable = true, placeholder = "Start writing..." }) {
  const saveTimer = useRef();

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ codeBlock: { HTMLAttributes: { class: "hljs" } } }),
      Placeholder.configure({ placeholder }),
      Underline,
      Link.configure({ openOnClick: false, HTMLAttributes: { class: "text-brand-400 underline" } }),
      Image.configure({ HTMLAttributes: { class: "rounded-xl max-w-full my-4" } }),
      Highlight.configure({ multicolor: true }),
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      Typography,
      TaskList,
      TaskItem.configure({ nested: true }),
    ],
    content: content || { type: "doc", content: [{ type: "paragraph" }] },
    editable,
    onUpdate: ({ editor }) => {
      clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => {
        onChange?.({
          json: editor.getJSON(),
          text: editor.getText(),
          html: editor.getHTML(),
        });
      }, 600);
    },
    onSelectionUpdate: ({ editor }) => {
      const { from, to } = editor.state.selection;
      onCursorChange?.({ from, to });
    },
  });

  useEffect(() => {
    if (editor && content && JSON.stringify(editor.getJSON()) !== JSON.stringify(content)) {
      editor.commands.setContent(content, false);
    }
  }, [content]);

  if (!editor) return null;

  const setLink = () => {
    const url = window.prompt("URL:", editor.getAttributes("link").href);
    if (url === null) return;
    if (url === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
    } else {
      editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
    }
  };

  return (
    <div className="flex flex-col h-full">
      {editable && (
        <div className="flex items-center gap-0.5 flex-wrap px-4 py-2 border-b border-surface-600 bg-surface-700/30">
          <ToolbarBtn onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} active={editor.isActive("heading", { level: 1 })} title="H1"><Heading1 size={15} /></ToolbarBtn>
          <ToolbarBtn onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} active={editor.isActive("heading", { level: 2 })} title="H2"><Heading2 size={15} /></ToolbarBtn>
          <ToolbarBtn onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} active={editor.isActive("heading", { level: 3 })} title="H3"><Heading3 size={15} /></ToolbarBtn>
          <span className="w-px h-5 bg-surface-500 mx-1" />
          <ToolbarBtn onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive("bold")} title="Bold"><Bold size={15} /></ToolbarBtn>
          <ToolbarBtn onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive("italic")} title="Italic"><Italic size={15} /></ToolbarBtn>
          <ToolbarBtn onClick={() => editor.chain().focus().toggleUnderline().run()} active={editor.isActive("underline")} title="Underline"><UnderlineIcon size={15} /></ToolbarBtn>
          <ToolbarBtn onClick={() => editor.chain().focus().toggleStrike().run()} active={editor.isActive("strike")} title="Strikethrough"><Strikethrough size={15} /></ToolbarBtn>
          <ToolbarBtn onClick={() => editor.chain().focus().toggleHighlight().run()} active={editor.isActive("highlight")} title="Highlight"><Highlighter size={15} /></ToolbarBtn>
          <span className="w-px h-5 bg-surface-500 mx-1" />
          <ToolbarBtn onClick={() => editor.chain().focus().toggleCode().run()} active={editor.isActive("code")} title="Inline code"><Code size={15} /></ToolbarBtn>
          <ToolbarBtn onClick={setLink} active={editor.isActive("link")} title="Link"><LinkIcon size={15} /></ToolbarBtn>
          <span className="w-px h-5 bg-surface-500 mx-1" />
          <ToolbarBtn onClick={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive("bulletList")} title="Bullet list"><List size={15} /></ToolbarBtn>
          <ToolbarBtn onClick={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive("orderedList")} title="Ordered list"><ListOrdered size={15} /></ToolbarBtn>
          <ToolbarBtn onClick={() => editor.chain().focus().toggleTaskList().run()} active={editor.isActive("taskList")} title="Checklist"><CheckSquare size={15} /></ToolbarBtn>
          <ToolbarBtn onClick={() => editor.chain().focus().toggleBlockquote().run()} active={editor.isActive("blockquote")} title="Quote"><Quote size={15} /></ToolbarBtn>
          <ToolbarBtn onClick={() => editor.chain().focus().toggleCodeBlock().run()} active={editor.isActive("codeBlock")} title="Code block"><Code size={15} /></ToolbarBtn>
          <span className="w-px h-5 bg-surface-500 mx-1" />
          <ToolbarBtn onClick={() => editor.chain().focus().setTextAlign("left").run()} active={editor.isActive({ textAlign: "left" })} title="Left"><AlignLeft size={15} /></ToolbarBtn>
          <ToolbarBtn onClick={() => editor.chain().focus().setTextAlign("center").run()} active={editor.isActive({ textAlign: "center" })} title="Center"><AlignCenter size={15} /></ToolbarBtn>
          <ToolbarBtn onClick={() => editor.chain().focus().setTextAlign("right").run()} active={editor.isActive({ textAlign: "right" })} title="Right"><AlignRight size={15} /></ToolbarBtn>
          <span className="w-px h-5 bg-surface-500 mx-1" />
          <ToolbarBtn onClick={() => editor.chain().focus().setHorizontalRule().run()} title="Divider"><Minus size={15} /></ToolbarBtn>
        </div>
      )}

      {}
      {editable && (
        <BubbleMenu editor={editor} tippyOptions={{ duration: 100 }}>
          <div className="flex items-center gap-0.5 bg-surface-700 border border-surface-500 rounded-lg p-1 shadow-xl">
            <ToolbarBtn onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive("bold")} title="Bold"><Bold size={13} /></ToolbarBtn>
            <ToolbarBtn onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive("italic")} title="Italic"><Italic size={13} /></ToolbarBtn>
            <ToolbarBtn onClick={() => editor.chain().focus().toggleUnderline().run()} active={editor.isActive("underline")} title="Underline"><UnderlineIcon size={13} /></ToolbarBtn>
            <ToolbarBtn onClick={() => editor.chain().focus().toggleHighlight().run()} active={editor.isActive("highlight")} title="Highlight"><Highlighter size={13} /></ToolbarBtn>
            <ToolbarBtn onClick={setLink} active={editor.isActive("link")} title="Link"><LinkIcon size={13} /></ToolbarBtn>
          </div>
        </BubbleMenu>
      )}

      <EditorContent
        editor={editor}
        className="flex-1 overflow-y-auto px-8 py-6 prose prose-invert max-w-none"
      />
    </div>
  );
}
