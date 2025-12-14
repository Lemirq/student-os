"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import Placeholder from "@tiptap/extension-placeholder";
import CodeBlockLowlight from "@tiptap/extension-code-block-lowlight";
import { useEffect } from "react";
import { common, createLowlight } from "lowlight";
import {
  Bold,
  Italic,
  List,
  ListOrdered,
  Heading1,
  Heading2,
  Heading3,
  Code,
  Code2,
  Quote,
  CheckSquare,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface TipTapEditorProps {
  initialContent?: any;
  onChange: (json: any) => void;
}

interface ToolbarButtonProps {
  onClick: () => void;
  isActive?: boolean;
  children: React.ReactNode;
  disabled?: boolean;
}

function ToolbarButton({
  onClick,
  isActive,
  children,
  disabled,
}: ToolbarButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "p-2 rounded-md hover:bg-accent transition-colors disabled:opacity-50 disabled:cursor-not-allowed",
        isActive && "bg-accent text-foreground",
      )}
    >
      {children}
    </button>
  );
}

const lowlight = createLowlight(common);

export function TipTapEditor({ initialContent, onChange }: TipTapEditorProps) {
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
        codeBlock: false, // Disable default code block to use lowlight version
      }),
      CodeBlockLowlight.configure({
        lowlight,
      }),
      TaskList,
      TaskItem.configure({
        nested: true,
      }),
      Placeholder.configure({
        placeholder: "Jot down notes, subtasks, or ideas...",
      }),
    ],
    content: initialContent || "",
    editorProps: {
      attributes: {
        class: "focus:outline-none",
      },
    },
    onUpdate: ({ editor }) => {
      onChange(editor.getJSON());
    },
  });

  useEffect(() => {
    if (editor && initialContent && editor.isEmpty) {
      editor.commands.setContent(initialContent);
    }
  }, [editor, initialContent]);

  if (!editor) {
    return null;
  }

  return (
    <div className="tiptap-editor border border-border rounded-lg overflow-hidden bg-background">
      {/* Toolbar */}
      <div className="flex items-center gap-1 p-2 border-b border-border bg-muted/30">
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBold().run()}
          isActive={editor.isActive("bold")}
        >
          <Bold className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleItalic().run()}
          isActive={editor.isActive("italic")}
        >
          <Italic className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleCode().run()}
          isActive={editor.isActive("code")}
        >
          <Code className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleCodeBlock().run()}
          isActive={editor.isActive("codeBlock")}
        >
          <Code2 className="h-4 w-4" />
        </ToolbarButton>

        <div className="w-px h-6 bg-border mx-1" />

        <ToolbarButton
          onClick={() =>
            editor.chain().focus().toggleHeading({ level: 1 }).run()
          }
          isActive={editor.isActive("heading", { level: 1 })}
        >
          <Heading1 className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() =>
            editor.chain().focus().toggleHeading({ level: 2 }).run()
          }
          isActive={editor.isActive("heading", { level: 2 })}
        >
          <Heading2 className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() =>
            editor.chain().focus().toggleHeading({ level: 3 }).run()
          }
          isActive={editor.isActive("heading", { level: 3 })}
        >
          <Heading3 className="h-4 w-4" />
        </ToolbarButton>

        <div className="w-px h-6 bg-border mx-1" />

        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          isActive={editor.isActive("bulletList")}
        >
          <List className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          isActive={editor.isActive("orderedList")}
        >
          <ListOrdered className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleTaskList().run()}
          isActive={editor.isActive("taskList")}
        >
          <CheckSquare className="h-4 w-4" />
        </ToolbarButton>

        <div className="w-px h-6 bg-border mx-1" />

        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          isActive={editor.isActive("blockquote")}
        >
          <Quote className="h-4 w-4" />
        </ToolbarButton>
      </div>

      {/* Editor Content */}
      <div className="p-4">
        <EditorContent editor={editor} />
      </div>

      <style jsx global>{`
        .tiptap-editor {
          @apply w-full;
        }

        .tiptap-editor .ProseMirror {
          @apply min-h-[300px] focus:outline-none;
        }

        .tiptap-editor .ProseMirror p.is-editor-empty:first-child::before {
          @apply text-muted-foreground/50;
          content: attr(data-placeholder);
          float: left;
          height: 0;
          pointer-events: none;
        }

        .tiptap-editor .ProseMirror > * + * {
          @apply mt-3;
        }

        .tiptap-editor .ProseMirror p {
          @apply leading-relaxed;
        }

        .tiptap-editor .ProseMirror ul[data-type="taskList"] {
          @apply list-none pl-0;
        }

        .tiptap-editor .ProseMirror ul[data-type="taskList"] li {
          @apply flex items-start gap-2 mb-2;
        }

        .tiptap-editor .ProseMirror ul[data-type="taskList"] li > label {
          @apply flex-shrink-0 mt-0.5;
        }

        .tiptap-editor
          .ProseMirror
          ul[data-type="taskList"]
          li
          > label
          > input[type="checkbox"] {
          @apply w-4 h-4 rounded-sm border border-zinc-700 bg-transparent appearance-none cursor-pointer;
          @apply checked:bg-primary checked:border-primary;
          @apply focus:outline-none focus:ring-2 focus:ring-primary/20;
        }

        .tiptap-editor
          .ProseMirror
          ul[data-type="taskList"]
          li
          > label
          > input[type="checkbox"]:checked {
          background-image: url("data:image/svg+xml,%3csvg viewBox='0 0 16 16' fill='white' xmlns='http://www.w3.org/2000/svg'%3e%3cpath d='M12.207 4.793a1 1 0 010 1.414l-5 5a1 1 0 01-1.414 0l-2-2a1 1 0 011.414-1.414L6.5 9.086l4.293-4.293a1 1 0 011.414 0z'/%3e%3c/svg%3e");
          background-size: 100% 100%;
          background-position: center;
          background-repeat: no-repeat;
        }

        .tiptap-editor .ProseMirror ul[data-type="taskList"] li > div {
          @apply flex-1 min-w-0;
        }

        .tiptap-editor .ProseMirror ul[data-type="taskList"] li > div > p {
          @apply m-0;
        }

        .tiptap-editor
          .ProseMirror
          ul[data-type="taskList"]
          ul[data-type="taskList"] {
          @apply ml-6 mt-2;
        }

        .tiptap-editor .ProseMirror h1 {
          @apply text-2xl font-bold mt-8 mb-4 leading-tight;
        }

        .tiptap-editor .ProseMirror h1:first-child {
          @apply mt-0;
        }

        .tiptap-editor .ProseMirror h2 {
          @apply text-xl font-semibold mt-6 mb-3 leading-tight;
        }

        .tiptap-editor .ProseMirror h2:first-child {
          @apply mt-0;
        }

        .tiptap-editor .ProseMirror h3 {
          @apply text-lg font-medium mt-5 mb-2 leading-tight;
        }

        .tiptap-editor .ProseMirror h3:first-child {
          @apply mt-0;
        }

        .tiptap-editor .ProseMirror ul:not([data-type="taskList"]),
        .tiptap-editor .ProseMirror ol {
          @apply pl-6 my-2;
        }

        .tiptap-editor .ProseMirror ul:not([data-type="taskList"]) {
          @apply list-disc;
        }

        .tiptap-editor .ProseMirror ol {
          @apply list-decimal;
        }

        .tiptap-editor .ProseMirror code {
          @apply bg-muted px-2 py-0.5 rounded text-sm font-mono;
        }

        .tiptap-editor .ProseMirror pre {
          @apply bg-muted border border-border p-4 rounded-lg overflow-x-auto my-4;
        }

        .tiptap-editor .ProseMirror pre code {
          @apply bg-transparent p-0 text-sm;
          display: block;
        }

        .tiptap-editor .ProseMirror blockquote {
          @apply border-l-4 border-primary/40 pl-4 italic text-muted-foreground;
        }

        .tiptap-editor .ProseMirror strong {
          @apply font-semibold;
        }

        .tiptap-editor .ProseMirror em {
          @apply italic;
        }

        .tiptap-editor .ProseMirror hr {
          @apply border-t border-border my-6;
        }

        /* Syntax highlighting for code blocks */
        .tiptap-editor .ProseMirror pre .hljs-comment,
        .tiptap-editor .ProseMirror pre .hljs-quote {
          @apply text-muted-foreground;
        }

        .tiptap-editor .ProseMirror pre .hljs-variable,
        .tiptap-editor .ProseMirror pre .hljs-template-variable,
        .tiptap-editor .ProseMirror pre .hljs-tag,
        .tiptap-editor .ProseMirror pre .hljs-name,
        .tiptap-editor .ProseMirror pre .hljs-selector-id,
        .tiptap-editor .ProseMirror pre .hljs-selector-class,
        .tiptap-editor .ProseMirror pre .hljs-regexp,
        .tiptap-editor .ProseMirror pre .hljs-deletion {
          @apply text-red-400;
        }

        .tiptap-editor .ProseMirror pre .hljs-number,
        .tiptap-editor .ProseMirror pre .hljs-built_in,
        .tiptap-editor .ProseMirror pre .hljs-literal,
        .tiptap-editor .ProseMirror pre .hljs-type,
        .tiptap-editor .ProseMirror pre .hljs-params,
        .tiptap-editor .ProseMirror pre .hljs-meta,
        .tiptap-editor .ProseMirror pre .hljs-link {
          @apply text-orange-400;
        }

        .tiptap-editor .ProseMirror pre .hljs-attribute {
          @apply text-yellow-400;
        }

        .tiptap-editor .ProseMirror pre .hljs-string,
        .tiptap-editor .ProseMirror pre .hljs-symbol,
        .tiptap-editor .ProseMirror pre .hljs-bullet,
        .tiptap-editor .ProseMirror pre .hljs-addition {
          @apply text-green-400;
        }

        .tiptap-editor .ProseMirror pre .hljs-title,
        .tiptap-editor .ProseMirror pre .hljs-section {
          @apply text-blue-400;
        }

        .tiptap-editor .ProseMirror pre .hljs-keyword,
        .tiptap-editor .ProseMirror pre .hljs-selector-tag {
          @apply text-purple-400;
        }
      `}</style>
    </div>
  );
}
