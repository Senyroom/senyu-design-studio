import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import { Button, Space } from '@arco-design/web-react';
import { useEffect } from 'react';
// Render private originals in the editor while keeping portable /media/ references in JSON.
const LocalImage = Image.extend({
  addNodeView() {
    return ({ node }) => {
      const dom = document.createElement('img');
      const apply = (value: typeof node) => {
        const src = value.attrs.src || '';
        dom.src = src.startsWith('/media/') ? `/api/v1/media/private/${src.slice(7)}` : src;
        dom.alt = value.attrs.alt || '';
      };
      apply(node);
      return {
        dom,
        update(value) {
          if (value.type.name !== 'image') return false;
          apply(value);
          return true;
        },
      };
    };
  },
});
export default function Editor({
  value,
  onChange,
  onImage,
}: {
  value: any;
  onChange: (v: any) => void;
  onImage: (insert: (src: string) => void) => void;
}) {
  const editor = useEditor({
    extensions: [StarterKit, LocalImage.configure({ allowBase64: false })],
    content: value || { type: 'doc', content: [{ type: 'paragraph' }] },
    onUpdate: ({ editor }) => onChange(editor.getJSON()),
    editorProps: {
      attributes: {
        class: 'rich-editor',
        role: 'textbox',
        'aria-label': '文章正文编辑器',
        'aria-multiline': 'true',
      },
    },
  });
  useEffect(() => {
    if (editor && JSON.stringify(value) !== JSON.stringify(editor.getJSON()))
      editor.commands.setContent(value || { type: 'doc', content: [{ type: 'paragraph' }] }, {
        emitUpdate: false,
      });
  }, [value, editor]);
  if (!editor) return null;
  return (
    <div className="editor-shell">
      <Space wrap className="editor-toolbar">
        <Button
          size="small"
          type={editor.isActive('bold') ? 'primary' : 'secondary'}
          onClick={() => editor.chain().focus().toggleBold().run()}
        >
          加粗
        </Button>
        <Button
          size="small"
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        >
          标题
        </Button>
        <Button size="small" onClick={() => editor.chain().focus().toggleBulletList().run()}>
          列表
        </Button>
        <Button size="small" onClick={() => editor.chain().focus().toggleBlockquote().run()}>
          引用
        </Button>
        <Button
          size="small"
          onClick={() => onImage((src) => editor.chain().focus().setImage({ src }).run())}
        >
          插入图片
        </Button>
        <Button size="small" onClick={() => editor.chain().focus().undo().run()}>
          撤销
        </Button>
      </Space>
      <EditorContent editor={editor} />
    </div>
  );
}
