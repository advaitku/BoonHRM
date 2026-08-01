"use client";

import * as React from "react";
import { EditorContent, useEditor, useEditorState } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import {
  Bold,
  Heading2,
  Heading3,
  Italic,
  Link2,
  Link2Off,
  List,
  ListOrdered,
  Quote,
  Redo2,
  Strikethrough,
  Undo2,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Toggle } from "@/components/ui/toggle";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

export interface RichTextEditorProps {
  id?: string;
  /** Renders a hidden input so the value is picked up by `new FormData(form)`. */
  name?: string;
  /** Controlled HTML. Omit for uncontrolled use with `defaultValue`. */
  value?: string;
  defaultValue?: string;
  onChange?: (html: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

/**
 * WYSIWYG editor for job descriptions. Follows the DatePicker pattern: renders a
 * hidden input under `name`, so the surrounding uncontrolled form picks the value
 * up via `new FormData(e.currentTarget)` with no explicit `formData.set` call.
 *
 * Output is sanitized again server-side (lib/rich-text.ts) — the toolbar is
 * configured to only produce tags on that allowlist.
 */
export function RichTextEditor({
  id,
  name,
  value,
  defaultValue,
  onChange,
  placeholder = "Write a description…",
  disabled,
  className,
}: RichTextEditorProps) {
  // Seeded from defaultValue so submitting an untouched edit form keeps the
  // existing content (onUpdate never fires if the user doesn't type).
  const [internal, setInternal] = React.useState(defaultValue ?? "");
  const [linkOpen, setLinkOpen] = React.useState(false);
  const [linkDraft, setLinkDraft] = React.useState("");

  const controlled = value !== undefined;
  const current = controlled ? value : internal;

  const editor = useEditor({
    // Mandatory under the App Router — Tiptap v3 throws on SSR without it.
    immediatelyRender: false,
    editable: !disabled,
    extensions: [
      StarterKit.configure({
        // Never h1 — the surrounding page owns the document's single h1.
        heading: { levels: [2, 3, 4] },
        link: {
          openOnClick: false,
          autolink: true,
          protocols: ["http", "https", "mailto"],
        },
        // Keep the producible set equal to the sanitizer's allowlist, so the
        // sanitizer never silently eats something the user typed.
        codeBlock: false,
        horizontalRule: false,
      }),
    ],
    content: defaultValue ?? "",
    editorProps: {
      attributes: {
        class: cn(
          "min-h-[200px] w-full px-3 py-2 text-sm focus:outline-none",
          "prose prose-sm max-w-none dark:prose-invert",
          "prose-headings:font-heading prose-headings:tracking-tight",
        ),
        ...(placeholder ? { "data-placeholder": placeholder } : {}),
      },
    },
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      if (!controlled) setInternal(html);
      onChange?.(html);
    },
  });

  // v3's useEditor does NOT re-render per transaction — reading editor.isActive()
  // directly in the render body would leave every toggle permanently stale.
  const state = useEditorState({
    editor,
    selector: ({ editor }) => ({
      bold: editor?.isActive("bold") ?? false,
      italic: editor?.isActive("italic") ?? false,
      strike: editor?.isActive("strike") ?? false,
      h2: editor?.isActive("heading", { level: 2 }) ?? false,
      h3: editor?.isActive("heading", { level: 3 }) ?? false,
      bulletList: editor?.isActive("bulletList") ?? false,
      orderedList: editor?.isActive("orderedList") ?? false,
      blockquote: editor?.isActive("blockquote") ?? false,
      link: editor?.isActive("link") ?? false,
      canUndo: editor?.can().undo() ?? false,
      canRedo: editor?.can().redo() ?? false,
    }),
  });

  React.useEffect(() => {
    if (!editor || !controlled) return;
    if (value !== editor.getHTML()) editor.commands.setContent(value ?? "", { emitUpdate: false });
  }, [editor, controlled, value]);

  function openLinkPopover() {
    setLinkDraft(editor?.getAttributes("link").href ?? "");
    setLinkOpen(true);
  }

  function applyLink() {
    if (!editor) return;
    const href = linkDraft.trim();
    if (!href) {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
    } else {
      const normalized = /^(https?:|mailto:)/i.test(href) ? href : `https://${href}`;
      editor.chain().focus().extendMarkRange("link").setLink({ href: normalized }).run();
    }
    setLinkOpen(false);
  }

  return (
    <>
      {name ? <input type="hidden" name={name} value={current} /> : null}
      <div
        id={id}
        data-disabled={disabled || undefined}
        className={cn(
          "rounded-lg border border-input bg-transparent shadow-xs transition-colors",
          "focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50",
          "data-disabled:pointer-events-none data-disabled:opacity-50",
          className,
        )}
      >
        <div className="flex flex-wrap items-center gap-0.5 border-b p-1">
          <Toggle
            size="sm"
            pressed={state?.bold}
            onPressedChange={() => editor?.chain().focus().toggleBold().run()}
            aria-label="Bold"
          >
            <Bold />
          </Toggle>
          <Toggle
            size="sm"
            pressed={state?.italic}
            onPressedChange={() => editor?.chain().focus().toggleItalic().run()}
            aria-label="Italic"
          >
            <Italic />
          </Toggle>
          <Toggle
            size="sm"
            pressed={state?.strike}
            onPressedChange={() => editor?.chain().focus().toggleStrike().run()}
            aria-label="Strikethrough"
          >
            <Strikethrough />
          </Toggle>

          <Separator orientation="vertical" className="mx-1 !h-5" />

          <Toggle
            size="sm"
            pressed={state?.h2}
            onPressedChange={() =>
              editor?.chain().focus().toggleHeading({ level: 2 }).run()
            }
            aria-label="Heading 2"
          >
            <Heading2 />
          </Toggle>
          <Toggle
            size="sm"
            pressed={state?.h3}
            onPressedChange={() =>
              editor?.chain().focus().toggleHeading({ level: 3 }).run()
            }
            aria-label="Heading 3"
          >
            <Heading3 />
          </Toggle>

          <Separator orientation="vertical" className="mx-1 !h-5" />

          <Toggle
            size="sm"
            pressed={state?.bulletList}
            onPressedChange={() => editor?.chain().focus().toggleBulletList().run()}
            aria-label="Bullet list"
          >
            <List />
          </Toggle>
          <Toggle
            size="sm"
            pressed={state?.orderedList}
            onPressedChange={() => editor?.chain().focus().toggleOrderedList().run()}
            aria-label="Numbered list"
          >
            <ListOrdered />
          </Toggle>
          <Toggle
            size="sm"
            pressed={state?.blockquote}
            onPressedChange={() => editor?.chain().focus().toggleBlockquote().run()}
            aria-label="Quote"
          >
            <Quote />
          </Toggle>

          <Separator orientation="vertical" className="mx-1 !h-5" />

          {/* Popover rather than window.prompt() — prompt is blocked in
              sandboxed iframes and looks nothing like the rest of the UI. */}
          <Popover open={linkOpen} onOpenChange={setLinkOpen}>
            <PopoverTrigger asChild>
              <Toggle
                size="sm"
                pressed={state?.link}
                onPressedChange={openLinkPopover}
                aria-label="Add link"
              >
                <Link2 />
              </Toggle>
            </PopoverTrigger>
            <PopoverContent align="start" className="w-72 p-2">
              <div className="flex items-center gap-1.5">
                <Input
                  autoFocus
                  value={linkDraft}
                  onChange={(e) => setLinkDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      applyLink();
                    }
                  }}
                  placeholder="https://example.com"
                  className="h-8"
                />
                <Button type="button" size="sm" onClick={applyLink}>
                  Apply
                </Button>
              </div>
              <p className="mt-1.5 text-xs text-muted-foreground">
                Leave empty to remove the link.
              </p>
            </PopoverContent>
          </Popover>

          {state?.link && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-7"
              onClick={() =>
                editor?.chain().focus().extendMarkRange("link").unsetLink().run()
              }
              aria-label="Remove link"
            >
              <Link2Off className="size-4" />
            </Button>
          )}

          <div className="ml-auto flex items-center gap-0.5">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-7"
              disabled={!state?.canUndo}
              onClick={() => editor?.chain().focus().undo().run()}
              aria-label="Undo"
            >
              <Undo2 className="size-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-7"
              disabled={!state?.canRedo}
              onClick={() => editor?.chain().focus().redo().run()}
              aria-label="Redo"
            >
              <Redo2 className="size-4" />
            </Button>
          </div>
        </div>

        <EditorContent editor={editor} />
      </div>
    </>
  );
}
