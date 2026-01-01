"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import Placeholder from "@tiptap/extension-placeholder";
import CodeBlockLowlight from "@tiptap/extension-code-block-lowlight";
import { useRef } from "react";
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
  initialContent?: unknown;
  onChange: (json: unknown) => void;
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
        "p-1 rounded-md hover:bg-accent transition-colors disabled:opacity-50 disabled:cursor-not-allowed",
        isActive && "bg-accent text-foreground",
      )}
    >
      {children}
    </button>
  );
}

const lowlight = createLowlight(common);

export function TipTapEditor({ initialContent, onChange }: TipTapEditorProps) {
  // Store initial content in a ref to avoid re-setting on every render
  const initialContentRef = useRef(initialContent);

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
    content: initialContentRef.current || "",
    editorProps: {
      attributes: {
        class:
          "prose prose-sm dark:prose-invert max-w-none min-h-[300px] focus:outline-none",
      },
    },
    onUpdate: ({ editor }) => {
      onChange(editor.getJSON());
    },
  });

  if (!editor) {
    return null;
  }

  return (
    <div className="w-full border border-border rounded-lg overflow-hidden bg-background">
      {/* Toolbar */}
      <div className="flex items-center gap-1 p-1 border-b border-border w-full overflow-x-scroll bg-muted/30">
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
        /* Placeholder styling */
        .ProseMirror p.is-editor-empty:first-child::before {
          content: attr(data-placeholder);
          float: left;
          color: var(--muted-foreground);
          opacity: 0.5;
          pointer-events: none;
          height: 0;
        }

        /* Task list styling - prose doesn't handle these well */
        .ProseMirror ul[data-type="taskList"] {
          list-style: none;
          padding-left: 0;
          margin-left: 0;
        }

        .ProseMirror ul[data-type="taskList"] li {
          display: flex;
          align-items: flex-start;
          gap: 0.5rem;
          margin-bottom: 0.5rem;
        }

        .ProseMirror ul[data-type="taskList"] li > label {
          flex-shrink: 0;
          margin-top: 0.125rem;
        }

        .ProseMirror
          ul[data-type="taskList"]
          li
          > label
          > input[type="checkbox"] {
          width: 1rem;
          height: 1rem;
          border-radius: 0.125rem;
          border: 1px solid hsl(var(--border));
          background: transparent;
          appearance: none;
          cursor: pointer;
        }

        .ProseMirror
          ul[data-type="taskList"]
          li
          > label
          > input[type="checkbox"]:checked {
          background-color: hsl(var(--primary));
          border-color: hsl(var(--primary));
          background-image: url("data:image/svg+xml,%3csvg viewBox='0 0 16 16' fill='white' xmlns='http://www.w3.org/2000/svg'%3e%3cpath d='M12.207 4.793a1 1 0 010 1.414l-5 5a1 1 0 01-1.414 0l-2-2a1 1 0 011.414-1.414L6.5 9.086l4.293-4.293a1 1 0 011.414 0z'/%3e%3c/svg%3e");
          background-size: 100% 100%;
          background-position: center;
          background-repeat: no-repeat;
        }

        .ProseMirror
          ul[data-type="taskList"]
          li
          > label
          > input[type="checkbox"]:focus {
          outline: none;
          box-shadow: 0 0 0 2px hsl(var(--primary) / 0.2);
        }

        .ProseMirror ul[data-type="taskList"] li > div {
          flex: 1;
          min-width: 0;
        }

        .ProseMirror ul[data-type="taskList"] li > div > p {
          margin: 0;
        }

        .ProseMirror ul[data-type="taskList"] ul[data-type="taskList"] {
          margin-left: 1.5rem;
          margin-top: 0.5rem;
        }

        /* Syntax highlighting for code blocks */
        .ProseMirror pre .hljs-comment,
        .ProseMirror pre .hljs-quote {
          color: hsl(var(--muted-foreground));
        }

        .ProseMirror pre .hljs-variable,
        .ProseMirror pre .hljs-template-variable,
        .ProseMirror pre .hljs-tag,
        .ProseMirror pre .hljs-name,
        .ProseMirror pre .hljs-selector-id,
        .ProseMirror pre .hljs-selector-class,
        .ProseMirror pre .hljs-regexp,
        .ProseMirror pre .hljs-deletion {
          color: #f87171;
        }

        .ProseMirror pre .hljs-number,
        .ProseMirror pre .hljs-built_in,
        .ProseMirror pre .hljs-literal,
        .ProseMirror pre .hljs-type,
        .ProseMirror pre .hljs-params,
        .ProseMirror pre .hljs-meta,
        .ProseMirror pre .hljs-link {
          color: #fb923c;
        }

        .ProseMirror pre .hljs-attribute {
          color: #facc15;
        }

        .ProseMirror pre .hljs-string,
        .ProseMirror pre .hljs-symbol,
        .ProseMirror pre .hljs-bullet,
        .ProseMirror pre .hljs-addition {
          color: #4ade80;
        }

        .ProseMirror pre .hljs-title,
        .ProseMirror pre .hljs-section {
          color: #60a5fa;
        }

        .ProseMirror pre .hljs-keyword,
        .ProseMirror pre .hljs-selector-tag {
          color: #c084fc;
        }
      `}</style>
    </div>
  );
}
