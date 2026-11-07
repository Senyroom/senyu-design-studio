import { Button, Input, Tag } from '@arco-design/web-react';
import { IconPlus, IconDelete, IconArrowUp, IconArrowDown } from '@arco-design/web-react/icon';

export default function IdentityTags({
  value,
  onChange,
}: {
  value: string[];
  onChange: (value: string[]) => void;
}) {
  const move = (index: number, offset: number) => {
    const next = [...value];
    [next[index], next[index + offset]] = [next[index + offset], next[index]];
    onChange(next);
  };
  return (
    <div className="identity-editor">
      <div className="identity-editor-heading">
        <div>
          <strong>写下你的不同身份</strong>
          <p>直接填写任意身份。保存并发布后，同步到首页掉落标签；顺序与此处一致。</p>
        </div>
        <span>{value.length} / 30</span>
      </div>
      <div className="identity-editor-list">
        {value.map((text, index) => (
          <div className="identity-editor-row" key={index}>
            <span className="identity-index">{String(index + 1).padStart(2, '0')}</span>
            <Input
              aria-label={`身份标签 ${index + 1}`}
              placeholder="例如：独立设计师、AI 探索者"
              value={text}
              maxLength={50}
              showWordLimit
              onChange={(text) => onChange(value.map((old, i) => (i === index ? text : old)))}
            />
            <Button
              aria-label={`上移标签 ${index + 1}`}
              icon={<IconArrowUp />}
              disabled={index === 0}
              onClick={() => move(index, -1)}
            />
            <Button
              aria-label={`下移标签 ${index + 1}`}
              icon={<IconArrowDown />}
              disabled={index === value.length - 1}
              onClick={() => move(index, 1)}
            />
            <Button
              aria-label={`删除标签 ${index + 1}`}
              icon={<IconDelete />}
              onClick={() => onChange(value.filter((_, i) => i !== index))}
            />
          </div>
        ))}
      </div>
      <Button
        type="outline"
        icon={<IconPlus />}
        disabled={value.length >= 30}
        onClick={() => onChange([...value, ''])}
      >
        添加身份标签
      </Button>
      <div className="identity-preview">
        {value
          .filter((v) => v.trim())
          .map((text, i) => (
            <Tag key={i} color={i < 4 ? 'arcoblue' : undefined}>
              {text}
            </Tag>
          ))}
      </div>
    </div>
  );
}
