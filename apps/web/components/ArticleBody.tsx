import React from 'react';
const safe = (s: string) => /^(https?:\/\/|\/media\/|\/api\/v1\/media\/private\/)/i.test(s || '');
export default function ArticleBody({ body }: { body: any }) {
  const render = (node: any, key: number): React.ReactNode => {
    if (!node) return null;
    if (node.type === 'text') {
      let text: React.ReactNode = node.text;
      for (const mark of node.marks || []) {
        if (mark.type === 'bold') text = <strong>{text}</strong>;
        if (mark.type === 'italic') text = <em>{text}</em>;
        if (mark.type === 'strike') text = <s>{text}</s>;
        if (mark.type === 'underline') text = <u>{text}</u>;
        if (mark.type === 'code') text = <code>{text}</code>;
        if (mark.type === 'link' && safe(mark.attrs?.href))
          text = (
            <a href={mark.attrs.href} rel="noopener noreferrer">
              {text}
            </a>
          );
      }
      return <React.Fragment key={key}>{text}</React.Fragment>;
    }
    const children = (node.content || []).map(render);
    switch (node.type) {
      case 'heading':
        return node.attrs?.level === 3 ? (
          <h3 key={key}>{children}</h3>
        ) : (
          <h2 key={key}>{children}</h2>
        );
      case 'paragraph':
        return <p key={key}>{children}</p>;
      case 'bulletList':
        return <ul key={key}>{children}</ul>;
      case 'orderedList':
        return <ol key={key}>{children}</ol>;
      case 'listItem':
        return <li key={key}>{children}</li>;
      case 'blockquote':
        return <blockquote key={key}>{children}</blockquote>;
      case 'codeBlock':
        return (
          <pre key={key}>
            <code>{children}</code>
          </pre>
        );
      case 'hardBreak':
        return <br key={key} />;
      case 'horizontalRule':
        return <hr key={key} />;
      case 'image':
        return safe(node.attrs?.src) ? (
          <img key={key} src={node.attrs.src} alt={node.attrs.alt || ''} />
        ) : null;
      default:
        return <React.Fragment key={key}>{children}</React.Fragment>;
    }
  };
  return <div className="article-body">{render(body, 0)}</div>;
}
